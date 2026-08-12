use serde_json::{Map, Value};

use crate::chat::transformation::{AuthStrategy, ChatProviderConfig};
use crate::types::{
    ChatCompletionChunk, ChatCompletionRequest, ChatCompletionResponse, ChunkChoice, ChunkFunction,
    ChunkToolCall, Delta, Usage,
};
use crate::{ChatMessage, CoreError, CoreResult};

/// Google AI Studio (Gemini) config.
/// Uses the generateContent endpoint with x-goog-api-key auth.
pub const GOOGLE_CHAT_CONFIG: GoogleChatConfig = GoogleChatConfig;

pub struct GoogleChatConfig;

impl ChatProviderConfig for GoogleChatConfig {
    fn api_base(&self) -> &str {
        "https://generativelanguage.googleapis.com/v1beta"
    }

    fn auth_strategy(&self) -> AuthStrategy {
        AuthStrategy::Header("x-goog-api-key")
    }

    fn transform_request(
        &self,
        _model: &str,
        request: &ChatCompletionRequest,
        optional_params: &Map<String, Value>,
    ) -> CoreResult<Value> {
        let mut system_instruction: Option<Value> = None;
        let mut contents: Vec<Value> = Vec::new();

        for msg in &request.messages {
            let role = match msg.role.as_str() {
                "system" => {
                    // Google uses a separate systemInstruction field
                    let text = msg.content.as_str().unwrap_or("");
                    system_instruction = Some(serde_json::json!({
                        "parts": [{ "text": text }]
                    }));
                    continue;
                }
                "assistant" => "model",
                "user" | _ => "user",
            };

            // Extract text content from the message
            let text = if let Some(s) = msg.content.as_str() {
                s.to_string()
            } else {
                serde_json::to_string(&msg.content)?
            };

            contents.push(serde_json::json!({
                "role": role,
                "parts": [{ "text": text }]
            }));
        }

        let mut body = serde_json::Map::new();
        body.insert("contents".into(), Value::Array(contents));

        if let Some(si) = system_instruction {
            body.insert("systemInstruction".into(), si);
        }

        // Map optional params to Google's generationConfig
        let mut gen_config = serde_json::Map::new();
        if let Some(t) = optional_params.get("temperature") {
            gen_config.insert("temperature".into(), t.clone());
        }
        if let Some(m) = optional_params.get("max_tokens") {
            gen_config.insert("maxOutputTokens".into(), m.clone());
        }
        if let Some(p) = optional_params.get("top_p") {
            gen_config.insert("topP".into(), p.clone());
        }
        if let Some(s) = optional_params.get("stop") {
            gen_config.insert("stopSequences".into(), s.clone());
        }
        if !gen_config.is_empty() {
            body.insert("generationConfig".into(), Value::Object(gen_config));
        }

        if let Some(tools) = optional_params.get("tools").and_then(Value::as_array) {
            let declarations: Vec<Value> = tools
                .iter()
                .filter_map(|tool| tool.get("function").cloned())
                .collect();
            if !declarations.is_empty() {
                body.insert(
                    "tools".into(),
                    serde_json::json!([{ "functionDeclarations": declarations }]),
                );
            }
        }

        Ok(Value::Object(body))
    }

