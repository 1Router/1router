use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::Response;
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};
use subtle::ConstantTimeEq;

use crate::routes::error_response;
use crate::state::AppState;

/// Extract and validate the Bearer token from the Authorization header.
///
/// The master key is hashed at startup in `AppState`; each request only hashes
/// the presented token and compares the two digests in constant time. If the
/// private site-to-gateway identity headers are present, they are also checked
/// before the request reaches a handler.
pub async fn require_master_key(
    State(state): State<AppState>,
    req: Request,
    next: Next,
) -> Result<Response, Response> {
    let expected_hash = match &state.master_key_hash {
        Some(hash) => hash,
        None => {
            return Err(error_response(
                StatusCode::UNAUTHORIZED,
                "Server is not configured for authentication. Contact the administrator.",
            ));
        }
    };

    let token = req
        .headers()
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .map(str::trim);

    let token = match token {
        Some(token) if !token.is_empty() => token,
        _ => {
            return Err(error_response(
                StatusCode::UNAUTHORIZED,
                "Missing or invalid Authorization header. Expected: Bearer <api-key>",
            ));
        }
    };

    let token_hash = Sha256::digest(token.as_bytes());
    if !bool::from(expected_hash.ct_eq(&token_hash)) {
        tracing::warn!("authentication failed: invalid API key");
        return Err(error_response(
            StatusCode::UNAUTHORIZED,
            "Invalid API key provided.",
        ));
    }

    let mut req = req;
    let identity_header_names = [
        crate::internal_auth::IDENTITY_HEADER,
        crate::internal_auth::SIGNATURE_HEADER,
        crate::internal_auth::TIMESTAMP_HEADER,
    ];
    let has_identity_headers = identity_header_names
        .iter()
        .any(|name| req.headers().contains_key(*name));

    if has_identity_headers {
        let identity_secret = match state.identity_secret.as_deref() {
            Some(secret) => secret,
            None => {
                return Err(error_response(
                    StatusCode::UNAUTHORIZED,
                    "Router identity assertions are not configured.",
                ));
            }
        };
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_secs() as i64)
            .unwrap_or_default();
        let identity = crate::internal_auth::verify_identity(req.headers(), identity_secret, now);

        match identity {
            Some(identity) => {
                req.extensions_mut().insert(identity);
            }
            None => {
                return Err(error_response(
                    StatusCode::UNAUTHORIZED,
                    "Invalid router identity assertion.",
                ));
            }
        }
    }

    Ok(next.run(req).await)
}
