use serde::Deserialize;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use std::str::FromStr;
use std::time::Duration;

pub type PgPool = sqlx::PgPool;

#[derive(Debug, Clone, Deserialize)]
pub struct PoolConfig {
    pub url: String,
    #[serde(default = "default_max")]
    pub max_connections: u32,
    #[serde(default = "default_min")]
    pub min_connections: u32,
    #[serde(default = "default_acq_ms")]
    pub acquire_timeout_ms: u64,
    /// Optional application name for pg_stat_activity.
    #[serde(default)]
    pub application_name: Option<String>,
}

fn default_max() -> u32 { 32 }
fn default_min() -> u32 { 4 }
fn default_acq_ms() -> u64 { 5_000 }

pub async fn init_pool(cfg: &PoolConfig) -> Result<PgPool, sqlx::Error> {
    let mut opts = PgConnectOptions::from_str(&cfg.url)?;
    if let Some(app) = cfg.application_name.as_deref() {
        opts = opts.application_name(app);
    }
    PgPoolOptions::new()
        .max_connections(cfg.max_connections)
        .min_connections(cfg.min_connections)
        .acquire_timeout(Duration::from_millis(cfg.acquire_timeout_ms))
        .test_before_acquire(false)
        .connect_with(opts)
        .await
}
