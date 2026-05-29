use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Default)]
pub struct RealtimeConfig {
    #[serde(default = "default_bind")]   pub bind: String,
    #[serde(default = "default_ws_path")] pub ws_path: String,
    #[serde(default)]                    pub otlp_endpoint: Option<String>,
    #[serde(default = "default_log_filter")] pub log_filter: String,

    pub redis_url: String,
    pub jwks_url: String,
    pub issuer: String,
    pub audience: String,

    #[serde(default = "default_max_conn")]      pub max_connections: usize,
    #[serde(default = "default_heartbeat")]     pub heartbeat_interval_s: u64,
    #[serde(default = "default_send_cap")]      pub per_conn_send_capacity: usize,
}

fn default_bind()      -> String { "0.0.0.0:8083".into() }
fn default_ws_path()   -> String { "/ws".into() }
fn default_log_filter() -> String { "info".into() }
fn default_max_conn()  -> usize  { 200_000 }
fn default_heartbeat() -> u64    { 20 }
fn default_send_cap()  -> usize  { 512 }
