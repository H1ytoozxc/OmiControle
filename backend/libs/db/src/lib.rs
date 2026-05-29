//! Postgres pool + transactional outbox helper.

pub mod pool;
pub mod outbox;

pub use pool::{init_pool, PoolConfig, PgPool};
pub use outbox::OutboxRow;
