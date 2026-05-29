//! Encrypted-at-rest local state.
//!
//! All long-lived secrets (device certificate, device JWT, refresh secret,
//! pending queue) are persisted in a single sealed blob using XChaCha20-Poly1305
//! with a KEK derived from the OS keyring entry (per-platform: DPAPI, Keychain,
//! kwallet, Android Keystore).

use sequoia_crypto::aead::{Aead, AeadKey};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceState {
    pub device_id: String,
    pub tenant_id: String,
    pub device_jwt: String,
    pub device_jwt_expires_unix: i64,
    pub identity_sk_bytes: [u8; 32],
    pub trust_anchor_pem: Vec<u8>,
}

pub fn save(path: &Path, kek: &AeadKey, st: &DeviceState) -> anyhow::Result<()> {
    let plaintext = serde_json::to_vec(st)?;
    let sealed = Aead::new(kek).seal(b"sequoia-state-v1", &plaintext)
        .map_err(|e| anyhow::anyhow!("seal: {e}"))?;
    std::fs::write(path, sealed)?;
    Ok(())
}

pub fn load(path: &Path, kek: &AeadKey) -> anyhow::Result<DeviceState> {
    let sealed = std::fs::read(path)?;
    let pt = Aead::new(kek).open(b"sequoia-state-v1", &sealed)
        .map_err(|e| anyhow::anyhow!("open: {e}"))?;
    Ok(serde_json::from_slice(&pt)?)
}
