//! Self-update.
//!
//! A separate updater sidecar process verifies signed manifests served by
//! the gateway (`/v1/agent/releases`), downloads the next binary, verifies
//! the Ed25519 signature against an embedded release-signing key, and
//! atomically replaces the agent binary then restarts the service. The
//! agent itself never overwrites itself in place.

use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ReleaseManifest {
    pub version: String,
    pub url: String,
    pub sha256_hex: String,
    pub signature_b64: String,
    pub min_supported_version: String,
}

pub fn current_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
