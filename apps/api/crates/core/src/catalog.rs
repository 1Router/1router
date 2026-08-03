use serde::Deserialize;

/// Minimal model entry from the shared catalog. Only the fields the API
/// needs for routing — the site uses the full typed catalog in @1router/models.
#[derive(Debug, Clone, Deserialize)]
pub struct CatalogModel {
    pub id: String,
    pub name: String,
    pub provider: String,
    #[serde(rename = "providerSlug")]
    pub provider_slug: String,
    pub series: String,
    #[serde(rename = "contextLength")]
    pub context_length: u64,
}

#[derive(Debug, Deserialize)]
struct CatalogFile {
    models: Vec<CatalogModel>,
}

/// The shared catalog, embedded at compile time via include_str!.
/// A build.rs script copies packages/models/models.json into the crate
/// before cargo runs, so the binary stays in lock-step with the site.
const CATALOG_JSON: &str = include_str!("../catalog/models.json");

/// Load the catalog from the embedded JSON. Panics at startup if the
/// embedded file is malformed — that's a build-time bug, not a runtime
/// error we want to recover from.
pub fn load() -> Vec<CatalogModel> {
    let file: CatalogFile = serde_json::from_str(CATALOG_JSON)
        .expect("failed to parse embedded models.json — the catalog is corrupt");
    file.models
}

impl CatalogModel {
    /// Returns the model identifier without the provider slug prefix.
    /// e.g. "openai/gpt-4o" → "gpt-4o"
    /// This is what gets sent to the upstream provider API.
    pub fn provider_model_id(&self) -> &str {
        self.id
            .split_once('/')
            .map(|(_, model)| model)
            .unwrap_or(&self.id)
    }
}

/// Find a model by its id (e.g. "openai/gpt-4o").
pub fn find<'a>(models: &'a [CatalogModel], model_id: &str) -> Option<&'a CatalogModel> {
    models.iter().find(|m| m.id == model_id)
}
