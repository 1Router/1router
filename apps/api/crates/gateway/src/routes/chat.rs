use axum::body::Body;
use axum::extract::{Extension, State};
use axum::http::{HeaderMap, HeaderName, HeaderValue, StatusCode};
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::response::{IntoResponse, Response};
use axum::Json;
use onerouter_core::router;
use onerouter_core::types::ChatCompletionRequest;
use std::convert::Infallible;
use std::sync::Arc;

use super::error::error_response;
use crate::state::AppState;

/// POST /v1/chat/completions
///
/// High-performance proxy handler. Three paths:
///
/// 1. **Passthrough fast path** (OpenAI-compatible providers): skip JSON
///    parsing entirely — forward the client's request body as raw bytes
///    to the upstream, and stream the upstream's response bytes back to
///    the client. Zero serialization, zero deserialization.
///
/// 2. **SSE streaming fast path** (passthrough + stream=true): forward
///    raw SSE bytes from upstream to client. No String conversion, no
///    Event object creation, no line parsing — just pipe bytes through.
///
/// 3. **Transform path** (Anthropic, Google): parse JSON, transform
///    request/response format, serialize back. Slower but necessary
///    for format translation.
pub async fn chat_completions(
    State(state): State<AppState>,
    identity: Option<Extension<crate::internal_auth::VerifiedIdentity>>,
    Json(request): Json<ChatCompletionRequest>,
) -> Response {
    if let Some(Extension(identity)) = identity {
        tracing::debug!(identity = %identity.identity, "authenticated control-plane identity");
    }
    let is_stream = request.stream;
    let model_id = request.model.clone();

    // ── Resolve model → provider (O(1) HashMap lookup) ──────────────────
    let route = match router::resolve(&state.model_index, &model_id) {
        Ok(r) => r,
        Err(e) => return error_response(StatusCode::NOT_FOUND, &e.to_string()),
    };

    let provider = route.provider;
    let provider_model = provider.format_model_id(&route.model.id);

    // ── Resolve API key from cached provider keys ───────────────────────
    // Keys are loaded once at startup into AppState.provider_keys to avoid
    // calling std::env::var() (O(n) env array scan) on every request.
    let env_var = provider.api_key_env();
    // Clone is Arc<str>::clone — just a refcount bump, no heap allocation.
    let api_key: Arc<str> = match state.provider_keys.get(env_var) {
        Some(k) => Arc::clone(k),
        None => {
            return error_response(
                StatusCode::UNAUTHORIZED,
                &format!("no API key configured for provider (env var: {env_var})"),
            )
        }
    };
    // Deref Arc<str> → &str for the proxy functions
    let api_key: &str = &api_key;

    // ── Build upstream URL ──────────────────────────────────────────────
    let url = match provider.complete_url(None, &provider_model) {
        Ok(u) => u,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
    };

    // ════════════════════════════════════════════════════════════════════
    // PASSTHROUGH FAST PATH — zero-copy byte forwarding
    // ════════════════════════════════════════════════════════════════════
    if provider.is_passthrough() {
        // Override the model id: the client sent "openai/gpt-4o" but the
        // upstream expects just "gpt-4o" (or the full id for OpenRouter).
        // provider_model already has the right value from format_model_id().
        let mut req = request;
        req.model = provider_model;
        return passthrough_proxy(state, &url, &api_key, provider, req, is_stream).await;
    }

    // ════════════════════════════════════════════════════════════════════
    // TRANSFORM PATH — format translation (Anthropic, Google)
    // ════════════════════════════════════════════════════════════════════
    transform_proxy(
        state,
        &url,
        &api_key,
        provider,
        &provider_model,
        request,
        is_stream,
        &model_id,
    )
    .await
}

