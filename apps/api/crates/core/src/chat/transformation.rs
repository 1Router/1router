use serde_json::{Map, Value};

use crate::types::{ChatCompletionRequest, ChatCompletionResponse};
use crate::CoreResult;

/// How the upstream API expects credentials.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AuthStrategy {
    /// `Authorization: Bearer <key>` (OpenAI, Anthropic, most providers)
    Bearer,
    /// `x-goog-api-key: <key>` (Google AI Studio)
    Header(&'static str),
}

impl AuthStrategy {
    pub fn header_name(self) -> &'static str {
        match self {
            Self::Bearer => "authorization",
            Self::Header(name) => name,
        }
    }

    pub fn header_value(self, key: &str) -> String {
        match self {
            Self::Bearer => format!("Bearer {key}"),
            Self::Header(_) => key.to_string(),
        }
    }
}

/// The core trait every chat provider implements.
///
/// Each provider config is a `const` (zero-cost dispatch) that translates
/// between the OpenAI format our clients send and the provider's native
/// format. The gateway (I/O layer) calls these methods — the core crate
/// never touches the network.
pub trait ChatProviderConfig: Sync {
    /// Provider-specific API base URL (e.g. "https://api.openai.com/v1").
    fn api_base(&self) -> &str;

    /// How this provider expects credentials in the request.
    fn auth_strategy(&self) -> AuthStrategy {
        AuthStrategy::Bearer
    }

    /// Transform an OpenAI-format request into the provider's native format.
    /// Returns the JSON body to send to the upstream API.
    fn transform_request(
        &self,
        model: &str,
        request: &ChatCompletionRequest,
        optional_params: &Map<String, Value>,
    ) -> CoreResult<Value>;

    /// Transform the upstream response into our normalized OpenAI format.
    fn transform_response(
        &self,
        model: &str,
        response_json: Value,
    ) -> CoreResult<ChatCompletionResponse>;

    /// Build the full URL for the upstream request.
    /// `api_base_override` lets the caller point at a different endpoint
    /// (e.g. a self-hosted OpenAI-compatible server).
    fn complete_url(&self, api_base_override: Option<&str>, model: &str) -> CoreResult<String>;

    /// Resolve the API key: explicit param takes priority, then env var.
    fn resolve_api_key(
        &self,
        api_key: Option<&str>,
        env: &dyn Fn(&str) -> Option<String>,
    ) -> CoreResult<String>;

    /// The env var name for this provider's API key (e.g. "OPENAI_API_KEY").
    fn api_key_env(&self) -> &str;

    /// Format the model identifier for the upstream request body.
    /// Most providers want just the model name without the provider slug
    /// prefix (e.g. "gpt-4o"). Aggregators like OpenRouter want the full
    /// prefixed ID (e.g. "minimaxai/minimax-01") so they know which
    /// upstream to route to.
    /// Default: strip the `providerSlug/` prefix.
    fn format_model_id(&self, full_id: &str) -> String {
        full_id
            .split_once('/')
            .map(|(_, model)| model.to_string())
            .unwrap_or_else(|| full_id.to_string())
    }

    /// Whether this provider is a pure passthrough — its request and
    /// response formats are already OpenAI-compatible, so the gateway can
    /// skip JSON parsing/serialization entirely and stream raw bytes.
    /// This is the fast path: no transform_request, no transform_response,
    /// no serde deserialization. Just forward bytes.
    fn is_passthrough(&self) -> bool {
        false
    }

    /// Whether the upstream supports SSE streaming natively.
    /// If false, the gateway will fake-stream by emitting the full response
    /// as a single chunk.
    fn supports_streaming(&self) -> bool {
        true
    }

    /// Extra headers the provider requires (e.g. anthropic-version).
    /// Returns an empty vec by default; providers override as needed.
    fn extra_headers(&self) -> Vec<(&'static str, &'static str)> {
        Vec::new()
    }
}
