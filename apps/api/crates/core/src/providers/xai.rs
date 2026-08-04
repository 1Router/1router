use serde_json::{Map, Value};

use crate::chat::transformation::{AuthStrategy, ChatProviderConfig};
use crate::types::{ChatCompletionRequest, ChatCompletionResponse};
use crate::CoreError;
use crate::CoreResult;

/// xAI (Grok) config.
/// xAI exposes an OpenAI-compatible endpoint, so we reuse the OpenAI
/// transform logic with a different base URL and key env var.
pub const XAI_CHAT_CONFIG: XaiChatConfig = XaiChatConfig;

pub struct XaiChatConfig;

impl ChatProviderConfig for XaiChatConfig {
    fn api_base(&self) -> &str {
        "https://api.x.ai/v1"
    }

    fn auth_strategy(&self) -> AuthStrategy {
        AuthStrategy::Bearer
    }

    fn transform_request(
        &self,
        model: &str,
        request: &ChatCompletionRequest,
        optional_params: &Map<String, Value>,
    ) -> CoreResult<Value> {
        // xAI is OpenAI-compatible — same transform
        let mut body = serde_json::Map::new();
        body.insert("model".into(), Value::String(model.to_string()));
        body.insert("messages".into(), serde_json::to_value(&request.messages)?);
        body.insert("stream".into(), Value::Bool(request.stream));

        for (k, v) in optional_params {
            body.insert(k.clone(), v.clone());
        }

        Ok(Value::Object(body))
    }

    fn transform_response(
        &self,
        _model: &str,
        response_json: Value,
    ) -> CoreResult<ChatCompletionResponse> {
        // OpenAI-compatible response
        Ok(serde_json::from_value(response_json)?)
    }

    fn complete_url(&self, api_base_override: Option<&str>, _model: &str) -> CoreResult<String> {
        let base = api_base_override.unwrap_or(self.api_base());
        Ok(format!("{base}/chat/completions"))
    }

    fn resolve_api_key(
        &self,
        api_key: Option<&str>,
        env: &dyn Fn(&str) -> Option<String>,
    ) -> CoreResult<String> {
        api_key
            .map(|s| s.to_string())
            .or_else(|| env("XAI_API_KEY"))
            .ok_or_else(|| CoreError::Auth("no API key: set XAI_API_KEY env var".to_string()))
    }

    fn api_key_env(&self) -> &str {
        "XAI_API_KEY"
    }
}
