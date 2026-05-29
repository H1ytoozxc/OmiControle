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

    /// Device-JWT signing config. Keeps device tokens cryptographically
    /// separate from user tokens (different signing key, different audience).
    pub device_jwt: DeviceJwtConfig,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct DeviceJwtConfig {
    pub issuer: String,
    pub audience: String,
    pub kid: String,
    /// `file://path` or `env://VAR` — resolved via sequoia_config::resolve_secret.
    pub private_key_pem: String,
    /// Public key in PEM form (same source format as private_key_pem). Used by
    /// the LocalVerifier on the Channel RPC to validate incoming device JWTs.
    pub public_key_pem: String,
    #[serde(default = "default_device_jwt_ttl")]
    pub ttl_s: i64,
}

fn default_bind() -> String { "0.0.0.0:9082".into() }
fn default_log_filter() -> String { "info".into() }
fn default_enroll_ttl() -> i64 { 600 }
fn default_chan_cap() -> usize { 256 }
fn default_device_jwt_ttl() -> i64 { 24 * 3600 }
