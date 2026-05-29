//! Outbound adapters — sqlx-backed implementations of the repository ports.

use async_trait::async_trait;
use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::domain::*;
use crate::ports::*;

// Row structs replace compile-time sqlx::query! macros (no DB needed at build time).
#[derive(sqlx::FromRow)]
struct UserRow {
    id: Uuid,
    tenant_id: Uuid,
    email: String,
    display_name: Option<String>,
    bio: Option<String>,
    status: String,
    mfa_enabled: bool,
    created_at: OffsetDateTime,
    last_login_at: Option<OffsetDateTime>,
}

#[derive(sqlx::FromRow)]
struct PasswordHashRow {
    password_hash: Option<String>,
}

#[derive(sqlx::FromRow)]
struct RefreshTokenRow {
    id: Uuid,
    session_id: Uuid,
    parent_id: Option<Uuid>,
    token_sha256: Vec<u8>,
    expires_at: OffsetDateTime,
    revoked_at: Option<OffsetDateTime>,
}

pub struct PgUserRepo { pub pool: PgPool }

#[async_trait]
impl UserRepository for PgUserRepo {
    async fn find_by_email(&self, tenant_id: Uuid, email: &str) -> anyhow::Result<Option<User>> {
        let row = sqlx::query_as::<_, UserRow>(
            r#"SELECT id, tenant_id, email, display_name, bio, status, mfa_enabled, created_at, last_login_at
               FROM auth.users WHERE tenant_id = $1 AND email = $2"#,
        )
        .bind(tenant_id)
        .bind(email)
        .fetch_optional(&self.pool).await?;
        Ok(row.map(|r| to_user(r)))
    }

    async fn find_by_id(&self, id: Uuid) -> anyhow::Result<Option<User>> {
        let row = sqlx::query_as::<_, UserRow>(
            r#"SELECT id, tenant_id, email, display_name, bio, status, mfa_enabled, created_at, last_login_at
               FROM auth.users WHERE id = $1"#,
        )
        .bind(id)
        .fetch_optional(&self.pool).await?;
        Ok(row.map(|r| to_user(r)))
    }

    async fn touch_login(&self, id: Uuid) -> anyhow::Result<()> {
        sqlx::query("UPDATE auth.users SET last_login_at = now() WHERE id = $1")
            .bind(id)
            .execute(&self.pool).await?;
        Ok(())
    }

    async fn password_hash(&self, id: Uuid) -> anyhow::Result<Option<String>> {
        let r = sqlx::query_as::<_, PasswordHashRow>(
            "SELECT password_hash FROM auth.users WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool).await?;
        Ok(r.and_then(|r| r.password_hash))
    }

    async fn update_status(&self, id: Uuid, status: UserStatus) -> anyhow::Result<()> {
        sqlx::query("UPDATE auth.users SET status = $1 WHERE id = $2")
            .bind(status_str(status))
            .bind(id)
            .execute(&self.pool).await?;
        Ok(())
    }

    async fn create(&self, user: &NewUser) -> anyhow::Result<()> {
        sqlx::query(
            r#"INSERT INTO auth.users
               (id, tenant_id, email, display_name, password_hash, status, mfa_enabled, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,'pending',false,now(),now())"#,
        )
        .bind(user.id)
        .bind(user.tenant_id)
        .bind(&user.email)
        .bind(&user.display_name)
        .bind(&user.password_hash)
        .execute(&self.pool).await?;
        Ok(())
    }

    async fn list_pending(&self, tenant_id: Uuid) -> anyhow::Result<Vec<User>> {
        let rows = sqlx::query_as::<_, UserRow>(
            r#"SELECT id, tenant_id, email, display_name, bio, status, mfa_enabled, created_at, last_login_at
               FROM auth.users WHERE tenant_id = $1 AND status = 'pending'
               ORDER BY created_at DESC"#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(to_user).collect())
    }

    async fn delete(&self, id: Uuid) -> anyhow::Result<()> {
        sqlx::query("DELETE FROM auth.users WHERE id = $1")
            .bind(id)
            .execute(&self.pool).await?;
        Ok(())
    }

    async fn update_profile(&self, id: Uuid, display_name: &str, bio: &str, email: &str) -> anyhow::Result<()> {
        sqlx::query(
            "UPDATE auth.users SET display_name=$1, bio=$2, email=$3, updated_at=now() WHERE id=$4",
        )
        .bind(display_name)
        .bind(bio)
        .bind(email)
        .bind(id)
        .execute(&self.pool).await?;
        Ok(())
    }

    async fn update_password(&self, id: Uuid, hash: &str) -> anyhow::Result<()> {
        sqlx::query(
            "UPDATE auth.users SET password_hash=$1, updated_at=now() WHERE id=$2",
        )
        .bind(hash)
        .bind(id)
        .execute(&self.pool).await?;
        Ok(())
    }
}

// ── Service tokens ────────────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct ServiceTokenRow {
    id: Uuid,
    tenant_id: Uuid,
    created_by: Uuid,
    name: String,
    token_sha256: Vec<u8>,
    prefix: String,
    created_at: OffsetDateTime,
    last_used_at: Option<OffsetDateTime>,
    revoked_at: Option<OffsetDateTime>,
}

pub struct PgServiceTokenRepo { pub pool: PgPool }

#[async_trait]
impl ServiceTokenRepository for PgServiceTokenRepo {
    async fn create(&self, tok: &ServiceToken) -> anyhow::Result<()> {
        sqlx::query(
            r#"INSERT INTO auth.service_tokens
               (id, tenant_id, created_by, name, token_sha256, prefix, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7)"#,
        )
        .bind(tok.id)
        .bind(tok.tenant_id)
        .bind(tok.created_by)
        .bind(&tok.name)
        .bind(&tok.token_sha256[..])
        .bind(&tok.prefix)
        .bind(tok.created_at)
        .execute(&self.pool).await?;
        Ok(())
    }

