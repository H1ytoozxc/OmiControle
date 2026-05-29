use sequoia_db::PoolConfig;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize, Default)]
pub struct AiConfig {
    #[serde(default = "default_bind")]   pub bind: String,
    #[serde(default)]                    pub otlp_endpoint: Option<String>,
    #[serde(default = "default_log_filter")] pub log_filter: String,

    pub database: PoolConfig,
    pub default_model: String,

    /// Provider configs keyed by provider name (anthropic, openai, ollama, …).
    #[serde(default)]
    pub providers: HashMap<String, ProviderConfig>,

    #[serde(default = "default_concurrency")]
    pub max_concurrent_runs: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ProviderConfig {
    pub base_url: String,
    pub api_key_ref: Option<String>,    // resolved via sequoia-config::resolve_secret
    #[serde(default)] pub models: Vec<String>,
    #[serde(default)] pub default_max_tokens: Option<u32>,
}

fn default_bind() -> String { "0.0.0.0:8084".into() }
fn default_log_filter() -> String { "info".into() }
fn default_concurrency() -> usize { 64 }
