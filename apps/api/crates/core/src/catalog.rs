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
    /// Exact upstream model ID when the public router ID uses a different
    /// namespace (for example, NVIDIA-hosted `meta/...` models).
    #[serde(rename = "upstreamModel", default)]
    pub upstream_model: Option<String>,
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
    /// Returns the exact model identifier expected by the upstream provider.
    ///
    /// Most direct providers want the catalog's model suffix, e.g.
    /// `openai/gpt-4o` → `gpt-4o`. NVIDIA's NIM catalog expects its
    /// publisher-qualified IDs, while hosted publisher models can override
    /// the value with `upstreamModel` (e.g. `meta/muse-glimmer-30b`).
    pub fn provider_model_id(&self) -> &str {
        if let Some(upstream_model) = self.upstream_model.as_deref() {
            return upstream_model;
        }

        if self.provider_slug == "nvidia" {
            return &self.id;
        }

        self.id
            .split_once('/')
            .map(|(_, model)| model)
            .unwrap_or(&self.id)
    }
}

#[cfg(test)]
mod tests {
    use super::{load, CatalogModel};

    fn model(id: &str, provider_slug: &str, upstream_model: Option<&str>) -> CatalogModel {
        CatalogModel {
            id: id.to_string(),
            name: "test".to_string(),
            provider: "test".to_string(),
            provider_slug: provider_slug.to_string(),
            upstream_model: upstream_model.map(str::to_string),
            series: "test".to_string(),
            context_length: 8192,
        }
    }

    #[test]
    fn uses_explicit_upstream_id_for_publisher_hosted_nvidia_model() {
        let model = model(
            "nvidia/muse-glimmer-30b",
            "nvidia",
            Some("meta/muse-glimmer-30b"),
        );
        assert_eq!(model.provider_model_id(), "meta/muse-glimmer-30b");
    }

    #[test]
    fn preserves_publisher_qualified_nvidia_model_ids() {
        let model = model("nvidia/nemotron-3-ultra-550b-a55b", "nvidia", None);
        assert_eq!(
            model.provider_model_id(),
            "nvidia/nemotron-3-ultra-550b-a55b"
        );
    }

    #[test]
    fn strips_namespace_for_other_direct_providers() {
        let model = model("openai/gpt-4o", "openai", None);
        assert_eq!(model.provider_model_id(), "gpt-4o");
    }

    #[test]
    fn embedded_catalog_contains_the_nvidia_muse_mapping() {
        let model = load()
            .into_iter()
            .find(|model| model.id == "nvidia/muse-glimmer-30b")
            .expect("NVIDIA Muse Glimmer should be in the embedded catalog");
        assert_eq!(model.provider_slug, "nvidia");
        assert_eq!(model.provider_model_id(), "meta/muse-glimmer-30b");
    }
}

/// Find a model by its id (e.g. "openai/gpt-4o").
pub fn find<'a>(models: &'a [CatalogModel], model_id: &str) -> Option<&'a CatalogModel> {
    models.iter().find(|m| m.id == model_id)
}
