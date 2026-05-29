use sequoia_db::PoolConfig;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Default)]
pub struct WorkflowConfig {
    #[serde(default = "default_bind")] pub bind: String,
    #[serde(default)]                  pub otlp_endpoint: Option<String>,
    #[serde(default = "default_log_filter")] pub log_filter: String,
    pub database: PoolConfig,
    #[serde(default = "default_concurrency")] pub worker_concurrency: usize,
    #[serde(default = "default_lease_ms")]    pub lease_duration_ms: u64,
}
fn default_bind() -> String { "0.0.0.0:8085".into() }
fn default_log_filter() -> String { "info".into() }
fn default_concurrency() -> usize { 64 }
fn default_lease_ms() -> u64 { 30_000 }
