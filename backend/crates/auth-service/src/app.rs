//! Application layer: use cases composed over the domain ports.

use std::sync::Arc;

use anyhow::{anyhow, Context};
use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use rand::RngCore;
use rand::rngs::OsRng;
use sequoia_auth::{IssueParams, Issuer};
use sequoia_common::Error;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use time::{Duration, OffsetDateTime};
use uuid::Uuid;

use crate::adapters::{PgRefreshRepo, PgServiceTokenRepo, PgSessionRepo, PgUserRepo};
use crate::config::AuthConfig;
use crate::domain::{NewUser, RefreshToken, ServiceToken, Session, User, UserStatus};
use crate::ports::{RefreshRepository, ServiceTokenRepository, SessionRepository, UserRepository};

pub struct AuthApp {
    pub cfg: AuthConfig,
    pub users: Arc<dyn UserRepository>,
    pub sessions: Arc<dyn SessionRepository>,
    pub refresh: Arc<dyn RefreshRepository>,
    pub service_tokens: Arc<dyn ServiceTokenRepository>,
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
            refresh: Arc::new(PgRefreshRepo { pool: pool.clone() }),
            service_tokens: Arc::new(PgServiceTokenRepo { pool }),
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

        match user.status {
            UserStatus::Pending  => return Err(Error::Forbidden("account_pending_approval")),
            UserStatus::Disabled => return Err(Error::Forbidden("account_disabled")),
            UserStatus::Locked   => return Err(Error::Forbidden("account_locked")),
            UserStatus::Active   => {}
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

    /// Register a new user. Account starts as 'pending' until an admin approves it.
    pub async fn register(
        &self,
        tenant_id: Uuid,
        email: &str,
        password: &str,
        display_name: Option<&str>,
    ) -> Result<Uuid, Error> {
        if password.len() < 12 {
            return Err(Error::BadRequest("password must be at least 12 characters".into()));
        }

        // Idempotent: if the email already exists (active or pending), return conflict.
        if self.users.find_by_email(tenant_id, email).await.map_err(Error::from)?.is_some() {
            return Err(Error::Conflict("email_already_registered"));
        }

        let hash = hash_password(password)
            .map_err(|e| Error::Internal(anyhow!("hash: {e}")))?;

        let id = Uuid::from_u128(ulid::Ulid::new().0);
        let user = NewUser {
            id,
            tenant_id,
            email: email.to_owned(),
            display_name: display_name.map(str::to_owned),
            password_hash: hash,
        };
        self.users.create(&user).await.map_err(Error::from)?;
        Ok(id)
    }

    /// List all users with status = 'pending' for a tenant.
    pub async fn list_pending(&self, tenant_id: Uuid) -> Result<Vec<User>, Error> {
        self.users.list_pending(tenant_id).await.map_err(Error::from)
    }

    /// Approve a pending user — sets status to 'active'.
    pub async fn approve(&self, tenant_id: Uuid, user_id: Uuid) -> Result<(), Error> {
        let user = self.users.find_by_id(user_id).await
            .map_err(Error::from)?
            .ok_or(Error::NotFound("user not found"))?;
        if user.tenant_id != tenant_id {
            return Err(Error::Forbidden("tenant mismatch"));
        }
        if user.status != UserStatus::Pending {
            return Err(Error::BadRequest("user is not pending".into()));
        }
        self.users.update_status(user_id, UserStatus::Active).await.map_err(Error::from)
    }

    /// Reject and delete a pending user registration.
    pub async fn reject(&self, tenant_id: Uuid, user_id: Uuid) -> Result<(), Error> {
        let user = self.users.find_by_id(user_id).await
            .map_err(Error::from)?
            .ok_or(Error::NotFound("user not found"))?;
        if user.tenant_id != tenant_id {
            return Err(Error::Forbidden("tenant mismatch"));
        }
        if user.status != UserStatus::Pending {
            return Err(Error::BadRequest("user is not pending".into()));
        }
        self.users.delete(user_id).await.map_err(Error::from)
    }

    /// Refresh-token rotation. Detects reuse → revokes the entire family.
    pub async fn refresh(&self, refresh_token: &str) -> Result<TokenPair, Error> {
        let hash = sha256(refresh_token.as_bytes());
        let row = self.refresh.find_by_hash(&hash).await
            .map_err(Error::from)?
            .ok_or(Error::Unauthenticated)?;

        if row.revoked_at.is_some() {
            let _ = self.refresh.revoke_family(row.session_id, "reuse detected").await;
            let _ = self.sessions.revoke(row.session_id, "reuse detected").await;
            return Err(Error::Unauthenticated);
        }
        if row.expires_at <= OffsetDateTime::now_utc() {
            return Err(Error::Unauthenticated);
        }
        self.refresh.revoke(row.id, "rotated").await.map_err(Error::from)?;
        let session = Session {
            id: row.session_id,
            user_id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            created_at: OffsetDateTime::now_utc(),
        };
        self.issue_pair(session, Uuid::nil(), "role:user").await
    }

    pub async fn logout(&self, refresh_token: &str) -> Result<(), Error> {
        let hash = sha256(refresh_token.as_bytes());
        if let Some(row) = self.refresh.find_by_hash(&hash).await.map_err(Error::from)? {
            let _ = self.refresh.revoke_family(row.session_id, "logout").await;
            let _ = self.sessions.revoke(row.session_id, "logout").await;
        }
        Ok(())
    }

    /// Get caller's own profile by user_id.
    pub async fn get_me(&self, user_id: Uuid) -> Result<User, Error> {
        self.users.find_by_id(user_id).await
            .map_err(Error::from)?
            .ok_or(Error::NotFound("user not found"))
    }

    /// Update display_name, bio, email.
    pub async fn update_me(
        &self,
        user_id: Uuid,
        display_name: &str,
        bio: &str,
        email: &str,
    ) -> Result<User, Error> {
        self.users.update_profile(user_id, display_name, bio, email).await.map_err(Error::from)?;
        self.users.find_by_id(user_id).await
            .map_err(Error::from)?
            .ok_or(Error::NotFound("user not found"))
    }

    /// Change password — requires current password for verification.
    pub async fn change_password(
        &self,
        user_id: Uuid,
        current_password: &str,
        new_password: &str,
    ) -> Result<(), Error> {
        if new_password.len() < 12 {
            return Err(Error::BadRequest("password must be at least 12 characters".into()));
        }
        let hash_str = self.users.password_hash(user_id).await
            .map_err(Error::from)?
            .ok_or(Error::Unauthenticated)?;
        let parsed = PasswordHash::new(&hash_str).map_err(|_| Error::Internal(anyhow!("bad hash")))?;
        Argon2::default().verify_password(current_password.as_bytes(), &parsed)
            .map_err(|_| Error::Unauthenticated)?;
        let new_hash = hash_password(new_password)
            .map_err(|e| Error::Internal(anyhow!("hash: {e}")))?;
        self.users.update_password(user_id, &new_hash).await.map_err(Error::from)
    }

    /// Delete the caller's own account. Irreversible.
    pub async fn delete_me(&self, user_id: Uuid) -> Result<(), Error> {
        self.users.delete(user_id).await.map_err(Error::from)
    }

    /// Issue a new service token for CI/API use.
    pub async fn issue_service_token(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        name: &str,
    ) -> Result<(ServiceToken, String), Error> {
        let mut raw = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut raw);
        let full_token = format!("sqt_{}", base64_encode_urlsafe(&raw));
        let prefix = full_token.chars().take(12).collect::<String>();
        let token_hash = sha256(full_token.as_bytes());

        let tok = ServiceToken {
            id: Uuid::from_u128(ulid::Ulid::new().0),
            tenant_id,
            created_by: user_id,
            name: name.to_owned(),
            token_sha256: token_hash,
            prefix,
            created_at: OffsetDateTime::now_utc(),
            last_used_at: None,
            revoked_at: None,
        };
        self.service_tokens.create(&tok).await.map_err(Error::from)?;
        Ok((tok, full_token))
    }

