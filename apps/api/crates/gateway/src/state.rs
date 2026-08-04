use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use onerouter_core::catalog::CatalogModel;
use onerouter_core::constants;
use onerouter_core::providers;
use sha2::{Digest, Sha256};

/// Shared state accessible to all route handlers via Axum's State extractor.
///
/// All fields are cheap to clone (Arc or reqwest::Client which is internally
/// Arc'd), so the per-request clone in Axum's State is essentially zero-cost.
#[derive(Clone)]
pub struct AppState {
    /// O(1) model lookup by id (e.g. "openai/gpt-4o").
    /// Arc'd so the clone in State is a single refcount increment.
    pub model_index: Arc<HashMap<String, Arc<CatalogModel>>>,

    /// Tuned HTTP client with connection pooling, TCP_NODELAY, and HTTP/2.
    /// reqwest::Client is internally Arc'd, so cloning is free.
    pub client: reqwest::Client,

    /// Provider API keys cached at startup, keyed by env var name.
    /// Values are Arc<str> so the per-request clone in the chat handler
    /// is a refcount bump, not a heap allocation.
    pub provider_keys: Arc<HashMap<String, Arc<str>>>,

    /// Pre-computed SHA-256 hash of the master API key.
    /// Computed once at startup so auth doesn't need to hash the expected
    /// key on every request — only the incoming token is hashed.
    pub master_key_hash: Option<[u8; 32]>,

    /// Optional secret used to authenticate identity assertions from the
    /// Next.js control plane. It is separate from the master-key hash because
    /// HMAC verification needs the secret material at request time.
    pub identity_secret: Option<Arc<str>>,
}

impl AppState {
    pub fn new(models: Vec<CatalogModel>) -> Self {
        // Build an O(1) lookup index: model_id → Arc<CatalogModel>
        let model_index: HashMap<String, Arc<CatalogModel>> = models
            .into_iter()
            .map(|m| {
                let id = m.id.clone();
                (id, Arc::new(m))
            })
            .collect();

        // Build a tuned reqwest client optimized for proxying:
        //
        // - pool_max_idle_per_host(64): keep up to 64 idle connections per
        //   upstream provider. With ~10 providers, that's 640 pooled
        //   connections ready for instant reuse (no TCP/TLS handshake).
        // - pool_idle_timeout(90s): keep connections warm for 90s. Most
        //   upstream providers have a 60-120s idle timeout, so 90s stays
        //   under that while keeping hot connections ready.
        // - tcp_nodelay(true): disable Nagle's algorithm — critical for
        //   low-latency proxying of small SSE chunks. Without this, the
        //   kernel buffers small packets for 40ms before sending.
        // - tcp_keepalive(60s): detect stale connections early.
        // - http2_prior_probe(true): try HTTP/2 first for multiplexing
        //   multiple requests over a single connection.
        // - connect_timeout(10s): fail fast on unreachable upstreams.
        // - timeout(120s): overall request timeout (matches upstream LLM
        //   generation times which can be long).
        let client = reqwest::Client::builder()
            .pool_max_idle_per_host(64)
            .pool_idle_timeout(Duration::from_secs(90))
            .tcp_nodelay(true)
            .tcp_keepalive(Duration::from_secs(60))
            // HTTP/2 is auto-negotiated via ALPN with rustls-tls,
            // so no explicit http2_prior_probe() is needed.
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(constants::DEFAULT_TIMEOUT_SECS))
            .build()
            .expect("failed to build HTTP client");

        // Pre-compute the SHA-256 hash of the master API key at startup.
        // This avoids calling std::env::var() AND hashing the expected key
        // on every single request. The auth middleware only needs to hash
        // the incoming token and compare.
        let master_key = std::env::var("ROUTER_API_KEY")
            .ok()
            .filter(|s| !s.is_empty());
        let master_key_hash = master_key.as_ref().map(|k| {
            let hash = Sha256::digest(k.as_bytes());
            let mut arr = [0u8; 32];
            arr.copy_from_slice(&hash);
            arr
        });

        let identity_secret = std::env::var("ROUTER_IDENTITY_SECRET")
            .ok()
            .filter(|secret| !secret.is_empty())
            .map(|secret| Arc::from(secret.as_str()));

        if identity_secret.is_none() {
            tracing::warn!(
                "no ROUTER_IDENTITY_SECRET configured — gateway identity assertions are disabled"
            );
        }

        // Warn if no key is configured (fail-closed at auth time)
        if master_key_hash.is_none() {
            tracing::warn!(
                "no ROUTER_API_KEY env var set — all authenticated requests will be rejected (fail-closed)"
            );
        }

        // Pre-warm provider API key env vars at startup. Cache them in a
        // HashMap so the hot path doesn't call std::env::var() (which does
        // an O(n) scan of the process environment array on every call).
        let mut provider_keys: HashMap<String, Arc<str>> = HashMap::new();
        for slug in providers::supported_slugs() {
            let config = providers::config_for_slug(slug).unwrap();
            let env_var = config.api_key_env();
            match std::env::var(env_var).ok().filter(|s| !s.is_empty()) {
                Some(val) => {
                    provider_keys.insert(env_var.to_string(), Arc::from(val.as_str()));
                }
                None => {
                    tracing::warn!(
                        "no {env_var} env var set — models from provider '{slug}' will return 401"
                    );
                }
            }
        }

        Self {
            model_index: Arc::new(model_index),
            client,
            provider_keys: Arc::new(provider_keys),
            master_key_hash,
            identity_secret,
        }
    }
}
