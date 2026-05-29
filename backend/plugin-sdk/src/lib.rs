//! Sequoia Plugin SDK.
//!
//! Two-sided helper crate:
//! - **Host side** (default features): types describing manifests, permissions,
//!   bundle signatures, and helpers to validate them before instantiation.
//! - **Guest side** (`features = ["guest"]`): re-exports + macros for plugin
//!   authors writing WASI Preview 2 components.
//!
//! The wire contract is the WIT in `plugin-sdk/wit/sequoia.wit`.

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Top-level plugin manifest. Stored alongside the .wasm bundle and
/// embedded into the signed manifest blob.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Manifest {
    pub name: String,
    pub version: String,
    pub api_version: String,           // SDK API contract version, e.g. "0.1"
    pub description: Option<String>,
    pub exports: Vec<String>,          // exported function names
    pub requested_capabilities: Vec<Capability>,
    pub min_host_version: Option<String>,
}

/// Capability requests honored by the host. Anything not listed is denied.
#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "kind")]
pub enum Capability {
    NetOutbound { allow: Vec<String> },        // allow-list of host:port globs
    FsRead      { paths: Vec<String> },
    FsWrite     { paths: Vec<String> },
    DeviceExec,                                // run shell on hosting device
    TenantRead  { scope: String },
    EventPublish { topics: Vec<String> },
    Memory      { max_pages: u32 },            // wasm linear memory pages
    Cpu         { fuel: u64 },                 // wasmtime fuel budget
}

#[derive(Debug, Error)]
pub enum ValidationError {
    #[error("api version mismatch: plugin={plugin} host={host}")]
    ApiVersionMismatch { plugin: String, host: String },
    #[error("forbidden capability: {0:?}")]
    Forbidden(Capability),
    #[error("missing required field: {0}")]
    Missing(&'static str),
}

/// Host-side: validate a manifest against the host's allow-list before
/// instantiation.
pub fn validate(
    manifest: &Manifest,
    host_api_version: &str,
    tenant_allowed: &[Capability],
) -> Result<(), ValidationError> {
    if manifest.api_version != host_api_version {
        return Err(ValidationError::ApiVersionMismatch {
            plugin: manifest.api_version.clone(),
            host: host_api_version.into(),
        });
    }
    if manifest.name.is_empty() { return Err(ValidationError::Missing("name")); }
    if manifest.version.is_empty() { return Err(ValidationError::Missing("version")); }

    for cap in &manifest.requested_capabilities {
        if !tenant_allowed.iter().any(|a| capability_satisfies(a, cap)) {
            return Err(ValidationError::Forbidden(cap.clone()));
        }
    }
    Ok(())
}

fn capability_satisfies(allowed: &Capability, requested: &Capability) -> bool {
    use Capability::*;
    match (allowed, requested) {
        (NetOutbound { allow: a }, NetOutbound { allow: r }) => {
            r.iter().all(|h| a.iter().any(|p| glob_match(p, h)))
        }
        (FsRead  { paths: a }, FsRead  { paths: r })
      | (FsWrite { paths: a }, FsWrite { paths: r }) => {
            r.iter().all(|h| a.iter().any(|p| h.starts_with(p)))
        }
        (DeviceExec, DeviceExec) => true,
        (TenantRead { scope: a }, TenantRead { scope: r }) => a == r,
        (EventPublish { topics: a }, EventPublish { topics: r }) => {
            r.iter().all(|t| a.iter().any(|p| glob_match(p, t)))
        }
        (Memory { max_pages: a }, Memory { max_pages: r }) => r <= a,
        (Cpu { fuel: a }, Cpu { fuel: r }) => r <= a,
        _ => false,
    }
}

fn glob_match(pat: &str, s: &str) -> bool {
    // tiny glob: only '*' supported at the suffix/prefix for now.
    if pat == "*" { return true; }
    if let Some(rest) = pat.strip_prefix('*') { return s.ends_with(rest); }
    if let Some(rest) = pat.strip_suffix('*') { return s.starts_with(rest); }
    pat == s
}

// --- Guest side helpers ---

#[cfg(feature = "guest")]
pub mod guest {
    //! Convenience prelude for plugin authors. Pair with `wit-bindgen` in the
    //! plugin's own Cargo.toml; this module gives ergonomic helpers atop the
    //! generated types.
    pub use serde::{Deserialize, Serialize};
    pub use serde_json;

    pub type Result<T> = core::result::Result<T, String>;
}
