use axum::extract::State;
use axum::http::{header, HeaderValue, StatusCode};
use axum::response::IntoResponse;
use axum::Json;
use serde_json::json;

use crate::state::AppState;

pub async fn healthz() -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

pub async fn provider_health(State(state): State<AppState>) -> Json<serde_json::Value> {
    let snapshot = state.health_snapshot().await;
    Json(json!({
        "status": "ok",
        "providers": snapshot,
        "maxRetries": state.max_retries,
    }))
}

pub async fn metrics(State(state): State<AppState>) -> impl IntoResponse {
    let (total, success, failure, latency_ms) = state.metrics_snapshot();
    let body = format!(
        "# TYPE onerouter_requests_total counter\nonerouter_requests_total {total}\n# TYPE onerouter_requests_success_total counter\nonerouter_requests_success_total {success}\n# TYPE onerouter_requests_failure_total counter\nonerouter_requests_failure_total {failure}\n# TYPE onerouter_request_latency_ms_total counter\nonerouter_request_latency_ms_total {latency_ms}\n"
    );
    (
        StatusCode::OK,
        [(
            header::CONTENT_TYPE,
            HeaderValue::from_static("text/plain; version=0.0.4; charset=utf-8"),
        )],
        body,
    )
}
