pub mod anthropic;
pub mod google;
pub mod openai;
pub mod xai;

use crate::catalog::CatalogModel;
use crate::chat::transformation::ChatProviderConfig;

/// Dispatch: given a model's providerSlug, return the right provider config.
///
/// This is the single point where model → provider routing happens.
/// The gateway calls this, gets a `&dyn ChatProviderConfig`, and uses it
/// to transform + proxy the request.
pub fn config_for_slug(slug: &str) -> Option<&'static dyn ChatProviderConfig> {
    match slug {
        // Native providers with dedicated transform configs
        "openai" => Some(&openai::OPENAI_CHAT_CONFIG),
        "anthropic" => Some(&anthropic::ANTHROPIC_CHAT_CONFIG),
        "google" => Some(&google::GOOGLE_CHAT_CONFIG),
        "xai" => Some(&xai::XAI_CHAT_CONFIG),

        // OpenAI-compatible providers — each with its own direct base URL + key
        "deepseek-ai" => Some(&openai::DEEPSEEK_CHAT_CONFIG),
        "qwen" => Some(&openai::QWEN_CHAT_CONFIG),
        "mistralai" => Some(&openai::MISTRAL_CHAT_CONFIG),
        "perplexity" => Some(&openai::PERPLEXITY_CHAT_CONFIG),
        "nvidia" => Some(&openai::NVIDIA_CHAT_CONFIG),
        "minimaxai" => Some(&openai::MINIMAX_CHAT_CONFIG),
        "moonshotai" => Some(&openai::MOONSHOT_CHAT_CONFIG),
        "stepfun-ai" => Some(&openai::STEPFUN_CHAT_CONFIG),
        "z-ai" => Some(&openai::ZAI_CHAT_CONFIG),
        "bytedance" => Some(&openai::BYTEDANCE_CHAT_CONFIG),
        "upstage" => Some(&openai::UPSTAGE_CHAT_CONFIG),
        "abacusai" => Some(&openai::ABACUS_CHAT_CONFIG),
        "sarvamai" => Some(&openai::SARVAM_CHAT_CONFIG),
        "microsoft" => Some(&openai::AZURE_OPENAI_CHAT_CONFIG),
        "stockmark" => Some(&openai::STOCKMARK_CHAT_CONFIG),
        "neversleep" => Some(&openai::NEVERSLEEP_CHAT_CONFIG),

        // Meta / NousResearch are served via Groq or Together — default to
        // Groq for low latency. Override via an explicit provider deployment
        // when the model is available from another direct provider.
        "meta" | "nousresearch" => Some(&openai::GROQ_CHAT_CONFIG),

        // Every other catalog provider must have a direct adapter. Do not
        // silently route an unknown provider through another gateway.
        _ => None,
    }
}

/// Return all provider slugs that have a provider config. Used at
/// startup to pre-warm key checks.
pub fn supported_slugs() -> &'static [&'static str] {
    &[
        "openai",
        "anthropic",
        "google",
        "xai",
        "deepseek-ai",
        "qwen",
        "mistralai",
        "perplexity",
        "nvidia",
        "minimaxai",
        "moonshotai",
        "stepfun-ai",
        "z-ai",
        "bytedance",
        "upstage",
        "abacusai",
        "sarvamai",
        "microsoft",
        "stockmark",
        "neversleep",
        "meta",
        "nousresearch",
    ]
}

/// Look up the provider config for a specific catalog model.
pub fn config_for_model(model: &CatalogModel) -> Option<&'static dyn ChatProviderConfig> {
    config_for_slug(&model.provider_slug)
}
