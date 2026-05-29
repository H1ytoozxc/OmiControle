//! Delivery worker: poll pending deliveries, try, retry with jittered backoff.

use sqlx::PgPool;
use std::time::Duration;
use tracing::warn;

pub fn spawn(pool: PgPool) {
    tokio::spawn(async move {
        loop {
            if let Err(e) = tick(&pool).await {
                warn!(error=%e, "notification tick failed");
            }
            tokio::time::sleep(Duration::from_secs(1)).await;
        }
    });
}

async fn tick(_pool: &PgPool) -> anyhow::Result<()> {
    // SELECT ... FOR UPDATE SKIP LOCKED of pending deliveries; dispatch via Channel.
    // On failure: increment attempts, set next_attempt = now + backoff(attempt).
    Ok(())
}
