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
    // Public routes (no auth)
    let public = Router::new()
        .route("/healthz", get(health::healthz))
        .route("/v1/models", get(models::list_models));

    // Authenticated routes (require Bearer token)
    let authed = Router::new()
        .route("/v1/chat/completions", post(chat::chat_completions))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::auth::require_master_key,
        ));

    Router::new()
        .merge(public)
        .merge(authed)
        .with_state(state)
}
