//! Cryptographic primitives used across the platform.
//!
//! Symmetric AEAD: XChaCha20-Poly1305 (192-bit nonces, safe for random nonces).
//! Asymmetric signatures: Ed25519.
//! Key agreement: X25519.
//! KDF: HKDF-SHA256 (via `ring`).

pub mod aead;
pub mod sig;
pub mod kx;
pub mod kdf;
pub mod kms;

pub use aead::{Aead, AeadError, AeadKey};
pub use sig::{SigError, Signer, Verifier as SigVerifier};
