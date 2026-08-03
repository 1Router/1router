use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

/// OpenAI-compatible error response body.
#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: ErrorBody,
}

#[derive(Serialize)]
pub struct ErrorBody {
    pub message: String,
    #[serde(rename = "type")]
    pub error_type: &'static str,
    pub code: Option<String>,
}

/// Build an OpenAI-compatible JSON error response with the given status code
/// and message. Used by both the chat route and the auth middleware so
/// clients always get a consistent error format.
pub fn error_response(status: StatusCode, message: impl Into<String>) -> Response {
    (
        status,
        Json(ErrorResponse {
            error: ErrorBody {
                message: message.into(),
                error_type: "invalid_request_error",
                code: None,
            },
        }),
    )
        .into_response()
}
