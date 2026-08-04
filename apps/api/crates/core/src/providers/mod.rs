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

        // OpenAI-compatible providers — each with its own base URL + key
        "deepseek-ai" => Some(&openai::DEEPSEEK_CHAT_CONFIG),
        "qwen" => Some(&openai::QWEN_CHAT_CONFIG),
        "mistralai" => Some(&openai::MISTRAL_CHAT_CONFIG),
        "perplexity" => Some(&openai::PERPLEXITY_CHAT_CONFIG),
        "nvidia" => Some(&openai::NVIDIA_CHAT_CONFIG),

        // Meta / NousResearch are served via Groq or Together — default to
        // Groq for low latency. Override via env if needed.
        "meta" | "nousresearch" => Some(&openai::GROQ_CHAT_CONFIG),

        // Fall through to OpenRouter for less-common providers that haven't
        // been given an explicit endpoint yet. OpenRouter aggregates many
        // models behind an OpenAI-compatible API.
        "minimaxai" | "moonshotai" | "stepfun-ai" | "z-ai" | "bytedance" | "microsoft"
        | "upstage" | "abacusai" | "stockmark" | "sarvamai" | "neversleep" => {
            Some(&openai::OPENROUTER_CHAT_CONFIG)
        }

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
        "meta",
        "nousresearch",
        "minimaxai",
        "moonshotai",
        "stepfun-ai",
        "z-ai",
        "bytedance",
        "microsoft",
        "upstage",
        "abacusai",
        "stockmark",
        "sarvamai",
        "neversleep",
    ]
}

/// Look up the provider config for a specific catalog model.
pub fn config_for_model(model: &CatalogModel) -> Option<&'static dyn ChatProviderConfig> {
    config_for_slug(&model.provider_slug)
}
