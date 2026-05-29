use sequoia_db::PoolConfig;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Default)]
pub struct PluginConfig {
    #[serde(default = "default_bind")] pub bind: String,
    #[serde(default)]                  pub otlp_endpoint: Option<String>,
    #[serde(default = "default_log_filter")] pub log_filter: String,
    pub database: PoolConfig,
    #[serde(default = "default_wasm_dir")] pub wasm_dir: String,
    #[serde(default = "default_fuel")] pub fuel_limit_default: u64,
    #[serde(default = "default_pages")] pub memory_pages_default: u32,
    pub host_api_version: String,
}
fn default_bind() -> String { "0.0.0.0:8086".into() }
fn default_log_filter() -> String { "info".into() }
fn default_wasm_dir() -> String { "./plugins".into() }
fn default_fuel() -> u64 { 10_000_000 }
fn default_pages() -> u32 { 64 }
