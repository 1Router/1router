use std::collections::HashMap;
use std::sync::Arc;

use crate::catalog::CatalogModel;
use crate::chat::transformation::ChatProviderConfig;
use crate::CoreError;

/// The result of resolving a model id through the catalog + provider registry.
/// `model` is an Arc so it's cheap to hold (refcount increment, no heap clone).
pub struct ResolvedRoute {
    pub model: Arc<CatalogModel>,
    pub provider: &'static dyn ChatProviderConfig,
}

/// Resolve a model id (e.g. "openai/gpt-4o") to its catalog entry and
/// the matching provider config. Uses a pre-built HashMap for O(1) lookup.
///
/// This is the single entry point the gateway calls before proxying.
pub fn resolve(
    model_index: &HashMap<String, Arc<CatalogModel>>,
    model_id: &str,
) -> Result<ResolvedRoute, CoreError> {
    let model = model_index
        .get(model_id)
        .ok_or_else(|| CoreError::ModelNotFound(model_id.to_string()))?;

    let provider = crate::providers::config_for_slug(&model.provider_slug)
        .ok_or_else(|| CoreError::ProviderNotSupported(model.provider_slug.clone()))?;

    Ok(ResolvedRoute {
        model: Arc::clone(model),
        provider,
    })
}