/// Fast path: forward raw bytes for OpenAI-compatible providers.
/// No JSON parsing, no transformation — just pipe bytes through.
async fn passthrough_proxy(
    state: AppState,
    url: &str,
    api_key: &str,
    provider: &dyn onerouter_core::chat::transformation::ChatProviderConfig,
    request: ChatCompletionRequest,
    is_stream: bool,
) -> Response {
    // Serialize the request once — this is unavoidable since we need to
    // parse the incoming body to extract the model id for routing.
    // But we skip transform_request entirely (no rebuilding the JSON).
    let body_bytes = match serde_json::to_vec(&request) {
        Ok(b) => b,
        Err(e) => {
            return error_response(
                StatusCode::BAD_REQUEST,
                &format!("failed to serialize request: {e}"),
            )
        }
    };

    // Build upstream request with auth headers
    let auth = provider.auth_strategy();
    let mut req_builder = state
        .client
        .post(url)
        .header(auth.header_name(), auth.header_value(api_key))
        .header("content-type", "application/json");

    for (name, value) in provider.extra_headers() {
        req_builder = req_builder.header(name, value);
    }
    for (name, value) in provider.runtime_extra_headers() {
        req_builder = req_builder.header(name, value);
    }

    let upstream = req_builder.body(body_bytes);

    let response = match upstream.send().await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("upstream request failed: {e}");
            return error_response(
                StatusCode::BAD_GATEWAY,
                &format!("upstream request failed: {e}"),
            );
        }
    };

    let status = response.status();

    if !status.is_success() {
        let body_text = response.text().await.unwrap_or_default();
        return error_response(
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            &format!("upstream returned {}: {}", status.as_u16(), body_text),
        );
    }

    // ── Build response headers BEFORE consuming the body ────────────────
    // We must extract headers from `response` before calling
    // `response.bytes_stream()` which moves the response.
    let mut headers = HeaderMap::new();
    if is_stream {
        headers.insert(
            HeaderName::from_static("content-type"),
            HeaderValue::from_static("text/event-stream"),
        );
        headers.insert(
            HeaderName::from_static("cache-control"),
            HeaderValue::from_static("no-cache"),
        );
        headers.insert(
            HeaderName::from_static("connection"),
            HeaderValue::from_static("keep-alive"),
        );
    } else {
        headers.insert(
            HeaderName::from_static("content-type"),
            HeaderValue::from_static("application/json"),
        );
    }

    // Forward a whitelist of useful upstream headers to the client.
    // We don't forward everything (security: avoid leaking internal info),
    // but these help clients with rate limiting, debugging, and retries.
    const FORWARDABLE_HEADERS: &[&str] = &[
        "x-request-id",
        "retry-after",
        "x-ratelimit-limit-requests",
        "x-ratelimit-limit-tokens",
        "x-ratelimit-remaining-requests",
        "x-ratelimit-remaining-tokens",
        "x-ratelimit-reset-requests",
        "x-ratelimit-reset-tokens",
    ];
    for name in FORWARDABLE_HEADERS {
        if let Some(val) = response.headers().get(*name) {
            headers.insert(HeaderName::from_static(*name), val.clone());
        }
    }

    // ── Stream raw bytes back to client ─────────────────────────────────
    //
    // For both streaming and non-streaming, we forward the upstream's
    // response body as raw bytes. The format is already OpenAI-compatible,
    // so there's no need to parse, transform, or re-serialize.
    //
    // For streaming (SSE), the upstream sends `data: {...}\n\n` lines.
    // We forward these raw bytes — no String conversion, no Event creation.
    // The client receives the exact same bytes the upstream sent.
    let stream = response.bytes_stream();
    let body = Body::from_stream(stream);

    (
        StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
        headers,
        body,
    )
        .into_response()
}

