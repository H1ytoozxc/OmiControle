//! Command authorization layer.
//!
//! The operator's private key signs `(command_id || device_id || kind ||
//! sha256(payload) || expires_at)`. The device agent verifies against the
//! operator's public key (distributed via the tenant trust anchor bundle).

use ed25519_dalek::{Signer, SigningKey};
use sha2::{Digest, Sha256};

pub fn build_signing_payload(
    command_id: &str,
    device_id: &str,
    kind: &str,
    payload: &[u8],
    expires_unix: i64,
) -> Vec<u8> {
    let mut h = Sha256::new();
    h.update(payload);
    let digest = h.finalize();
    let mut buf = Vec::with_capacity(command_id.len() + device_id.len() + kind.len() + 32 + 8);
    buf.extend_from_slice(command_id.as_bytes());
    buf.push(0); buf.extend_from_slice(device_id.as_bytes());
    buf.push(0); buf.extend_from_slice(kind.as_bytes());
    buf.push(0); buf.extend_from_slice(&digest);
    buf.extend_from_slice(&expires_unix.to_be_bytes());
    buf
}

pub fn sign(sk: &SigningKey, msg: &[u8]) -> [u8; 64] {
    sk.sign(msg).to_bytes()
}