    async fn list_active(&self, tenant_id: Uuid) -> anyhow::Result<Vec<ServiceToken>> {
        let rows = sqlx::query_as::<_, ServiceTokenRow>(
            r#"SELECT id, tenant_id, created_by, name, token_sha256, prefix,
                      created_at, last_used_at, revoked_at
               FROM auth.service_tokens
               WHERE tenant_id = $1 AND revoked_at IS NULL
               ORDER BY created_at DESC"#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| {
            let mut hash = [0u8; 32];
            hash.copy_from_slice(&r.token_sha256);
            ServiceToken {
                id: r.id,
                tenant_id: r.tenant_id,
                created_by: r.created_by,
                name: r.name,
                token_sha256: hash,
                prefix: r.prefix,
                created_at: r.created_at,
                last_used_at: r.last_used_at,
                revoked_at: r.revoked_at,
            }
        }).collect())
    }

    async fn revoke(&self, id: Uuid, tenant_id: Uuid) -> anyhow::Result<()> {
        sqlx::query(
            "UPDATE auth.service_tokens SET revoked_at=now() WHERE id=$1 AND tenant_id=$2 AND revoked_at IS NULL",
        )
        .bind(id)
        .bind(tenant_id)
        .execute(&self.pool).await?;
        Ok(())
    }
}

fn to_user(r: UserRow) -> User {
    User {
        id: r.id,
        tenant_id: r.tenant_id,
        email: r.email,
        display_name: r.display_name,
        bio: r.bio,
        status: parse_status(&r.status),
        mfa_enabled: r.mfa_enabled,
        created_at: r.created_at,
        last_login_at: r.last_login_at,
    }
}

fn parse_status(s: &str) -> UserStatus {
    match s {
        "active"  => UserStatus::Active,
        "disabled"=> UserStatus::Disabled,
        "pending" => UserStatus::Pending,
        _         => UserStatus::Locked,
    }
}

fn status_str(s: UserStatus) -> &'static str {
    match s {
        UserStatus::Active   => "active",
        UserStatus::Disabled => "disabled",
        UserStatus::Locked   => "locked",
        UserStatus::Pending  => "pending",
    }
}

pub struct PgSessionRepo { pub pool: PgPool }

#[async_trait]
impl SessionRepository for PgSessionRepo {
    async fn create(&self, s: &Session) -> anyhow::Result<()> {
        sqlx::query(
            r#"INSERT INTO auth.sessions (id, user_id, tenant_id, created_at, last_seen_at)
               VALUES ($1,$2,$3,$4,$4)"#,
        )
        .bind(s.id)
        .bind(s.user_id)
        .bind(s.tenant_id)
        .bind(s.created_at)
        .execute(&self.pool).await?;
        Ok(())
    }

    async fn revoke(&self, id: Uuid, _reason: &str) -> anyhow::Result<()> {
        sqlx::query(
            "UPDATE auth.sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL",
        )
        .bind(id)
        .execute(&self.pool).await?;
        Ok(())
    }
}

pub struct PgRefreshRepo { pub pool: PgPool }

#[async_trait]
impl RefreshRepository for PgRefreshRepo {
    async fn store(&self, t: &RefreshToken) -> anyhow::Result<()> {
        sqlx::query(
            r#"INSERT INTO auth.refresh_tokens (id, session_id, parent_id, token_sha256, expires_at)
               VALUES ($1,$2,$3,$4,$5)"#,
        )
        .bind(t.id)
        .bind(t.session_id)
        .bind(t.parent_id)
        .bind(&t.token_sha256[..])
        .bind(t.expires_at)
        .execute(&self.pool).await?;
        Ok(())
    }

    async fn find_by_hash(&self, h: &[u8; 32]) -> anyhow::Result<Option<RefreshToken>> {
        let row = sqlx::query_as::<_, RefreshTokenRow>(
            r#"SELECT id, session_id, parent_id, token_sha256, expires_at, revoked_at
               FROM auth.refresh_tokens WHERE token_sha256 = $1"#,
        )
        .bind(&h[..])
        .fetch_optional(&self.pool).await?;
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
        sqlx::query(
            "UPDATE auth.refresh_tokens SET revoked_at = now(), revoked_reason = $1 \
             WHERE session_id = $2 AND revoked_at IS NULL",
        )
        .bind(reason)
        .bind(session_id)
        .execute(&self.pool).await?;
        Ok(())
    }

    async fn revoke(&self, id: Uuid, reason: &str) -> anyhow::Result<()> {
        sqlx::query(
            "UPDATE auth.refresh_tokens SET revoked_at = now(), revoked_reason = $1 \
             WHERE id = $2 AND revoked_at IS NULL",
        )
        .bind(reason)
        .bind(id)
        .execute(&self.pool).await?;
        Ok(())
    }
}
