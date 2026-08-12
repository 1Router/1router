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
use std::time::Instant;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;

use super::error::error_response;
use crate::state::AppState;

pub async fn chat_completions(
    State(state): State<AppState>,
    identity: Option<Extension<crate::internal_auth::VerifiedIdentity>>,
    Json(request): Json<ChatCompletionRequest>,
) -> Response {
    let identity = identity.map(|Extension(value)| value.identity);
    let model_id = request.model.clone();
    let route = match router::resolve(&state.model_index, &model_id) {
        Ok(route) => route,
        Err(error) => return error_response(StatusCode::NOT_FOUND, error.to_string()),
    };

    let max_attempts = state.max_retries.saturating_add(1);
    let request_id = format!(
        "req-{}",
        state
            .selection_counter
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed)
    );
    let mut last_response = None;
    for attempt in 0..max_attempts {
        let deployment = state.select_deployment(&route.model).await;
        let provider = match onerouter_core::providers::config_for_slug(&deployment.provider_slug) {
            Some(provider) => provider,
            None => {
                return error_response(
                    StatusCode::NOT_FOUND,
                    format!("provider not supported: {}", deployment.provider_slug),
                )
            }
        };
        let provider_model = deployment
            .upstream_model
            .clone()
            .unwrap_or_else(|| route.model.provider_model_id().to_string());
        let env_var = provider.api_key_env();
        let api_key: Arc<str> = match state.provider_keys.get(env_var) {
            Some(key) => Arc::clone(key),
            None => {
                return error_response(
                    StatusCode::UNAUTHORIZED,
                    format!("no API key configured for provider (env var: {env_var})"),
                )
            }
        };
        let url = match provider.complete_url(deployment.api_base.as_deref(), &provider_model) {
            Ok(url) => url,
            Err(error) => {
                return error_response(StatusCode::INTERNAL_SERVER_ERROR, error.to_string())
            }
        };
        let started = Instant::now();
        let mut response = if provider.is_passthrough() {
            let mut forwarded = request.clone();
            forwarded.model = provider_model.clone();
            passthrough_proxy(
                state.clone(),
                &url,
                &api_key,
                provider,
                forwarded,
                request.stream,
            )
            .await
        } else {
            transform_proxy(
                state.clone(),
                &url,
                &api_key,
                provider,
                deployment.api_base.as_deref(),
                &provider_model,
                request.clone(),
                request.stream,
                &model_id,
            )
            .await
        };
        if let Ok(value) = HeaderValue::from_str(&request_id) {
            response
                .headers_mut()
                .insert(HeaderName::from_static("x-request-id"), value);
        }
        let status = response.status();
        let latency_ms = started.elapsed().as_millis();
        state.record_metric(status.as_u16(), latency_ms);
        let retryable = retryable_status(status);
        tracing::info!(
            model = %model_id,
            provider = %deployment.provider_slug,
            attempt = attempt + 1,
            status = status.as_u16(),
            latency_ms,
            authenticated_identity = identity.as_deref().unwrap_or("anonymous"),
            "chat request completed"
        );

        if status.is_success() {
            state
                .record_success(&model_id, &deployment, status.as_u16(), latency_ms)
                .await;
            return response;
        }
        if retryable {
            state
                .record_failure(&model_id, &deployment, Some(status.as_u16()), latency_ms)
                .await;
        }
        last_response = Some(response);
        if !retryable || attempt + 1 >= max_attempts {
            break;
        }
        tracing::warn!(model = %model_id, provider = %deployment.provider_slug, attempt = attempt + 1, status = status.as_u16(), "retrying request on another deployment");
    }

    last_response.unwrap_or_else(|| {
        error_response(StatusCode::BAD_GATEWAY, "all provider deployments failed")
    })
}

fn retryable_status(status: StatusCode) -> bool {
    matches!(
        status,
        StatusCode::REQUEST_TIMEOUT
            | StatusCode::TOO_EARLY
            | StatusCode::TOO_MANY_REQUESTS
            | StatusCode::BAD_GATEWAY
            | StatusCode::SERVICE_UNAVAILABLE
            | StatusCode::GATEWAY_TIMEOUT
    ) || status.is_server_error()
}

