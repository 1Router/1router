//! 1Router API scaffold.
//!
//! Today this exposes only `GET /healthz` and `GET /v1/models` (loaded from the
//! shared `packages/models/models.json` so site and API agree on the catalog).
//! Future iterations will add the OpenAI-compatible proxy, the provider pool,
//! credential rotation, and the per-provider no-logging attestation flow.

use axum::{routing::get, Json, Router};
use serde::Serialize;
use std::{net::SocketAddr, sync::Arc};
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;
use tracing::{info, warn};

#[derive(Clone)]
struct AppState {
    models: Arc<RwLock<Vec<Model>>>,
}

#[derive(Serialize, Clone)]
struct Model {
    id: String,
    name: String,
    provider: String,
    #[serde(rename = "providerSlug")]
    provider_slug: String,
    series: String,
    #[serde(rename = "contextLength")]
    context_length: u64,
}

#[derive(Serialize)]
struct Health {
    status: &'static str,
    version: &'static str,
}

async fn healthz() -> Json<Health> {
    Json(Health {
        status: "ok",
        version: env!("CARGO_PKG_VERSION"),
    })
}

async fn list_models(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> Json<serde_json::Value> {
    let models = state.models.read().await;
    Json(serde_json::json!({
        "object": "list",
        "data": *models,
    }))
}

/// Load the shared catalog at startup. A `build.rs` script (`apps/api/build.rs`)
/// copies `packages/models/models.json` into `apps/api/catalog/models.json` before
/// `cargo` runs, so this file is always available at compile time AND the binary
/// stays in lock-step with the site.
fn load_catalog() -> Vec<Model> {
    let raw = include_str!("../catalog/models.json");
    match serde_json::from_str::<serde_json::Value>(raw) {
        Ok(v) => v
            .get("models")
            .and_then(|m| m.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|m| {
                        Some(Model {
                            id: m.get("id")?.as_str()?.to_string(),
                            name: m.get("name")?.as_str()?.to_string(),
                            provider: m.get("provider")?.as_str()?.to_string(),
                            provider_slug: m.get("providerSlug")?.as_str()?.to_string(),
                            series: m.get("series")?.as_str().unwrap_or("").to_string(),
                            context_length: m
                                .get("contextLength")
                                .and_then(|v| v.as_u64())
                                .unwrap_or(0),
                        })
                    })
                    .collect()
            })
            .unwrap_or_default(),
        Err(e) => {
            warn!(error = %e, "failed to parse embedded models.json");
            Vec::new()
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "api=info,tower_http=info".into()),
        )
        .init();

    let state = AppState {
        models: Arc::new(RwLock::new(load_catalog())),
    };

    let app = Router::new()
        .route("/healthz", get(healthz))
        .route("/v1/models", get(list_models))
        .with_state(state)
        .layer(CorsLayer::permissive());

    let addr: SocketAddr = std::env::var("BIND_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:3000".to_string())
        .parse()?;

    info!("1router-api {} listening on {}", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION"));

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
