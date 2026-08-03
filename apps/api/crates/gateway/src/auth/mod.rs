use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;

use crate::routes::error_response;
use crate::state::AppState;

/// Extract and validate the Bearer token from the Authorization header.
///
/// Performance: the expected key hash is pre-computed once at startup in
/// AppState and stored as `[u8; 32]`. On each request we only:
/// 1. Extract the Bearer token from the header (zero-alloc string slice)
/// 2. SHA-256 hash the incoming token (unavoidable — we can't store the
///    plaintext key to compare against)
/// 3. Constant-time compare two 32-byte arrays
///
/// This avoids std::env::var() on every request and avoids hashing the
/// expected key on every request.
pub async fn require_master_key(
    State(state): State<AppState>,
    req: Request,
    next: Next,
) -> Result<Response, Response> {
    // If no key is configured, reject all requests (fail-closed)
    let expected_hash = match &state.master_key_hash {
        Some(h) => h,
        None => {
            return Err(error_response(
                axum::http::StatusCode::UNAUTHORIZED,
                "Server is not configured for authentication. Contact the administrator.",
            ));
        }
    };

    // Extract the Bearer token from the Authorization header.
    // We work with &str (no allocation) until the very end.
    let token = req
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .map(|s| s.trim());

    let token = match token {
        Some(t) if !t.is_empty() => t,
        _ => {
            return Err(error_response(
                axum::http::StatusCode::UNAUTHORIZED,
                "Missing or invalid Authorization header. Expected: Bearer <api-key>",
            ));
        }
    };

    // Hash the incoming token and compare in constant time.
    // The expected hash is pre-computed at startup — we only hash the
    // incoming token (unavoidable, since we can't store the plaintext key).
    let token_hash = Sha256::digest(token.as_bytes());

    if expected_hash.ct_eq(&token_hash).into() {
        Ok(next.run(req).await)
    } else {
        tracing::warn!("authentication failed: invalid API key");
        Err(error_response(
            axum::http::StatusCode::UNAUTHORIZED,
            "Invalid API key provided.",
        ))
    }
}
