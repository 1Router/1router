mod chat;
mod error;
mod health;
mod models;

pub use error::error_response;

use crate::state::AppState;
use axum::routing::{get, post};
use axum::Router;

/// Build the full application router with all routes.
pub fn app(state: AppState) -> Router {
    // Public routes (no auth). Keep liveness and the model catalog available
    // to probes and discovery clients without exposing operational state.
    let public = Router::new()
        .route("/healthz", get(health::healthz))
        .route("/v1/models", get(models::list_models));

    // Operational and chat routes require the private gateway key. Provider
    // health includes deployment identifiers and metrics expose traffic volume,
    // so neither should be anonymously enumerable in production.
    let authed = Router::new()
        .route("/healthz/providers", get(health::provider_health))
        .route("/metrics", get(health::metrics))
        .route("/v1/chat/completions", post(chat::chat_completions))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::auth::require_master_key,
        ));

    Router::new().merge(public).merge(authed).with_state(state)
}
