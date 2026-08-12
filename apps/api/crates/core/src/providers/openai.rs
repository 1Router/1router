use serde_json::{Map, Value};

use crate::chat::transformation::{AuthStrategy, ChatProviderConfig};
use crate::types::{ChatCompletionRequest, ChatCompletionResponse};
use crate::CoreResult;

/// The OpenAI provider config. Direct OpenAI-compatible providers use the
/// same adapter with their own API base and credential environment variable.
pub const OPENAI_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.openai.com/v1",
    api_key_env: "OPENAI_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// DeepSeek — OpenAI-compatible API
pub const DEEPSEEK_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.deepseek.com/v1",
    api_key_env: "DEEPSEEK_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// Qwen (Alibaba DashScope) — OpenAI-compatible
pub const QWEN_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    api_key_env: "QWEN_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// Mistral AI — OpenAI-compatible
pub const MISTRAL_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.mistral.ai/v1",
    api_key_env: "MISTRAL_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// Together AI (hosts Meta, NousResearch, etc.) — OpenAI-compatible
pub const TOGETHER_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.together.xyz/v1",
    api_key_env: "TOGETHER_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// Groq (fast inference for Meta, etc.) — OpenAI-compatible
pub const GROQ_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.groq.com/openai/v1",
    api_key_env: "GROQ_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// Perplexity — OpenAI-compatible
pub const PERPLEXITY_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.perplexity.ai",
    api_key_env: "PERPLEXITY_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// NVIDIA NIM — OpenAI-compatible
pub const NVIDIA_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://integrate.api.nvidia.com/v1",
    api_key_env: "NVIDIA_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// Google AI Studio also exposes an OpenAI-compatible endpoint.
/// Not used by the dispatch (we use the native Gemini config) but available.
pub const GOOGLE_OPENAI_COMPAT_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://generativelanguage.googleapis.com/v1beta/openai",
    api_key_env: "GOOGLE_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// MiniMax — direct OpenAI-compatible API.
pub const MINIMAX_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.minimaxi.com/v1",
    api_key_env: "MINIMAX_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// Moonshot/Kimi — direct OpenAI-compatible API.
pub const MOONSHOT_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.moonshot.cn/v1",
    api_key_env: "MOONSHOT_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// StepFun — direct OpenAI-compatible API.
pub const STEPFUN_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.stepfun.com/v1",
    api_key_env: "STEPFUN_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// Z.ai/GLM — direct OpenAI-compatible API.
pub const ZAI_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://open.bigmodel.cn/api/paas/v4",
    api_key_env: "ZAI_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// ByteDance/Volcengine Ark — direct OpenAI-compatible API.
pub const BYTEDANCE_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://ark.cn-beijing.volces.com/api/v3",
    api_key_env: "ARK_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// Upstage — direct OpenAI-compatible API.
pub const UPSTAGE_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.upstage.ai/v1",
    api_key_env: "UPSTAGE_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// Abacus.AI — direct OpenAI-compatible API.
pub const ABACUS_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.abacus.ai/api/v0/openai",
    api_key_env: "ABACUS_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// Sarvam AI — direct OpenAI-compatible API.
pub const SARVAM_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "https://api.sarvam.ai/v1",
    api_key_env: "SARVAM_API_KEY",
    keep_full_model_id: false,
    api_base_env: None,
};

/// Azure OpenAI uses a deployment-specific endpoint. The base URL and API
/// version are deployment configuration rather than catalog metadata, so this
/// static adapter requires `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY`.
pub const AZURE_OPENAI_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "",
    api_key_env: "AZURE_OPENAI_API_KEY",
    keep_full_model_id: false,
    api_base_env: Some("AZURE_OPENAI_ENDPOINT"),
};

/// Operator-configured OpenAI-compatible deployment for catalog providers
/// without a standardized public endpoint. The deployment URL is supplied by
/// the operator; the gateway never falls back to another aggregator.
pub const STOCKMARK_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "",
    api_key_env: "STOCKMARK_API_KEY",
    keep_full_model_id: false,
    api_base_env: Some("STOCKMARK_API_BASE"),
};

pub const NEVERSLEEP_CHAT_CONFIG: OpenAiChatConfig = OpenAiChatConfig {
    api_base: "",
    api_key_env: "NEVERSLEEP_API_KEY",
    keep_full_model_id: false,
    api_base_env: Some("NEVERSLEEP_API_BASE"),
};

pub struct OpenAiChatConfig {
    api_base: &'static str,
    api_key_env: &'static str,
    api_base_env: Option<&'static str>,
    /// If true, keep the full model id instead of stripping the catalog's
    /// provider prefix. This is available for explicitly configured custom
    /// deployments, but direct providers normally use only their model ID.
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
        if self.api_base_env == Some("AZURE_OPENAI_ENDPOINT") {
            AuthStrategy::Header("api-key")
        } else {
            AuthStrategy::Bearer
        }
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
        // OpenAI's response is already in our normalized format.
        Ok(serde_json::from_value(response_json)?)
    }

    fn complete_url(&self, api_base_override: Option<&str>, model: &str) -> CoreResult<String> {
        let base = if let Some(override_base) = api_base_override {
            override_base.to_string()
        } else if !self.api_base.is_empty() {
            self.api_base.to_string()
        } else {
            let env_var = self.api_base_env.ok_or_else(|| {
                crate::CoreError::Config("provider API base URL is not configured".to_string())
            })?;
            std::env::var(env_var)
                .map_err(|_| crate::CoreError::Config(format!("{env_var} is required")))?
        };

        if self.api_base.is_empty() && self.api_base_env == Some("AZURE_OPENAI_ENDPOINT") {
            let api_version = std::env::var("AZURE_OPENAI_API_VERSION")
                .unwrap_or_else(|_| "2024-10-21".to_string());
            Ok(format!(
                "{base}/openai/deployments/{model}/chat/completions?api-version={api_version}"
            ))
        } else if self.api_base.is_empty() {
            Ok(format!("{base}/chat/completions"))
        } else {
            Ok(format!("{base}/chat/completions"))
        }
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
