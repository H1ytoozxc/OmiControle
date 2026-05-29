//! Configuration loader.
//!
//! Precedence (highest wins):
//!   1. environment variables (prefixed)
//!   2. `config.<env>.toml` (e.g. config.production.toml)
//!   3. `config.toml`
//!   4. compile-time defaults supplied via `Default` impl
//!
//! Secret values can be referenced as `file://...` or `env://VAR` and are
//! resolved at load time so production deployments can mount secrets without
//! interpolating into config files.

use std::path::PathBuf;

use config::{Config, Environment, File, FileFormat};
use serde::de::DeserializeOwned;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("config build: {0}")]
    Build(#[from] config::ConfigError),
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("missing required value: {0}")]
    Missing(&'static str),
    #[error("invalid value for {field}: {detail}")]
    Invalid { field: &'static str, detail: String },
}

#[derive(Debug, Clone)]
pub struct LoadOptions {
    pub env_prefix: &'static str,
    pub config_dir: PathBuf,
    pub env: String,
}

impl Default for LoadOptions {
    fn default() -> Self {
        Self {
            env_prefix: "SEQUOIA",
            config_dir: std::env::var("SEQUOIA_CONFIG_DIR")
                .map(PathBuf::from)
                .unwrap_or_else(|_| PathBuf::from("./config")),
            env: std::env::var("SEQUOIA_ENV").unwrap_or_else(|_| "development".into()),
        }
    }
}

pub fn load<T: DeserializeOwned + Default>(opts: &LoadOptions) -> Result<T, ConfigError> {
    // best-effort .env load — silently fail in containers where it doesn't exist
    let _ = dotenvy::dotenv();

    let base = opts.config_dir.join("config.toml");
    let overlay = opts.config_dir.join(format!("config.{}.toml", opts.env));

    let mut builder = Config::builder();
    if base.exists() {
        builder = builder.add_source(File::from(base).format(FileFormat::Toml));
    }
    if overlay.exists() {
        builder = builder.add_source(File::from(overlay).format(FileFormat::Toml));
    }
    let cfg = builder
        .add_source(
            Environment::with_prefix(opts.env_prefix)
                .prefix_separator("__")
                .separator("__")
                .try_parsing(true),
        )
        .build()?;

    // try deserialize; if config is empty, fall back to Default + env-merge
    let parsed: T = match cfg.try_deserialize() {
        Ok(v) => v,
        Err(config::ConfigError::NotFound(_)) => T::default(),
        Err(e) => return Err(e.into()),
    };
    Ok(parsed)
}

/// Resolve a secret reference: `file://...`, `env://...`, or literal.
pub fn resolve_secret(s: &str) -> Result<String, ConfigError> {
    if let Some(path) = s.strip_prefix("file://") {
        Ok(std::fs::read_to_string(path)?.trim_end().to_owned())
    } else if let Some(var) = s.strip_prefix("env://") {
        std::env::var(var).map_err(|_| ConfigError::Missing("env-referenced secret"))
    } else {
        Ok(s.to_owned())
    }
}
