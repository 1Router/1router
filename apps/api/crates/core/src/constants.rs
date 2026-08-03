/// Default upstream request timeout in seconds.
pub const DEFAULT_TIMEOUT_SECS: u64 = 120;

/// Default streaming idle timeout in seconds (no chunks for this long = close).
pub const DEFAULT_STREAM_IDLE_SECS: u64 = 300;

/// SSE line prefix for data events.
pub const SSE_DATA_PREFIX: &str = "data: ";

/// SSE stream terminator.
pub const SSE_DONE: &str = "data: [DONE]\n\n";

/// OpenAI-compatible chat completions endpoint path.
pub const CHAT_COMPLETIONS_PATH: &str = "/v1/chat/completions";

/// OpenAI-compatible models list endpoint path.
pub const MODELS_PATH: &str = "/v1/models";

/// Health check endpoint path.
pub const HEALTHZ_PATH: &str = "/healthz";
