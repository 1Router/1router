use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Debug, Deserialize)]
pub struct Deployment {
    #[serde(rename = "providerSlug")]
    pub provider_slug: String,
    #[serde(rename = "upstreamModel", default)]
    pub upstream_model: Option<String>,
    #[serde(rename = "apiBase", default)]
    pub api_base: Option<String>,
    #[serde(default = "default_weight")]
    pub weight: u32,
}

fn default_weight() -> u32 {
    1
}

#[derive(Clone, Debug, Default, Serialize)]
pub struct HealthRecord {
    pub failures: u32,
    pub cooldown_until_ms: u128,
    pub last_status: Option<u16>,
    pub last_latency_ms: Option<u128>,
    pub successes: u64,
}

impl HealthRecord {
    pub fn is_available(&self) -> bool {
        self.cooldown_until_ms <= now_ms()
    }
}

pub fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

pub fn load_deployments() -> HashMap<String, Vec<Deployment>> {
    let raw = match std::env::var("ROUTER_DEPLOYMENTS_JSON") {
        Ok(value) if !value.trim().is_empty() => value,
        _ => return HashMap::new(),
    };

    match serde_json::from_str::<HashMap<String, Vec<Deployment>>>(&raw) {
        Ok(deployments) => deployments
            .into_iter()
            .map(|(model, values)| {
                (
                    model,
                    values
                        .into_iter()
                        .filter(|deployment| {
                            !deployment.provider_slug.is_empty() && deployment.weight > 0
                        })
                        .collect(),
                )
            })
            .collect(),
        Err(error) => {
            tracing::error!("invalid ROUTER_DEPLOYMENTS_JSON: {error}");
            HashMap::new()
        }
    }
}
