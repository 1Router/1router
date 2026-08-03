use serde_json::{Map, Value};

use crate::chat::transformation::{AuthStrategy, ChatProviderConfig};
use crate::types::{ChatCompletionRequest, ChatCompletionResponse};
use crate::CoreResult;

/// The OpenAI provider config. Also used as the default for any
/// OpenAI-compatible provider (DeepSeek, Qwen, Mistral, Meta via OpenRouter,
/// etc.) — those just need a different api_base + api_key_env.
pub const OPENAI_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.openai.com/v1",
    api_key_env: "OPENAI_API_KEY",
    keep_full_model_id: false,
};

/// DeepSeek — OpenAI-compatible API
pub const DEEPSEEK_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.deepseek.com/v1",
    api_key_env: "DEEPSEEK_API_KEY",
    keep_full_model_id: false,
};

/// Qwen (Alibaba DashScope) — OpenAI-compatible
pub const QWEN_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    api_key_env: "QWEN_API_KEY",
    keep_full_model_id: false,
};

/// Mistral AI — OpenAI-compatible
pub const MISTRAL_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.mistral.ai/v1",
    api_key_env: "MISTRAL_API_KEY",
    keep_full_model_id: false,
};

/// Together AI (hosts Meta, NousResearch, etc.) — OpenAI-compatible
pub const TOGETHER_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.together.xyz/v1",
    api_key_env: "TOGETHER_API_KEY",
    keep_full_model_id: false,
};

/// Groq (fast inference for Meta, etc.) — OpenAI-compatible
pub const GROQ_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.groq.com/openai/v1",
    api_key_env: "GROQ_API_KEY",
    keep_full_model_id: false,
};

/// Perplexity — OpenAI-compatible
pub const PERPLEXITY_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.perplexity.ai",
    api_key_env: "PERPLEXITY_API_KEY",
    keep_full_model_id: false,
};

/// NVIDIA NIM — OpenAI-compatible
pub const NVIDIA_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://integrate.api.nvidia.com/v1",
    api_key_env: "NVIDIA_API_KEY",
    keep_full_model_id: false,
};

/// Google AI Studio also exposes an OpenAI-compatible endpoint as a fallback.
/// Not used by the dispatch (we use the native Gemini config) but available.
pub const GOOGLE_OPENAI_COMPAT_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://generativelanguage.googleapis.com/v1beta/openai",
    api_key_env: "GOOGLE_API_KEY",
    keep_full_model_id: false,
};

/// Catch-all for providers that haven't been explicitly configured yet.
/// Routes to OpenRouter which supports many models via OpenAI-compatible API.
/// OpenRouter needs the full model id WITH the providerSlug/ prefix (e.g.
/// "minimaxai/minimax-01") so it knows which upstream to route to.
pub const OPENROUTER_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://openrouter.ai/api/v1",
    api_key_env: "OPENROUTER_API_KEY",
    keep_full_model_id: true,
};

pub struct OpenAiChatConfig {
    api_base: &'static str,
    api_key_env: &'static str,
    /// If true, keep the full model id (with providerSlug/ prefix) instead
    /// of stripping it. OpenRouter needs this to know which upstream to use.
    keep_full_model_id: bool,
}

impl ChatProviderConfig for OpenAiChatConfig {
    fn is_passthrough(&self) -> bool {
        // OpenAI-compatible providers use the same request/response format
        // as our clients send, so the gateway can skip JSON parsing and
        // stream raw bytes — the fast path.
        true
    }

    fn api_base(&self) -> &str {
        self.api_base
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
        // OpenAI is the native format — we just reconstruct the JSON with
        // the model name set. We pass through messages and all optional
        // params as-is.
        let mut body = serde_json::Map::new();
        body.insert("model".into(), Value::String(model.to_string()));
        body.insert(
            "messages".into(),
            serde_json::to_value(&request.messages)?,
        );
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
        // OpenAI's response is already in our normalized format.
        Ok(serde_json::from_value(response_json)?)
    }

    fn complete_url(
        &self,
        api_base_override: Option<&str>,
        _model: &str,
    ) -> CoreResult<String> {
        let base = api_base_override.unwrap_or(self.api_base);
        Ok(format!("{base}/chat/completions"))
    }

    fn resolve_api_key(
        &self,
        api_key: Option<&str>,
        env: &dyn Fn(&str) -> Option<String>,
    ) -> CoreResult<String> {
        api_key
            .map(|s| s.to_string())
            .or_else(|| env(self.api_key_env))
            .ok_or_else(|| {
                crate::CoreError::Auth(format!(
                    "no API key: set {} env var or pass via provider config",
                    self.api_key_env
                ))
            })
    }

    fn api_key_env(&self) -> &str {
        self.api_key_env
    }

    fn format_model_id(&self, full_id: &str) -> String {
        if self.keep_full_model_id {
            full_id.to_string()
        } else {
            full_id
                .split_once('/')
                .map(|(_, model)| model.to_string())
                .unwrap_or_else(|| full_id.to_string())
        }
    }
}
