//! Outbound adapters — sqlx-backed implementations of the repository ports.

use async_trait::async_trait;
use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::domain::*;
use crate::ports::*;

pub struct PgUserRepo { pub pool: PgPool }

#[async_trait]
impl UserRepository for PgUserRepo {
    async fn find_by_email(&self, tenant_id: Uuid, email: &str) -> anyhow::Result<Option<User>> {
        let row = sqlx::query!(
            r#"SELECT id, tenant_id, email, display_name, status, mfa_enabled, created_at, last_login_at
               FROM auth.users WHERE tenant_id = $1 AND email = $2"#,
            tenant_id, email
        )
        .fetch_optional(&self.pool).await?;
        Ok(row.map(|r| User {
            id: r.id, tenant_id: r.tenant_id, email: r.email,
            display_name: r.display_name,
            status: parse_status(&r.status),
            mfa_enabled: r.mfa_enabled,
            created_at: r.created_at,
            last_login_at: r.last_login_at,
        }))
    }

    async fn find_by_id(&self, id: Uuid) -> anyhow::Result<Option<User>> {
        let row = sqlx::query!(
            r#"SELECT id, tenant_id, email, display_name, status, mfa_enabled, created_at, last_login_at
               FROM auth.users WHERE id = $1"#, id)
            .fetch_optional(&self.pool).await?;
        Ok(row.map(|r| User {
            id: r.id, tenant_id: r.tenant_id, email: r.email,
            display_name: r.display_name,
            status: parse_status(&r.status),
            mfa_enabled: r.mfa_enabled,
            created_at: r.created_at,
            last_login_at: r.last_login_at,
        }))
    }

    async fn touch_login(&self, id: Uuid) -> anyhow::Result<()> {
        sqlx::query!("UPDATE auth.users SET last_login_at = now() WHERE id = $1", id)
            .execute(&self.pool).await?;
        Ok(())
    }

    async fn password_hash(&self, id: Uuid) -> anyhow::Result<Option<String>> {
        let r = sqlx::query!("SELECT password_hash FROM auth.users WHERE id = $1", id)
            .fetch_optional(&self.pool).await?;
        Ok(r.and_then(|r| r.password_hash))
    }

    async fn update_status(&self, id: Uuid, status: UserStatus) -> anyhow::Result<()> {
        sqlx::query!("UPDATE auth.users SET status = $1 WHERE id = $2", format!("{:?}", status).to_lowercase(), id)
            .execute(&self.pool).await?;
        Ok(())
    }
}

fn parse_status(s: &str) -> UserStatus {
    match s { "active" => UserStatus::Active, "disabled" => UserStatus::Disabled, _ => UserStatus::Locked }
}

pub struct PgSessionRepo { pub pool: PgPool }

#[async_trait]
impl SessionRepository for PgSessionRepo {
    async fn create(&self, s: &Session) -> anyhow::Result<()> {
        sqlx::query!(
            r#"INSERT INTO auth.sessions (id, user_id, tenant_id, created_at, last_seen_at)
               VALUES ($1,$2,$3,$4,$4)"#,
            s.id, s.user_id, s.tenant_id, s.created_at
        ).execute(&self.pool).await?;
        Ok(())
    }
    async fn revoke(&self, id: Uuid, _reason: &str) -> anyhow::Result<()> {
        sqlx::query!("UPDATE auth.sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL", id)
            .execute(&self.pool).await?;
        Ok(())
    }
}

pub struct PgRefreshRepo { pub pool: PgPool }

#[async_trait]
impl RefreshRepository for PgRefreshRepo {
    async fn store(&self, t: &RefreshToken) -> anyhow::Result<()> {
        sqlx::query!(
            r#"INSERT INTO auth.refresh_tokens (id, session_id, parent_id, token_sha256, expires_at)
               VALUES ($1,$2,$3,$4,$5)"#,
            t.id, t.session_id, t.parent_id, &t.token_sha256[..], t.expires_at
        ).execute(&self.pool).await?;
        Ok(())
    }

    async fn find_by_hash(&self, h: &[u8; 32]) -> anyhow::Result<Option<RefreshToken>> {
        let row = sqlx::query!(
            r#"SELECT id, session_id, parent_id, token_sha256, expires_at, revoked_at
               FROM auth.refresh_tokens WHERE token_sha256 = $1"#, &h[..]
        ).fetch_optional(&self.pool).await?;
        Ok(row.map(|r| {
            let mut bytes = [0u8; 32];
            bytes.copy_from_slice(&r.token_sha256);
            RefreshToken {
                id: r.id, session_id: r.session_id, parent_id: r.parent_id,
                token_sha256: bytes,
                expires_at: r.expires_at, revoked_at: r.revoked_at,
            }
        }))
    }

    async fn revoke_family(&self, session_id: Uuid, reason: &str) -> anyhow::Result<()> {
        sqlx::query!(
            "UPDATE auth.refresh_tokens SET revoked_at = now(), revoked_reason = $1 \
             WHERE session_id = $2 AND revoked_at IS NULL",
             reason, session_id
        ).execute(&self.pool).await?;
        Ok(())
    }

    async fn revoke(&self, id: Uuid, reason: &str) -> anyhow::Result<()> {
        sqlx::query!(
            "UPDATE auth.refresh_tokens SET revoked_at = now(), revoked_reason = $1 \
             WHERE id = $2 AND revoked_at IS NULL",
             reason, id
        ).execute(&self.pool).await?;
        Ok(())
    }
}

// Defaults so `OffsetDateTime` parses cleanly from sqlx; nothing platform-specific.
#[allow(dead_code)]
fn _now() -> OffsetDateTime { OffsetDateTime::now_utc() }
