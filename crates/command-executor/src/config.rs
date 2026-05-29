use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Default)]
pub struct ExecConfig {
    #[serde(default = "default_bind")] pub bind: String,
    #[serde(default)]                  pub otlp_endpoint: Option<String>,
    #[serde(default = "default_log_filter")] pub log_filter: String,
    pub signing_key_pem_ref: String,
    pub device_service_grpc: String,
    pub redis_url: String,
}
fn default_bind() -> String { "0.0.0.0:8087".into() }
fn default_log_filter() -> String { "info".into() }