    fn transform_response(
        &self,
        model: &str,
        response_json: Value,
    ) -> CoreResult<ChatCompletionResponse> {
        // Google response format:
        // { "candidates": [{ "content": { "parts": [{"text":"..."}], "role":"model" },
        //                    "finishReason": "STOP" }] }
        let candidates = response_json
            .get("candidates")
            .and_then(|c| c.as_array())
            .ok_or_else(|| CoreError::InvalidResponse("missing candidates array".into()))?;

        let first = candidates
            .first()
            .ok_or_else(|| CoreError::InvalidResponse("empty candidates array".into()))?;

        let parts = first
            .get("content")
            .and_then(|content| content.get("parts"))
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        let text = parts
            .iter()
            .filter_map(|part| part.get("text").and_then(Value::as_str).map(String::from))
            .collect::<Vec<_>>()
            .join("");
        let tool_calls = parts
            .iter()
            .filter_map(|part| {
                let call = part.get("functionCall")?;
                Some(serde_json::json!({
                    "type": "function",
                    "function": {
                        "name": call.get("name").cloned().unwrap_or(Value::Null),
                        "arguments": serde_json::to_string(call.get("args").unwrap_or(&Value::Object(Default::default()))).unwrap_or_default()
                    }
                }))
            })
            .collect::<Vec<_>>();

        let finish_reason = first
            .get("finishReason")
            .and_then(|f| f.as_str())
            .map(|s| match s {
                "STOP" => "stop".to_string(),
                "MAX_TOKENS" => "length".to_string(),
                "SAFETY" => "content_filter".to_string(),
                other => other.to_lowercase(),
            });

        let usage = response_json.get("usageMetadata").map(|u| {
            let prompt = u
                .get("promptTokenCount")
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
            let completion = u
                .get("candidatesTokenCount")
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
            Usage {
                prompt_tokens: prompt,
                completion_tokens: completion,
                total_tokens: prompt + completion,
            }
        });

        let id = format!(
            "chatcmpl-{}",
            response_json
                .get("responseId")
                .and_then(|v| v.as_str())
                .unwrap_or("google")
        );

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
                    content: Value::String(text),
                    name: None,
                    tool_calls: (!tool_calls.is_empty()).then_some(tool_calls),
                    tool_call_id: None,
                },
                finish_reason,
            }],
            usage,
        })
    }

    fn complete_url(&self, api_base_override: Option<&str>, model: &str) -> CoreResult<String> {
        let base = api_base_override.unwrap_or(self.api_base());
        // Google's endpoint is model-specific: /models/{model}:generateContent
        Ok(format!("{base}/models/{model}:generateContent"))
    }

    fn resolve_api_key(
        &self,
        api_key: Option<&str>,
        env: &dyn Fn(&str) -> Option<String>,
    ) -> CoreResult<String> {
        api_key
            .map(|s| s.to_string())
            .or_else(|| env("GOOGLE_API_KEY"))
            .ok_or_else(|| CoreError::Auth("no API key: set GOOGLE_API_KEY env var".to_string()))
    }

    fn api_key_env(&self) -> &str {
        "GOOGLE_API_KEY"
    }

    fn streaming_url(&self, api_base_override: Option<&str>, model: &str) -> CoreResult<String> {
        let base = api_base_override.unwrap_or(self.api_base());
        Ok(format!(
            "{base}/models/{model}:streamGenerateContent?alt=sse"
        ))
    }

    fn supports_streaming(&self) -> bool {
        true
    }

    fn transform_stream_event(
        &self,
        model: &str,
        event: Value,
    ) -> CoreResult<Vec<ChatCompletionChunk>> {
        let candidate = event
            .get("candidates")
            .and_then(Value::as_array)
            .and_then(|items| items.first())
            .unwrap_or(&Value::Null);
        let parts = candidate
            .get("content")
            .and_then(|content| content.get("parts"))
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        let mut delta = Delta::default();
        let mut tool_calls = Vec::new();
        for (index, part) in parts.iter().enumerate() {
            if let Some(text) = part.get("text").and_then(Value::as_str) {
                delta.content = Some(text.to_string());
            }
            if let Some(call) = part.get("functionCall") {
                tool_calls.push(ChunkToolCall {
                    index: index as u64,
                    call_type: Some("function".to_string()),
                    function: Some(ChunkFunction {
                        name: call.get("name").and_then(Value::as_str).map(String::from),
                        arguments: call
                            .get("args")
                            .map(|args| serde_json::to_string(args).unwrap_or_default()),
                    }),
                    ..Default::default()
                });
            }
        }
        if !tool_calls.is_empty() {
            delta.tool_calls = Some(tool_calls);
        }
        let finish_reason = candidate
            .get("finishReason")
            .and_then(Value::as_str)
            .map(|reason| match reason {
                "STOP" => "stop".to_string(),
                "MAX_TOKENS" => "length".to_string(),
                "SAFETY" => "content_filter".to_string(),
                other => other.to_lowercase(),
            });
        let usage = event.get("usageMetadata").map(|u| {
            let prompt = u
                .get("promptTokenCount")
                .and_then(Value::as_u64)
                .unwrap_or(0);
            let completion = u
                .get("candidatesTokenCount")
                .and_then(Value::as_u64)
                .unwrap_or(0);
            Usage {
                prompt_tokens: prompt,
                completion_tokens: completion,
                total_tokens: prompt + completion,
            }
        });
        if delta.content.is_none()
            && delta.tool_calls.is_none()
            && finish_reason.is_none()
            && usage.is_none()
        {
            return Ok(Vec::new());
        }
        Ok(vec![ChatCompletionChunk {
            id: format!(
                "chatcmpl-google-{}",
                event
                    .get("responseId")
                    .and_then(Value::as_str)
                    .unwrap_or("stream")
            ),
            object: "chat.completion.chunk".to_string(),
            created: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0),
            model: model.to_string(),
            choices: vec![ChunkChoice {
                index: 0,
                delta,
                finish_reason,
            }],
            usage,
        }])
    }
}
