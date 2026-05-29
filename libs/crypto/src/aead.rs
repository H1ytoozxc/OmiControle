use chacha20poly1305::aead::{Aead as _, KeyInit};
use chacha20poly1305::XChaCha20Poly1305;
use rand::RngCore;
use thiserror::Error;
use zeroize::ZeroizeOnDrop;

#[derive(Debug, Error)]
pub enum AeadError {
    #[error("invalid key length: {0}")]
    KeyLen(usize),
    #[error("encrypt failed")]
    Encrypt,
    #[error("decrypt failed")]
    Decrypt,
    #[error("ciphertext too short")]
    Short,
}

/// 256-bit symmetric AEAD key. Zeroized on drop.
#[derive(ZeroizeOnDrop, Clone)]
pub struct AeadKey([u8; 32]);

impl AeadKey {
    pub fn from_bytes(b: [u8; 32]) -> Self { Self(b) }
    pub fn generate() -> Self {
        let mut k = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut k);
        Self(k)
    }
    pub fn expose(&self) -> &[u8; 32] { &self.0 }
}

pub struct Aead {
    cipher: XChaCha20Poly1305,
}

impl Aead {
    pub fn new(key: &AeadKey) -> Self {
        let cipher = XChaCha20Poly1305::new(key.expose().into());
        Self { cipher }
    }

    /// Sealed message layout: `nonce(24) || ciphertext`.
    pub fn seal(&self, aad: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, AeadError> {
        let mut nonce = [0u8; 24];
        rand::thread_rng().fill_bytes(&mut nonce);
        let mut out = Vec::with_capacity(24 + plaintext.len() + 16);
        out.extend_from_slice(&nonce);
        let ct = self
            .cipher
            .encrypt(
                (&nonce).into(),
                chacha20poly1305::aead::Payload { msg: plaintext, aad },
            )
            .map_err(|_| AeadError::Encrypt)?;
        out.extend_from_slice(&ct);
        Ok(out)
    }

    pub fn open(&self, aad: &[u8], sealed: &[u8]) -> Result<Vec<u8>, AeadError> {
        if sealed.len() < 24 + 16 { return Err(AeadError::Short); }
        let (nonce, ct) = sealed.split_at(24);
        self.cipher
            .decrypt(
                nonce.into(),
                chacha20poly1305::aead::Payload { msg: ct, aad },
            )
            .map_err(|_| AeadError::Decrypt)
    }
}
