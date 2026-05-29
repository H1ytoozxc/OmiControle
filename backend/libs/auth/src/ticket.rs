//! Short-lived HMAC-signed tickets for WebSocket upgrade auth.
//!
//! Format (URL-safe, no padding):
//!   `<b64url(payload_json)>.<b64url(hmac_sha256(payload, key))>`
//!
//! Payload JSON:
//!   `{"t":"<tenant>","u":"<user>","x":<unix_exp_secs>,"n":"<nonce_b64>"}`
//!
//! The api-gateway issues these on `POST /v1/auth/ws-ticket` (cookie-auth'd);
//! the realtime-gateway verifies them on `GET /ws?ticket=...`. Both services
//! must be configured with the same HMAC key (env `WS_TICKET_HMAC_KEY_B64`).
//!
//! TTL is intentionally short (~60s): a leaked ticket only opens one socket
//! within a minute. Replay protection beyond that requires Redis-backed
//! single-use tracking which we can layer on later.

use base64::engine::general_purpose::URL_SAFE_NO_PAD as B64;
use base64::Engine;
use hmac::{Hmac, Mac};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use thiserror::Error;
use time::OffsetDateTime;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Error)]
pub enum TicketError {
    #[error("invalid hmac key (must be base64url and ≥ 32 bytes)")]
    InvalidKey,
    #[error("malformed ticket")]
    Malformed,
    #[error("bad signature")]
    BadSignature,
    #[error("ticket expired")]
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TicketPayload {
    /// Tenant ID.
    t: String,
    /// User ID.
    u: String,
    /// Expiry, unix seconds.
    x: i64,
    /// Random nonce (12 bytes, b64url) — defends against payload-collision
    /// pre-computation and gives each ticket a unique jti.
    n: String,
}

/// Decoded ticket payload after verification.
#[derive(Debug, Clone)]
pub struct VerifiedTicket {
    pub tenant_id: String,
    pub user_id: String,
    pub expires_at: i64,
}

/// Decode an HMAC key from base64url. Key must be at least 32 bytes long.
pub fn decode_key(b64url: &str) -> Result<Vec<u8>, TicketError> {
    let key = B64.decode(b64url.trim()).map_err(|_| TicketError::InvalidKey)?;
    if key.len() < 32 {
        return Err(TicketError::InvalidKey);
    }
    Ok(key)
}

/// Issue a ticket bound to (tenant, user) that expires in `ttl_secs`.
pub fn issue(key: &[u8], tenant_id: &str, user_id: &str, ttl_secs: i64) -> Result<String, TicketError> {
    let mut nonce = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce);
    let payload = TicketPayload {
        t: tenant_id.to_owned(),
        u: user_id.to_owned(),
        x: OffsetDateTime::now_utc().unix_timestamp() + ttl_secs,
        n: B64.encode(nonce),
    };
    let payload_json = serde_json::to_vec(&payload).map_err(|_| TicketError::Malformed)?;
    let payload_b64 = B64.encode(&payload_json);

    let mut mac = HmacSha256::new_from_slice(key).map_err(|_| TicketError::InvalidKey)?;
    mac.update(payload_b64.as_bytes());
    let sig = mac.finalize().into_bytes();
    let sig_b64 = B64.encode(sig);

    Ok(format!("{payload_b64}.{sig_b64}"))
}

/// Verify a ticket's HMAC and check its expiry.
pub fn verify(key: &[u8], ticket: &str) -> Result<VerifiedTicket, TicketError> {
    let (payload_b64, sig_b64) = ticket.split_once('.').ok_or(TicketError::Malformed)?;

    // Constant-time MAC verification.
    let mut mac = HmacSha256::new_from_slice(key).map_err(|_| TicketError::InvalidKey)?;
    mac.update(payload_b64.as_bytes());
    let expected_sig = B64.decode(sig_b64).map_err(|_| TicketError::Malformed)?;
    mac.verify_slice(&expected_sig).map_err(|_| TicketError::BadSignature)?;

    let payload_bytes = B64.decode(payload_b64).map_err(|_| TicketError::Malformed)?;
    let payload: TicketPayload = serde_json::from_slice(&payload_bytes).map_err(|_| TicketError::Malformed)?;

    let now = OffsetDateTime::now_utc().unix_timestamp();
    if now > payload.x {
        return Err(TicketError::Expired);
    }

    Ok(VerifiedTicket {
        tenant_id: payload.t,
        user_id: payload.u,
        expires_at: payload.x,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mk_key() -> Vec<u8> { vec![0x42u8; 32] }

    #[test]
    fn roundtrip_ok() {
        let key = mk_key();
        let t = issue(&key, "tenant-a", "user-b", 60).unwrap();
        let v = verify(&key, &t).unwrap();
        assert_eq!(v.tenant_id, "tenant-a");
        assert_eq!(v.user_id, "user-b");
    }

    #[test]
    fn wrong_key_rejected() {
        let t = issue(&mk_key(), "x", "y", 60).unwrap();
        let bad = vec![0xFFu8; 32];
        assert!(matches!(verify(&bad, &t), Err(TicketError::BadSignature)));
    }

    #[test]
    fn expired_rejected() {
        let key = mk_key();
        let t = issue(&key, "x", "y", -1).unwrap();
        assert!(matches!(verify(&key, &t), Err(TicketError::Expired)));
    }

    #[test]
    fn malformed_rejected() {
        let key = mk_key();
        assert!(matches!(verify(&key, "garbage"), Err(TicketError::Malformed)));
        assert!(matches!(verify(&key, "no.dot.allowed"), Err(_)));
    }
}
