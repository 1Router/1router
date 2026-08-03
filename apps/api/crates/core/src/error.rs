use thiserror::Error;

pub type CoreResult<T> = Result<T, CoreError>;

#[derive(Debug, Error)]
pub enum CoreError {
    #[error("model not found in catalog: {0}")]
    ModelNotFound(String),

    #[error("provider not supported: {0}")]
    ProviderNotSupported(String),

    #[error("missing required field: {0}")]
    MissingField(&'static str),

    #[error("invalid request: {0}")]
    InvalidRequest(String),

    #[error("invalid response from upstream: {0}")]
    InvalidResponse(String),

    #[error("upstream returned status {status}: {body}")]
    UpstreamError { status: u16, body: String },

    #[error("authentication failed: {0}")]
    Auth(String),

    #[error("network error: {0}")]
    Network(String),

    #[error("streaming error: {0}")]
    Streaming(String),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),
}
