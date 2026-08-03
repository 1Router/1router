use serde_json::{Map, Value};

use crate::chat::transformation::{AuthStrategy, ChatProviderConfig};
use crate::types::{ChatCompletionRequest, ChatCompletionResponse, Usage};
use crate::{ChatMessage, CoreError, CoreResult};

/// Anthropic Messages API config.
/// Translates OpenAI chat format ↔ Anthropic Messages format.
pub const ANTHROPIC_CHAT_CONFIG: AnthropicChatConfig = AnthropicChatConfig;

pub struct AnthropicChatConfig;

impl ChatProviderConfig for AnthropicChatConfig {
    fn api_base(&self) -> &str {
        "https://api.anthropic.com/v1"
    }

    fn auth_strategy(&self) -> AuthStrategy {
        AuthStrategy::Header("x-api-key")
    }

    fn extra_headers(&self) -> Vec<(&'static str, &'static str)> {
        vec![("anthropic-version", "2023-06-01")]
    }

    fn transform_request(
        &self,
        model: &str,
        request: &ChatCompletionRequest,
        optional_params: &Map<String, Value>,
    ) -> CoreResult<Value> {
        let mut body = serde_json::Map::new();
        body.insert("model".into(), Value::String(model.to_string()));

        // Anthropic separates system messages from the conversation array.
        // We extract all system-role messages into the top-level `system` field.
        let mut system_parts: Vec<String> = Vec::new();
        let mut messages: Vec<Value> = Vec::new();

        for msg in &request.messages {
            if msg.role == "system" {
                if let Some(text) = msg.content.as_str() {
                    system_parts.push(text.to_string());
                }
            } else {
                messages.push(serde_json::to_value(msg)?);
            }
        }

        if !system_parts.is_empty() {
            body.insert("system".into(), Value::String(system_parts.join("\n\n")));
        }
        body.insert("messages".into(), Value::Array(messages));

        // max_tokens is required for Anthropic — default to 4096 if not provided
        let max_tokens = optional_params
            .get("max_tokens")
            .cloned()
            .unwrap_or_else(|| Value::from(4096u64));
        body.insert("max_tokens".into(), max_tokens);

        // Map temperature, top_p, stop if present
        if let Some(t) = optional_params.get("temperature") {
            body.insert("temperature".into(), t.clone());
        }
        if let Some(p) = optional_params.get("top_p") {
            body.insert("top_p".into(), p.clone());
        }
        if let Some(s) = optional_params.get("stop") {
            body.insert("stop_sequences".into(), s.clone());
        }

        // Pass through tools/tool_choice if present (Anthropic supports them
        // but with a slightly different schema — this is a passthrough for now;
        // full tool translation is a TODO).
        if let Some(t) = optional_params.get("tools") {
            body.insert("tools".into(), t.clone());
        }
        if let Some(tc) = optional_params.get("tool_choice") {
            body.insert("tool_choice".into(), tc.clone());
        }

        // Note: we deliberately do NOT pass stream=true to the upstream.
        // The gateway handles streaming at its level: if the client requested
        // stream=true but the provider doesn't support native SSE streaming
        // (supports_streaming() returns false), the gateway collects the
        // full non-streaming response and emits it as a single SSE chunk.
        // Sending stream=true to Anthropic would make the upstream return
        // SSE format, which the fake-stream path can't parse as JSON.

        Ok(Value::Object(body))
    }

    fn transform_response(
        &self,
        model: &str,
        response_json: Value,
    ) -> CoreResult<ChatCompletionResponse> {
        // Anthropic response format:
        // { "id": "msg_...", "content": [{"type":"text","text":"..."}], ... }
        let id = response_json
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();

        let content_text = response_json
            .get("content")
            .and_then(|c| c.as_array())
            .map(|blocks| {
                blocks
                    .iter()
                    .filter_map(|b| {
                        if b.get("type").and_then(|t| t.as_str()) == Some("text") {
                            b.get("text").and_then(|t| t.as_str()).map(String::from)
                        } else {
                            None
                        }
                    })
                    .collect::<Vec<_>>()
                    .join("")
            })
            .unwrap_or_default();

        let stop_reason = response_json
            .get("stop_reason")
            .and_then(|v| v.as_str())
            .map(|s| {
                // Map Anthropic stop reasons to OpenAI finish reasons
                match s {
                    "end_turn" => "stop".to_string(),
                    "max_tokens" => "length".to_string(),
                    "stop_sequence" => "stop".to_string(),
                    "tool_use" => "tool_calls".to_string(),
                    other => other.to_string(),
                }
            });

        let usage = response_json.get("usage").map(|u| {
            let input = u.get("input_tokens").and_then(|v| v.as_u64()).unwrap_or(0);
            let output = u.get("output_tokens").and_then(|v| v.as_u64()).unwrap_or(0);
            Usage {
                prompt_tokens: input,
                completion_tokens: output,
                total_tokens: input + output,
            }
        });

        let created = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        Ok(ChatCompletionResponse {
            id,
            object: "chat.completion".to_string(),
            created,
            model: model.to_string(),
            choices: vec![crate::Choice {
                index: 0,
                message: ChatMessage {
                    role: "assistant".to_string(),
                    content: Value::String(content_text),
                    name: None,
                    tool_calls: None,
                    tool_call_id: None,
                },
                finish_reason: stop_reason,
            }],
            usage,
        })
    }

    fn complete_url(
        &self,
        api_base_override: Option<&str>,
        _model: &str,
    ) -> CoreResult<String> {
        let base = api_base_override.unwrap_or(self.api_base());
        Ok(format!("{base}/messages"))
    }

    fn resolve_api_key(
        &self,
        api_key: Option<&str>,
        env: &dyn Fn(&str) -> Option<String>,
    ) -> CoreResult<String> {
        api_key
            .map(|s| s.to_string())
            .or_else(|| env("ANTHROPIC_API_KEY"))
            .ok_or_else(|| {
                CoreError::Auth("no API key: set ANTHROPIC_API_KEY env var".to_string())
            })
    }

    fn api_key_env(&self) -> &str {
        "ANTHROPIC_API_KEY"
    }

    fn supports_streaming(&self) -> bool {
        // Anthropic has a different SSE format than OpenAI. True streaming
        // transform is a TODO — fake-stream fallback works for now.
        false
    }
}
