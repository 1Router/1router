use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Incoming chat completions request (OpenAI format).
/// Fields beyond these are passed through as optional params.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(default)]
    pub stream: bool,
    #[serde(default)]
    pub temperature: Option<f64>,
    #[serde(default)]
    pub max_tokens: Option<u64>,
    #[serde(default)]
    pub top_p: Option<f64>,
    #[serde(default)]
    pub stop: Option<Value>,
    #[serde(default)]
    pub tools: Option<Value>,
    #[serde(default)]
    pub tool_choice: Option<Value>,
    /// Catch-all for any other OpenAI params we haven't typed yet.
    /// These get passed through to the provider as optional params.
    #[serde(flatten)]
    pub extra: serde_json::Map<String, Value>,
}

impl ChatCompletionRequest {
    /// Collect all optional (non-required) params into a single map for
    /// the provider transform layer.
    pub fn optional_params(&self) -> serde_json::Map<String, Value> {
        let mut params = serde_json::Map::new();

        if let Some(t) = self.temperature {
            params.insert("temperature".into(), t.into());
        }
        if let Some(m) = self.max_tokens {
            params.insert("max_tokens".into(), m.into());
        }
        if let Some(p) = self.top_p {
            params.insert("top_p".into(), p.into());
        }
        if let Some(ref s) = self.stop {
            params.insert("stop".into(), s.clone());
        }
        if let Some(ref t) = self.tools {
            params.insert("tools".into(), t.clone());
        }
        if let Some(ref tc) = self.tool_choice {
            params.insert("tool_choice".into(), tc.clone());
        }

        // Merge any extra passthrough params
        for (k, v) in &self.extra {
            // Don't double-insert if we already have it
            if !params.contains_key(k) {
                params.insert(k.clone(), v.clone());
            }
        }

        params
    }
}

/// A single message in the conversation (OpenAI format).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    #[serde(default)]
    pub content: Value,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<Value>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
}

/// Normalized chat completion response (OpenAI format).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionResponse {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<Choice>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Choice {
    pub index: u64,
    pub message: ChatMessage,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Usage {
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub total_tokens: u64,
}

/// A single SSE chunk in the streaming response (OpenAI format).
#[derive(Debug, Clone, Serialize)]
pub struct ChatCompletionChunk {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<ChunkChoice>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChunkChoice {
    pub index: u64,
    pub delta: Delta,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct Delta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
}
