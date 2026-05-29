use sequoia_db::PoolConfig;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Default)]
pub struct AuthConfig {
    #[serde(default = "default_bind")]
    pub bind: String,
    #[serde(default)] pub otlp_endpoint: Option<String>,
    #[serde(default = "default_log_filter")] pub log_filter: String,

    pub database: PoolConfig,
    pub jwt: JwtConfig,
    #[serde(default)] pub oidc: Vec<OidcProvider>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct JwtConfig {
    pub issuer: String,
    pub audience: String,
    /// kid → private key PEM source (`file://...` or `env://...`).
    pub signing_keys: Vec<SigningKeyConfig>,
    #[serde(default = "default_access_ttl")]  pub access_ttl_s: i64,
    #[serde(default = "default_refresh_ttl")] pub refresh_ttl_s: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SigningKeyConfig {
    pub kid: String,
    pub private_key_pem: String,
    pub public_key_pem: String,
    pub active: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OidcProvider {
    pub name: String,
    pub issuer: String,
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
    #[serde(default = "default_scopes")] pub scopes: Vec<String>,
}

fn default_bind() -> String { "0.0.0.0:8081".into() }
fn default_log_filter() -> String { "info".into() }
fn default_access_ttl() -> i64 { 900 }
fn default_refresh_ttl() -> i64 { 2_592_000 }
fn default_scopes() -> Vec<String> { vec!["openid".into(), "email".into(), "profile".into()] }