async fn passthrough_proxy(
    state: AppState,
    url: &str,
    api_key: &str,
    provider: &'static dyn onerouter_core::chat::transformation::ChatProviderConfig,
    request: ChatCompletionRequest,
    is_stream: bool,
) -> Response {
    let body_bytes = match serde_json::to_vec(&request) {
        Ok(body) => body,
        Err(error) => {
            return error_response(
                StatusCode::BAD_REQUEST,
                format!("failed to serialize request: {error}"),
            )
        }
    };
    let auth = provider.auth_strategy();
    let mut builder = state
        .client
        .post(url)
        .header(auth.header_name(), auth.header_value(api_key))
        .header("content-type", "application/json");
    for (name, value) in provider.extra_headers() {
        builder = builder.header(name, value);
    }

    let response = match builder.body(body_bytes).send().await {
        Ok(response) => response,
        Err(error) => {
            return error_response(
                StatusCode::BAD_GATEWAY,
                format!("upstream request failed: {error}"),
            )
        }
    };
    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return error_response(
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            format!("upstream returned {}: {}", status.as_u16(), body),
        );
    }

    let mut headers = HeaderMap::new();
    headers.insert(
        "content-type",
        if is_stream {
            HeaderValue::from_static("text/event-stream")
        } else {
            HeaderValue::from_static("application/json")
        },
    );
    if is_stream {
        headers.insert("cache-control", HeaderValue::from_static("no-cache"));
        headers.insert("connection", HeaderValue::from_static("keep-alive"));
    }
    for name in [
        "x-request-id",
        "retry-after",
        "x-ratelimit-limit-requests",
        "x-ratelimit-limit-tokens",
        "x-ratelimit-remaining-requests",
        "x-ratelimit-remaining-tokens",
        "x-ratelimit-reset-requests",
        "x-ratelimit-reset-tokens",
    ] {
        if let Some(value) = response.headers().get(name) {
            headers.insert(HeaderName::from_static(name), value.clone());
        }
    }
    (status, headers, Body::from_stream(response.bytes_stream())).into_response()
}

