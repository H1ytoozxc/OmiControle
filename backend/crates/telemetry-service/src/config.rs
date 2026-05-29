use sequoia_db::PoolConfig;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Default)]
pub struct TelemetryServiceConfig {
    #[serde(default = "default_bind")]   pub bind: String,
    #[serde(default)]                    pub otlp_endpoint: Option<String>,
    #[serde(default = "default_log_filter")] pub log_filter: String,
    pub database: PoolConfig,
    #[serde(default = "default_retention")] pub retention_days: u32,
}
fn default_bind() -> String { "0.0.0.0:8089".into() }
fn default_log_filter() -> String { "info".into() }
fn default_retention() -> u32 { 30 }