/// Slow path: transform request/response for non-OpenAI providers.
async fn transform_proxy(
    state: AppState,
    url: &str,
    api_key: &str,
    provider: &dyn onerouter_core::chat::transformation::ChatProviderConfig,
    provider_model: &str,
    request: ChatCompletionRequest,
    is_stream: bool,
    model_id: &str,
) -> Response {
    // Transform request to provider's native format
    let optional_params = request.optional_params();
    let body = match provider.transform_request(provider_model, &request, &optional_params) {
        Ok(b) => b,
        Err(e) => return error_response(StatusCode::BAD_REQUEST, &e.to_string()),
    };

    // Build upstream request
    let auth = provider.auth_strategy();
    let mut req_builder = state
        .client
        .post(url)
        .header(auth.header_name(), auth.header_value(api_key));

    for (name, value) in provider.extra_headers() {
        req_builder = req_builder.header(name, value);
    }
    for (name, value) in provider.runtime_extra_headers() {
        req_builder = req_builder.header(name, value);
    }

    let upstream = req_builder.json(&body);

    let response = match upstream.send().await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("upstream request failed for {model_id}: {e}");
            return error_response(
                StatusCode::BAD_GATEWAY,
                &format!("upstream request failed: {e}"),
            );
        }
    };

    let status = response.status();

    // ── Non-streaming: parse, transform, return JSON ────────────────────
    if !is_stream {
        if !status.is_success() {
            let body_text = response.text().await.unwrap_or_default();
            return error_response(
                StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
                &format!("upstream returned {}: {}", status.as_u16(), body_text),
            );
        }

        let response_json: serde_json::Value = match response.json().await {
            Ok(v) => v,
            Err(e) => {
                return error_response(
                    StatusCode::BAD_GATEWAY,
                    &format!("invalid upstream response: {e}"),
                );
            }
        };

        let transformed = match provider.transform_response(provider_model, response_json) {
            Ok(r) => r,
            Err(e) => {
                return error_response(
                    StatusCode::BAD_GATEWAY,
                    &format!("response transformation failed: {e}"),
                );
            }
        };

        return Json(transformed).into_response();
    }

    // ── Streaming: fake-stream (collect full response, emit as SSE) ─────
    if status.is_success() {
        let response_json: serde_json::Value = match response.json().await {
            Ok(v) => v,
            Err(e) => {
                return error_response(
                    StatusCode::BAD_GATEWAY,
                    &format!("invalid upstream response: {e}"),
                );
            }
        };

        let transformed = match provider.transform_response(provider_model, response_json) {
            Ok(r) => r,
            Err(e) => {
                return error_response(
                    StatusCode::BAD_GATEWAY,
                    &format!("response transformation failed: {e}"),
                );
            }
        };

        // Emit content chunk + finish chunk + [DONE]
        let id = transformed.id;
        let created = transformed.created;
        let model_name = transformed.model;

        let mut events: Vec<Result<Event, Infallible>> =
            Vec::with_capacity(transformed.choices.len() * 2 + 1);

        for choice in transformed.choices.into_iter() {
            let content_chunk = onerouter_core::types::ChatCompletionChunk {
                id: id.clone(),
                object: "chat.completion.chunk".to_string(),
                created,
                model: model_name.clone(),
                choices: vec![onerouter_core::types::ChunkChoice {
                    index: choice.index,
                    delta: onerouter_core::types::Delta {
                        role: Some(choice.message.role.clone()),
                        content: choice.message.content.as_str().map(String::from),
                    },
                    finish_reason: None,
                }],
                usage: None,
            };
            events.push(Ok(
                Event::default().data(serde_json::to_string(&content_chunk).unwrap_or_default())
            ));

            let finish_chunk = onerouter_core::types::ChatCompletionChunk {
                id: id.clone(),
                object: "chat.completion.chunk".to_string(),
                created,
                model: model_name.clone(),
                choices: vec![onerouter_core::types::ChunkChoice {
                    index: choice.index,
                    delta: onerouter_core::types::Delta::default(),
                    finish_reason: choice.finish_reason,
                }],
                usage: None,
            };
            events.push(Ok(
                Event::default().data(serde_json::to_string(&finish_chunk).unwrap_or_default())
            ));
        }

        if let Some(usage) = transformed.usage {
            let usage_chunk = onerouter_core::types::ChatCompletionChunk {
                id,
                object: "chat.completion.chunk".to_string(),
                created,
                model: model_name,
                choices: Vec::new(),
                usage: Some(usage),
            };
            events.push(Ok(
                Event::default().data(serde_json::to_string(&usage_chunk).unwrap_or_default())
            ));
        }

        events.push(Ok(Event::default().data("[DONE]")));

        let sse_stream = tokio_stream::iter(events);

        return Sse::new(sse_stream)
            .keep_alive(KeepAlive::default())
            .into_response();
    }

    // Error during streaming
    let body_text = response.text().await.unwrap_or_default();
    error_response(
        StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
        &format!("upstream returned {}: {}", status.as_u16(), body_text),
    )
}