async fn transform_proxy(
    state: AppState,
    url: &str,
    api_key: &str,
    provider: &'static dyn onerouter_core::chat::transformation::ChatProviderConfig,
    api_base_override: Option<&str>,
    provider_model: &str,
    request: ChatCompletionRequest,
    is_stream: bool,
    model_id: &str,
) -> Response {
    let optional_params = request.optional_params();
    let body = match provider.transform_request(provider_model, &request, &optional_params) {
        Ok(body) => body,
        Err(error) => return error_response(StatusCode::BAD_REQUEST, error.to_string()),
    };
    let auth = provider.auth_strategy();
    let request_url = if is_stream && provider.supports_streaming() {
        match provider.streaming_url(api_base_override, provider_model) {
            Ok(url) => url,
            Err(error) => {
                return error_response(StatusCode::INTERNAL_SERVER_ERROR, error.to_string())
            }
        }
    } else {
        url.to_string()
    };
    let mut builder = state
        .client
        .post(request_url)
        .header(auth.header_name(), auth.header_value(api_key));
    for (name, value) in provider.extra_headers() {
        builder = builder.header(name, value);
    }
    let response = match builder.json(&body).send().await {
        Ok(response) => response,
        Err(error) => {
            return error_response(
                StatusCode::BAD_GATEWAY,
                format!("upstream request failed for {model_id}: {error}"),
            )
        }
    };
    let status = response.status();

    if is_stream && provider.supports_streaming() {
        return native_stream_proxy(response, provider, provider_model).await;
    }
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return error_response(
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            format!("upstream returned {}: {}", status.as_u16(), body),
        );
    }
    let response_json: serde_json::Value = match response.json().await {
        Ok(value) => value,
        Err(error) => {
            return error_response(
                StatusCode::BAD_GATEWAY,
                format!("invalid upstream response: {error}"),
            )
        }
    };
    let transformed = match provider.transform_response(provider_model, response_json) {
        Ok(response) => response,
        Err(error) => {
            return error_response(
                StatusCode::BAD_GATEWAY,
                format!("response transformation failed: {error}"),
            )
        }
    };
    if !is_stream {
        return Json(transformed).into_response();
    }

    let id = transformed.id;
    let created = transformed.created;
    let model = transformed.model;
    let mut events: Vec<Result<Event, Infallible>> =
        Vec::with_capacity(transformed.choices.len() * 2 + 2);
    for choice in transformed.choices {
        let content = onerouter_core::types::ChatCompletionChunk {
            id: id.clone(),
            object: "chat.completion.chunk".to_string(),
            created,
            model: model.clone(),
            choices: vec![onerouter_core::types::ChunkChoice {
                index: choice.index,
                delta: onerouter_core::types::Delta {
                    role: Some(choice.message.role),
                    content: choice.message.content.as_str().map(String::from),
                    tool_calls: choice.message.tool_calls.map(|calls| {
                        calls
                            .into_iter()
                            .enumerate()
                            .map(|(index, call)| onerouter_core::types::ChunkToolCall {
                                index: index as u64,
                                id: call.get("id").and_then(|v| v.as_str()).map(String::from),
                                call_type: Some("function".to_string()),
                                function: call.get("function").map(|function| {
                                    onerouter_core::types::ChunkFunction {
                                        name: function
                                            .get("name")
                                            .and_then(|v| v.as_str())
                                            .map(String::from),
                                        arguments: function
                                            .get("arguments")
                                            .and_then(|v| v.as_str())
                                            .map(String::from),
                                    }
                                }),
                            })
                            .collect()
                    }),
                },
                finish_reason: None,
            }],
            usage: None,
        };
        events.push(Ok(
            Event::default().data(serde_json::to_string(&content).unwrap_or_default())
        ));
        let finish = onerouter_core::types::ChatCompletionChunk {
            id: id.clone(),
            object: "chat.completion.chunk".to_string(),
            created,
            model: model.clone(),
            choices: vec![onerouter_core::types::ChunkChoice {
                index: choice.index,
                delta: Default::default(),
                finish_reason: choice.finish_reason,
            }],
            usage: None,
        };
        events.push(Ok(
            Event::default().data(serde_json::to_string(&finish).unwrap_or_default())
        ));
    }
    if let Some(usage) = transformed.usage {
        events.push(Ok(Event::default().data(
            serde_json::to_string(&onerouter_core::types::ChatCompletionChunk {
                id,
                object: "chat.completion.chunk".to_string(),
                created,
                model,
                choices: Vec::new(),
                usage: Some(usage),
            })
            .unwrap_or_default(),
        )));
    }
    events.push(Ok(Event::default().data("[DONE]")));
    Sse::new(tokio_stream::iter(events))
        .keep_alive(KeepAlive::default())
        .into_response()
}

async fn native_stream_proxy(
    response: reqwest::Response,
    provider: &'static dyn onerouter_core::chat::transformation::ChatProviderConfig,
    model: &str,
) -> Response {
    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return error_response(
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            format!("upstream returned {}: {}", status.as_u16(), body),
        );
    }
    let mut upstream = response.bytes_stream();
    let model = model.to_string();
    let (sender, receiver) = mpsc::channel::<Result<Event, Infallible>>(32);
    tokio::spawn(async move {
        let mut buffer = String::new();
        let mut done = false;
        while let Some(result) = upstream.next().await {
            let bytes = match result {
                Ok(bytes) => bytes,
                Err(_) => break,
            };
            buffer.push_str(&String::from_utf8_lossy(&bytes));
            while let Some(index) = buffer.find('\n') {
                let line = buffer[..index].trim().to_string();
                buffer = buffer[index + 1..].to_string();
                let Some(data) = line.strip_prefix("data:").map(str::trim) else {
                    continue;
                };
                if data == "[DONE]" {
                    done = true;
                    continue;
                }
                let event: serde_json::Value = match serde_json::from_str(data) {
                    Ok(event) => event,
                    Err(_) => continue,
                };
                let chunks = provider
                    .transform_stream_event(&model, event)
                    .unwrap_or_default();
                for chunk in chunks {
                    if sender
                        .send(Ok(Event::default()
                            .data(serde_json::to_string(&chunk).unwrap_or_default())))
                        .await
                        .is_err()
                    {
                        return;
                    }
                }
            }
        }
        if !done {
            let _ = sender.send(Ok(Event::default().data("[DONE]"))).await;
        }
    });
    Sse::new(ReceiverStream::new(receiver))
        .keep_alive(KeepAlive::default())
        .into_response()
}