    /// List active (non-revoked) service tokens for a tenant.
    pub async fn list_service_tokens(&self, tenant_id: Uuid) -> Result<Vec<ServiceToken>, Error> {
        self.service_tokens.list_active(tenant_id).await.map_err(Error::from)
    }

    /// Revoke a service token by ID (must belong to tenant).
    pub async fn revoke_service_token(&self, token_id: Uuid, tenant_id: Uuid) -> Result<(), Error> {
        self.service_tokens.revoke(token_id, tenant_id).await.map_err(Error::from)
    }

    async fn issue_pair(&self, session: Session, user_id: Uuid, scope: &str) -> Result<TokenPair, Error> {
        let (access_token, _) = self.issuer.issue(IssueParams {
            kid: self.cfg.jwt.signing_keys.iter().find(|k| k.active).map(|k| k.kid.as_str()).unwrap_or(""),
            key_pem: &[],
            issuer: &self.cfg.jwt.issuer,
            audience: &self.cfg.jwt.audience,
            subject: &user_id.to_string(),
            tenant: &session.tenant_id.to_string(),
            kind: "user",
            scope,
            ttl_secs: self.cfg.jwt.access_ttl_s,
        }).map_err(|e| Error::Internal(anyhow!("issue: {e}")))?;

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

fn hash_password(password: &str) -> anyhow::Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| anyhow!("{e}"))?
        .to_string();
    Ok(hash)
}
