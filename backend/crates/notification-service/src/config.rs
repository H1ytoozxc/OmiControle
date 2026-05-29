use sequoia_db::PoolConfig;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Default)]
pub struct NotifyConfig {
    #[serde(default = "default_bind")] pub bind: String,
    #[serde(default)]                  pub otlp_endpoint: Option<String>,
    #[serde(default = "default_log_filter")] pub log_filter: String,
    pub database: PoolConfig,
    #[serde(default = "default_workers")] pub worker_concurrency: usize,
    #[serde(default)] pub smtp_url: Option<String>,
    #[serde(default)] pub fcm_service_account_path: Option<String>,
}
fn default_bind() -> String { "0.0.0.0:8088".into() }
fn default_log_filter() -> String { "info".into() }
fn default_workers() -> usize { 16 }
