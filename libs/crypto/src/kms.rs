//! KMS abstraction. Production binds to AWS KMS / GCP KMS / Vault Transit;
//! the test/dev backend keeps a KEK in memory.

use async_trait::async_trait;
use thiserror::Error;


use crate::aead::{Aead, AeadError, AeadKey};

#[derive(Debug, Error)]
pub enum KmsError {
    #[error("kms unavailable: {0}")]
    Unavailable(String),
    #[error("aead: {0}")]
    Aead(#[from] AeadError),
}

/// Envelope-encrypt secrets at rest: the KMS wraps a per-tenant DEK; the DEK
/// encrypts the payload. We never store the DEK in plaintext alongside the
/// ciphertext.
#[async_trait]
pub trait Kms: Send + Sync {
    async fn encrypt(&self, key_id: &str, plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>, KmsError>;
    async fn decrypt(&self, key_id: &str, ciphertext: &[u8], aad: &[u8]) -> Result<Vec<u8>, KmsError>;
}

/// In-memory KMS for dev/tests. NOT FOR PRODUCTION.
pub struct InMemoryKms {
    pub kek: AeadKey,
}

#[async_trait]
impl Kms for InMemoryKms {
    async fn encrypt(&self, _key_id: &str, plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>, KmsError> {
        Ok(Aead::new(&self.kek).seal(aad, plaintext)?)
    }
    async fn decrypt(&self, _key_id: &str, ciphertext: &[u8], aad: &[u8]) -> Result<Vec<u8>, KmsError> {
        Ok(Aead::new(&self.kek).open(aad, ciphertext)?)
    }
}

