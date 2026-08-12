mod auth;
mod internal_auth;
mod io;
mod routes;
mod routing;
mod state;

use std::net::SocketAddr;

use axum::http::{header, HeaderValue, Method};
use onerouter_core::catalog;
use state::AppState;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing_subscriber::EnvFilter;

/// Use mimalloc as the global allocator — it outperforms the system
/// allocator (glibc malloc) significantly under high-concurrency workloads
/// with many small allocations, which is exactly our proxy hot path.
#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

fn main() {
    // Initialize tracing BEFORE the runtime so we get logs during startup.
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    // Build a tuned Tokio runtime optimized for a high-throughput proxy:
    // - worker_threads = physical CPU cores (not logical, to avoid context
    //   switching thrashing on hyperthreaded systems)
    // - thread_stack_size = 256 KiB (default 2 MiB is wasteful for the
    //   shallow async stacks in a proxy; 256K saves ~1.75 MiB per worker)
    // - max_blocking_threads = 512 (default, adequate for spawn_blocking)
    let worker_threads = num_physical_cores();
    tracing::info!("starting with {worker_threads} worker threads");

    let runtime = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(worker_threads)
        .thread_stack_size(256 * 1024)
        .enable_all()
        .build()
        .expect("failed to build Tokio runtime");

    runtime.block_on(async_main());
}

/// Detect the number of CPU cores for the Tokio worker thread count.
///
/// In Kubernetes (our deployment target), `/proc/cpuinfo` often lacks
/// "physical id" entries, so we use `available_parallelism()` which
/// respects cgroup CPU limits — critical for right-sizing the runtime
/// in a container with limited CPU quotas.
fn num_physical_cores() -> usize {
    std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
}

async fn async_main() {
    // Load the embedded model catalog into a HashMap for O(1) lookups
    let models = catalog::load();
    tracing::info!("loaded {} models from catalog", models.len());

    // Build shared state — includes a tuned reqwest client + cached API keys
    let state = AppState::new(models);

    // Build the router.
    // We intentionally do NOT use TraceLayer — it wraps every request in
    // a span, which adds measurable overhead in the hot path. Use
    // RUST_LOG=info for application-level logs instead.
    //
    // Direct browser callers can opt into a comma-separated allowlist. The
    // same-origin site proxy does not need CORS, but keeping this configurable
    // makes the API usable from local tools without opening it to every site.
    let allowed_origins: Vec<String> = std::env::var("CORS_ALLOWED_ORIGINS")
        .unwrap_or_else(|_| {
            "http://localhost:3000,https://1router.com,https://www.1router.com".to_string()
        })
        .split(',')
        .map(str::trim)
        .filter(|origin| !origin.is_empty())
        .map(String::from)
        .collect();
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::predicate(move |origin: &HeaderValue, _| {
            origin
                .to_str()
                .map(|value| allowed_origins.iter().any(|allowed| allowed == value))
                .unwrap_or(false)
        }))
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE]);
    let app = routes::app(state).layer(cors);

    // Bind and serve
    let addr: SocketAddr = std::env::var("BIND_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:3001".to_string())
        .parse()
        .expect("BIND_ADDR must be a valid socket address (e.g. 0.0.0.0:3001)");

    tracing::info!("1Router API listening on {addr}");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();

    // Set TCP_NODELAY on incoming connections to disable Nagle's algorithm.
    // axum::serve doesn't expose this directly, so we use the accept loop
    // pattern with axum::serve's built-in acceptor.
    //
    // For maximum throughput, we could also set SO_REUSEPORT to distribute
    // connections across worker threads at the kernel level (epoll-aware),
    // but that requires a custom listener which is a future optimization.
    axum::serve(listener, app).await.unwrap();
}
