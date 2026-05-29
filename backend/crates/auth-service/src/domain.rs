//! Pure domain types. No I/O.

use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub email: String,
    pub display_name: Option<String>,
    pub bio: Option<String>,
    pub status: UserStatus,
    pub mfa_enabled: bool,
    pub created_at: OffsetDateTime,
    pub last_login_at: Option<OffsetDateTime>,
}

#[derive(Debug, Clone, Copy, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserStatus {
    Active,
    Disabled,
    Locked,
    /// Account created but not yet approved by an admin.
    Pending,
}

#[derive(Debug, Clone)]
pub struct NewUser {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub email: String,
    pub display_name: Option<String>,
    pub password_hash: String,
}

#[derive(Debug, Clone)]
pub struct ServiceToken {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub created_by: Uuid,
    pub name: String,
    pub token_sha256: [u8; 32],
    pub prefix: String,
    pub created_at: OffsetDateTime,
    pub last_used_at: Option<OffsetDateTime>,
    pub revoked_at: Option<OffsetDateTime>,
}

#[derive(Debug, Clone)]
pub struct Session {
    pub id: Uuid,
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub created_at: OffsetDateTime,
}

#[derive(Debug, Clone)]
pub struct RefreshToken {
    pub id: Uuid,
    pub session_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub token_sha256: [u8; 32],
    pub expires_at: OffsetDateTime,
    pub revoked_at: Option<OffsetDateTime>,
}
