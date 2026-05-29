//! Application layer: use cases composed over the domain ports.

use std::sync::Arc;

use anyhow::{anyhow, Context};
use argon2::password_hash::{PasswordHash, PasswordVerifier};
use argon2::Argon2;
use rand::RngCore;
use sequoia_auth::{IssueParams, Issuer};
use sequoia_common::Error;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use time::{Duration, OffsetDateTime};
use uuid::Uuid;

use crate::adapters::{PgRefreshRepo, PgSessionRepo, PgUserRepo};
use crate::config::AuthConfig;
use crate::domain::{RefreshToken, Session, UserStatus};
use crate::ports::{RefreshRepository, SessionRepository, UserRepository};

pub struct AuthApp {
    pub cfg: AuthConfig,
    pub users: Arc<dyn UserRepository>,
    pub sessions: Arc<dyn SessionRepository>,
    pub refresh: Arc<dyn RefreshRepository>,
    pub issuer: Issuer,
}

impl AuthApp {
    pub async fn new(cfg: AuthConfig, pool: PgPool) -> anyhow::Result<Self> {
        let active = cfg.jwt.signing_keys.iter().find(|k| k.active)
            .ok_or_else(|| anyhow!("no active signing key configured"))?;
        let private_pem = sequoia_config::resolve_secret(&active.private_key_pem)
            .context("resolve private key")?;
        let issuer = Issuer::from_es256_pem(active.kid.clone(), private_pem.as_bytes())
            .map_err(|e| anyhow!("issuer init: {e}"))?;

        Ok(Self {
            cfg,
            users: Arc::new(PgUserRepo { pool: pool.clone() }),
            sessions: Arc::new(PgSessionRepo { pool: pool.clone() }),
            refresh: Arc::new(PgRefreshRepo { pool }),
            issuer,
        })
    }

    /// Password-based login.
    pub async fn login_password(
        &self,
        tenant_id: Uuid,
        email: &str,
        password: &str,
    ) -> Result<TokenPair, Error> {
        let user = self.users.find_by_email(tenant_id, email).await
            .map_err(Error::from)?
            .ok_or(Error::Unauthenticated)?;
        if user.status != UserStatus::Active {
            return Err(Error::Forbidden("account not active"));
        }
        let hash_str = self.users.password_hash(user.id).await
            .map_err(Error::from)?
            .ok_or(Error::Unauthenticated)?;
        let parsed = PasswordHash::new(&hash_str).map_err(|_| Error::Internal(anyhow!("bad hash on row")))?;
        Argon2::default().verify_password(password.as_bytes(), &parsed)
            .map_err(|_| Error::Unauthenticated)?;

        self.users.touch_login(user.id).await.map_err(Error::from)?;

        let session = Session {
            id: Uuid::from_u128(ulid::Ulid::new().0),
            user_id: user.id,
            tenant_id,
            created_at: OffsetDateTime::now_utc(),
        };
        self.sessions.create(&session).await.map_err(Error::from)?;

        self.issue_pair(session, user.id, "role:user").await
    }

    /// Refresh-token rotation. Detects reuse → revokes the entire family.
    pub async fn refresh(&self, refresh_token: &str) -> Result<TokenPair, Error> {
        let hash = sha256(refresh_token.as_bytes());
        let row = self.refresh.find_by_hash(&hash).await
            .map_err(Error::from)?
            .ok_or(Error::Unauthenticated)?;

        if row.revoked_at.is_some() {
            // Re-use of revoked → likely token theft. Kill the entire chain.
            let _ = self.refresh.revoke_family(row.session_id, "reuse detected").await;
            let _ = self.sessions.revoke(row.session_id, "reuse detected").await;
            return Err(Error::Unauthenticated);
        }
        if row.expires_at <= OffsetDateTime::now_utc() {
            return Err(Error::Unauthenticated);
        }
        // Rotate.
        self.refresh.revoke(row.id, "rotated").await.map_err(Error::from)?;
        let session = Session {
            id: row.session_id,
            user_id: Uuid::nil(),   // not actually needed below
            tenant_id: Uuid::nil(),
            created_at: OffsetDateTime::now_utc(),
        };
        self.issue_pair(session, Uuid::nil(), "role:user").await
    }

    async fn issue_pair(&self, session: Session, user_id: Uuid, scope: &str) -> Result<TokenPair, Error> {
        let (access_token, _) = self.issuer.issue(IssueParams {
            kid: self.cfg.jwt.signing_keys.iter().find(|k| k.active).map(|k| k.kid.as_str()).unwrap_or(""),
            key_pem: &[],   // not used at this layer — Issuer holds the EncodingKey
            issuer: &self.cfg.jwt.issuer,
            audience: &self.cfg.jwt.audience,
            subject: &user_id.to_string(),
            tenant: &session.tenant_id.to_string(),
            kind: "user",
            scope,
            ttl_secs: self.cfg.jwt.access_ttl_s,
        }).map_err(|e| Error::Internal(anyhow!("issue: {e}")))?;

        // Refresh token = 32 random bytes, base64; we store its SHA256.
        let mut raw = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut raw);
        let refresh_token = base64_encode_urlsafe(&raw);
        let row = RefreshToken {
            id: Uuid::from_u128(ulid::Ulid::new().0),
            session_id: session.id,
            parent_id: None,
            token_sha256: sha256(refresh_token.as_bytes()),
            expires_at: OffsetDateTime::now_utc() + Duration::seconds(self.cfg.jwt.refresh_ttl_s),
            revoked_at: None,
        };
        self.refresh.store(&row).await.map_err(Error::from)?;

        Ok(TokenPair {
            access_token,
            refresh_token,
            access_ttl_s: self.cfg.jwt.access_ttl_s as u32,
            refresh_ttl_s: self.cfg.jwt.refresh_ttl_s as u32,
        })
    }
}

#[derive(Debug)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    pub access_ttl_s: u32,
    pub refresh_ttl_s: u32,
}

fn sha256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let out = hasher.finalize();
    let mut a = [0u8; 32];
    a.copy_from_slice(&out);
    a
}

fn base64_encode_urlsafe(data: &[u8]) -> String {
    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
    URL_SAFE_NO_PAD.encode(data)
}
