use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Default)]
pub struct GatewayConfig {
    #[serde(default = "default_bind")]
    pub bind: String,
    #[serde(default = "default_timeout")]
    pub request_timeout_s: u64,
    #[serde(default)]
    pub otlp_endpoint: Option<String>,
    #[serde(default = "default_log_filter")]
    pub log_filter: String,

    pub upstreams: Upstreams,
    pub auth: AuthConfig,
    pub rate_limit: RateLimitConfig,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct Upstreams {
    pub auth: String,           // grpc:// address
    pub device: String,
    pub ai: String,
    pub workflow: String,
    pub plugin: String,
    pub command: String,
    pub notification: String,
    pub telemetry: String,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct AuthConfig {
    pub issuer: String,
    pub jwks_url: String,
    pub audience: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RateLimitConfig {
    pub per_ip_rps: u32,
    pub per_tenant_rps: u32,
    pub burst: u32,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self { per_ip_rps: 100, per_tenant_rps: 1000, burst: 200 }
    }
}

fn default_bind() -> String { "0.0.0.0:8080".into() }
fn default_timeout() -> u64 { 30 }
fn default_log_filter() -> String { "info,h2=warn,hyper=warn".into() }
