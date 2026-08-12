use serde_json::{Map, Value};

use crate::chat::transformation::{AuthStrategy, ChatProviderConfig};
use crate::types::{
    ChatCompletionChunk, ChatCompletionRequest, ChatCompletionResponse, ChunkChoice, ChunkFunction,
    ChunkToolCall, Delta, Usage,
};
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

        if request.stream {
            body.insert("stream".into(), Value::Bool(true));
        }

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

        let blocks = response_json
            .get("content")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        let content_text = blocks
            .iter()
            .filter_map(|block| {
                (block.get("type").and_then(Value::as_str) == Some("text")).then(|| {
                    block
                        .get("text")
                        .and_then(Value::as_str)
                        .unwrap_or_default()
                        .to_string()
                })
            })
            .collect::<Vec<_>>()
            .join("");
        let tool_calls = blocks
            .iter()
            .filter_map(|block| {
                if block.get("type").and_then(Value::as_str) != Some("tool_use") { return None; }
                Some(serde_json::json!({
                    "id": block.get("id").cloned().unwrap_or(Value::Null),
                    "type": "function",
                    "function": {
                        "name": block.get("name").cloned().unwrap_or(Value::Null),
                        "arguments": serde_json::to_string(block.get("input").unwrap_or(&Value::Object(Default::default()))).unwrap_or_default()
                    }
                }))
            })
            .collect::<Vec<_>>();

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
                    tool_calls: (!tool_calls.is_empty()).then_some(tool_calls),
                    tool_call_id: None,
                },
                finish_reason: stop_reason,
            }],
            usage,
        })
    }

    fn complete_url(&self, api_base_override: Option<&str>, _model: &str) -> CoreResult<String> {
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
            .ok_or_else(|| CoreError::Auth("no API key: set ANTHROPIC_API_KEY env var".to_string()))
    }

    fn api_key_env(&self) -> &str {
        "ANTHROPIC_API_KEY"
    }

    fn supports_streaming(&self) -> bool {
        true
    }

    fn transform_stream_event(
        &self,
        _model: &str,
        event: Value,
    ) -> CoreResult<Vec<ChatCompletionChunk>> {
        let event_type = event
            .get("type")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let id = event
            .get("message")
            .and_then(|m| m.get("id"))
            .and_then(Value::as_str)
            .or_else(|| event.get("id").and_then(Value::as_str))
            .unwrap_or("chatcmpl-anthropic")
            .to_string();
        let created = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let mut chunk = ChatCompletionChunk {
            id,
            object: "chat.completion.chunk".to_string(),
            created,
            model: _model.to_string(),
            choices: vec![ChunkChoice {
                index: 0,
                delta: Delta::default(),
                finish_reason: None,
            }],
            usage: None,
        };

        match event_type {
            "content_block_start" => {
                let block = event.get("content_block").unwrap_or(&Value::Null);
                if block.get("type").and_then(Value::as_str) != Some("tool_use") {
                    return Ok(Vec::new());
                }
                let index = event.get("index").and_then(Value::as_u64).unwrap_or(0);
                chunk.choices[0].delta.tool_calls = Some(vec![ChunkToolCall {
                    index,
                    id: block.get("id").and_then(Value::as_str).map(String::from),
                    call_type: Some("function".to_string()),
                    function: Some(ChunkFunction {
                        name: block.get("name").and_then(Value::as_str).map(String::from),
                        arguments: Some(String::new()),
                    }),
                }]);
            }
            "content_block_delta" => {
                let delta = event.get("delta").unwrap_or(&Value::Null);
                let kind = delta
                    .get("type")
                    .and_then(Value::as_str)
                    .unwrap_or_default();
                if kind == "text_delta" {
                    chunk.choices[0].delta.content =
                        delta.get("text").and_then(Value::as_str).map(String::from);
                } else if kind == "input_json_delta" {
                    let index = event.get("index").and_then(Value::as_u64).unwrap_or(0);
                    chunk.choices[0].delta.tool_calls = Some(vec![ChunkToolCall {
                        index,
                        function: Some(ChunkFunction {
                            arguments: delta
                                .get("partial_json")
                                .and_then(Value::as_str)
                                .map(String::from),
                            ..Default::default()
                        }),
                        ..Default::default()
                    }]);
                } else {
                    return Ok(Vec::new());
                }
            }
            "message_delta" => {
                let delta = event.get("delta").unwrap_or(&Value::Null);
                chunk.choices[0].finish_reason = delta
                    .get("stop_reason")
                    .and_then(Value::as_str)
                    .map(|reason| match reason {
                        "end_turn" | "stop_sequence" => "stop".to_string(),
                        "max_tokens" => "length".to_string(),
                        "tool_use" => "tool_calls".to_string(),
                        other => other.to_string(),
                    });
                if let Some(usage) = event.get("usage") {
                    let input = usage
                        .get("input_tokens")
                        .and_then(Value::as_u64)
                        .unwrap_or(0);
                    let output = usage
                        .get("output_tokens")
                        .and_then(Value::as_u64)
                        .unwrap_or(0);
                    chunk.usage = Some(Usage {
                        prompt_tokens: input,
                        completion_tokens: output,
                        total_tokens: input + output,
                    });
                }
            }
            _ => return Ok(Vec::new()),
        }
        Ok(vec![chunk])
    }
}
