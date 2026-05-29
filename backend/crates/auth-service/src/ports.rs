//! Hexagonal ports: traits the application layer depends on, not concrete impls.

use async_trait::async_trait;
use uuid::Uuid;

use crate::domain::{NewUser, RefreshToken, Session, User, UserStatus};

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_email(&self, tenant_id: Uuid, email: &str) -> anyhow::Result<Option<User>>;
    async fn find_by_id(&self, id: Uuid) -> anyhow::Result<Option<User>>;
    async fn touch_login(&self, id: Uuid) -> anyhow::Result<()>;
    async fn password_hash(&self, id: Uuid) -> anyhow::Result<Option<String>>;
    async fn update_status(&self, id: Uuid, status: UserStatus) -> anyhow::Result<()>;
    async fn create(&self, user: &NewUser) -> anyhow::Result<()>;
    async fn list_pending(&self, tenant_id: Uuid) -> anyhow::Result<Vec<User>>;
    async fn delete(&self, id: Uuid) -> anyhow::Result<()>;
}

#[async_trait]
pub trait SessionRepository: Send + Sync {
    async fn create(&self, sess: &Session) -> anyhow::Result<()>;
    async fn revoke(&self, session_id: Uuid, reason: &str) -> anyhow::Result<()>;
}

#[async_trait]
pub trait RefreshRepository: Send + Sync {
    async fn store(&self, tok: &RefreshToken) -> anyhow::Result<()>;
    async fn find_by_hash(&self, h: &[u8; 32]) -> anyhow::Result<Option<RefreshToken>>;
    async fn revoke_family(&self, session_id: Uuid, reason: &str) -> anyhow::Result<()>;
    async fn revoke(&self, id: Uuid, reason: &str) -> anyhow::Result<()>;
}
