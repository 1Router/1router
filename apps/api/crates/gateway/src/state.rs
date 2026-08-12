use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use onerouter_core::catalog::CatalogModel;
use onerouter_core::constants;
use onerouter_core::providers;
use sha2::{Digest, Sha256};
use tokio::sync::RwLock;

use crate::routing::{self, Deployment, HealthRecord};

#[derive(Clone)]
pub struct AppState {
    pub model_index: Arc<HashMap<String, Arc<CatalogModel>>>,
    pub client: reqwest::Client,
    pub provider_keys: Arc<HashMap<String, Arc<str>>>,
    pub master_key_hash: Option<[u8; 32]>,
    pub identity_secret: Option<Arc<str>>,
    pub deployments: Arc<HashMap<String, Vec<Deployment>>>,
    pub health: Arc<RwLock<HashMap<String, HealthRecord>>>,
    pub selection_counter: Arc<AtomicU64>,
    pub max_retries: u32,
    pub requests_total: Arc<AtomicU64>,
    pub requests_success: Arc<AtomicU64>,
    pub requests_failure: Arc<AtomicU64>,
    pub latency_ms_total: Arc<AtomicU64>,
}

impl AppState {
    pub fn new(models: Vec<CatalogModel>) -> Self {
        let model_index: HashMap<String, Arc<CatalogModel>> = models
            .into_iter()
            .map(|model| {
                let id = model.id.clone();
                (id, Arc::new(model))
            })
            .collect();

        let client = reqwest::Client::builder()
            .pool_max_idle_per_host(64)
            .pool_idle_timeout(Duration::from_secs(90))
            .tcp_nodelay(true)
            .tcp_keepalive(Duration::from_secs(60))
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(constants::DEFAULT_TIMEOUT_SECS))
            .build()
            .expect("failed to build HTTP client");

        let master_key_hash = std::env::var("ROUTER_API_KEY")
            .ok()
            .filter(|value| !value.is_empty())
            .map(|key| {
                let digest = Sha256::digest(key.as_bytes());
                let mut hash = [0u8; 32];
                hash.copy_from_slice(&digest);
                hash
            });

        let identity_secret = std::env::var("ROUTER_IDENTITY_SECRET")
            .ok()
            .filter(|value| !value.is_empty())
            .map(|value| Arc::from(value.as_str()));

        if identity_secret.is_none() {
            tracing::warn!(
                "no ROUTER_IDENTITY_SECRET configured — gateway identity assertions are disabled"
            );
        }
        if master_key_hash.is_none() {
            tracing::warn!(
                "no ROUTER_API_KEY env var set — authenticated requests will be rejected"
            );
        }

        let mut provider_keys: HashMap<String, Arc<str>> = HashMap::new();
        for slug in providers::supported_slugs() {
            let config = providers::config_for_slug(slug).expect("supported provider has config");
            let env_var = config.api_key_env();
            match std::env::var(env_var)
                .ok()
                .filter(|value| !value.is_empty())
            {
                Some(value) => {
                    provider_keys.insert(env_var.to_string(), Arc::from(value.as_str()));
                }
                None => {
                    tracing::warn!("no {env_var} env var set — provider '{slug}' will return 401")
                }
            }
        }

        let max_retries = std::env::var("ROUTER_MAX_RETRIES")
            .ok()
            .and_then(|value| value.parse::<u32>().ok())
            .unwrap_or(2)
            .min(5);

        Self {
            model_index: Arc::new(model_index),
            client,
            provider_keys: Arc::new(provider_keys),
            master_key_hash,
            identity_secret,
            deployments: Arc::new(routing::load_deployments()),
            health: Arc::new(RwLock::new(HashMap::new())),
            selection_counter: Arc::new(AtomicU64::new(0)),
            max_retries,
            requests_total: Arc::new(AtomicU64::new(0)),
            requests_success: Arc::new(AtomicU64::new(0)),
            requests_failure: Arc::new(AtomicU64::new(0)),
            latency_ms_total: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn record_metric(&self, status: u16, latency_ms: u128) {
        self.requests_total.fetch_add(1, Ordering::Relaxed);
        self.latency_ms_total
            .fetch_add(latency_ms.min(u64::MAX as u128) as u64, Ordering::Relaxed);
        if (200..300).contains(&status) {
            self.requests_success.fetch_add(1, Ordering::Relaxed);
        } else {
            self.requests_failure.fetch_add(1, Ordering::Relaxed);
        }
    }

    pub fn metrics_snapshot(&self) -> (u64, u64, u64, u64) {
        (
            self.requests_total.load(Ordering::Relaxed),
            self.requests_success.load(Ordering::Relaxed),
            self.requests_failure.load(Ordering::Relaxed),
            self.latency_ms_total.load(Ordering::Relaxed),
        )
    }

    pub async fn select_deployment(&self, model: &CatalogModel) -> Deployment {
        let configured = self.deployments.get(&model.id).cloned().unwrap_or_default();
        let deployments = if configured.is_empty() {
            vec![Deployment {
                provider_slug: model.provider_slug.clone(),
                upstream_model: model.upstream_model.clone(),
                api_base: None,
                weight: 1,
            }]
        } else {
            configured
        };

        let health = self.health.read().await;
        let available: Vec<Deployment> = deployments
            .iter()
            .filter(|deployment| {
                let key = health_key(&model.id, deployment);
                health
                    .get(&key)
                    .map(HealthRecord::is_available)
                    .unwrap_or(true)
            })
            .cloned()
            .collect();
        drop(health);

        let candidates = if available.is_empty() {
            deployments
        } else {
            available
        };
        let total_weight: u64 = candidates
            .iter()
            .map(|deployment| deployment.weight.max(1) as u64)
            .sum();
        let slot = self.selection_counter.fetch_add(1, Ordering::Relaxed) % total_weight.max(1);
        let mut cursor = 0u64;
        for deployment in &candidates {
            cursor += deployment.weight.max(1) as u64;
            if slot < cursor {
                return deployment.clone();
            }
        }
        candidates
            .last()
            .cloned()
            .expect("deployment candidates cannot be empty")
    }

    pub async fn record_success(
        &self,
        model_id: &str,
        deployment: &Deployment,
        status: u16,
        latency_ms: u128,
    ) {
        let mut health = self.health.write().await;
        let entry = health.entry(health_key(model_id, deployment)).or_default();
        entry.failures = 0;
        entry.cooldown_until_ms = 0;
        entry.last_status = Some(status);
        entry.last_latency_ms = Some(latency_ms);
        entry.successes = entry.successes.saturating_add(1);
    }

    pub async fn record_failure(
        &self,
        model_id: &str,
        deployment: &Deployment,
        status: Option<u16>,
        latency_ms: u128,
    ) {
        let mut health = self.health.write().await;
        let entry = health.entry(health_key(model_id, deployment)).or_default();
        entry.failures = entry.failures.saturating_add(1);
        entry.last_status = status;
        entry.last_latency_ms = Some(latency_ms);
        let cooldown_seconds = 2u128.saturating_pow(entry.failures.min(5)).min(60);
        entry.cooldown_until_ms = routing::now_ms() + cooldown_seconds * 1_000;
    }

    pub async fn health_snapshot(&self) -> HashMap<String, HealthRecord> {
        self.health.read().await.clone()
    }
}

fn health_key(model_id: &str, deployment: &Deployment) -> String {
    format!(
        "{}::{}::{}",
        model_id,
        deployment.provider_slug,
        deployment.upstream_model.as_deref().unwrap_or("")
    )
}
