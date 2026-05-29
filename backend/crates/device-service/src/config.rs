use sequoia_db::PoolConfig;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Default)]
pub struct DeviceConfig {
    #[serde(default = "default_bind")]      pub grpc_bind: String,
    #[serde(default)]                       pub otlp_endpoint: Option<String>,
    #[serde(default = "default_log_filter")] pub log_filter: String,

    pub database: PoolConfig,
    pub redis_url: String,

    #[serde(default = "default_enroll_ttl")] pub enrollment_ttl_s: i64,
    /// Channel capacity per device — slow agents are dropped instead of
    /// memory-bloating the server.
    #[serde(default = "default_chan_cap")]   pub channel_capacity: usize,
}

fn default_bind() -> String { "0.0.0.0:9082".into() }
fn default_log_filter() -> String { "info".into() }
fn default_enroll_ttl() -> i64 { 600 }
fn default_chan_cap() -> usize { 256 }
