use ed25519_dalek::{Signature, Signer as _, SigningKey, VerifyingKey, Verifier as _};
use rand::rngs::OsRng;
use thiserror::Error;
use zeroize::ZeroizeOnDrop;

#[derive(Debug, Error)]
pub enum SigError {
    #[error("invalid key")]
    InvalidKey,
    #[error("invalid signature")]
    InvalidSignature,
    #[error("verify failed")]
    Verify,
}

#[derive(ZeroizeOnDrop)]
pub struct Signer {
    sk: SigningKey,
}

impl Signer {
    pub fn generate() -> Self {
        Self { sk: SigningKey::generate(&mut OsRng) }
    }
    pub fn from_bytes(b: &[u8; 32]) -> Self {
        Self { sk: SigningKey::from_bytes(b) }
    }
    pub fn public(&self) -> [u8; 32] {
        self.sk.verifying_key().to_bytes()
    }
    pub fn sign(&self, msg: &[u8]) -> [u8; 64] {
        self.sk.sign(msg).to_bytes()
    }
}

pub struct Verifier {
    vk: VerifyingKey,
}

impl Verifier {
    pub fn from_bytes(b: &[u8; 32]) -> Result<Self, SigError> {
        VerifyingKey::from_bytes(b)
            .map(|vk| Self { vk })
            .map_err(|_| SigError::InvalidKey)
    }
    pub fn verify(&self, msg: &[u8], sig: &[u8; 64]) -> Result<(), SigError> {
        let s = Signature::from_bytes(sig);
        self.vk.verify(msg, &s).map_err(|_| SigError::Verify)
    }
}
