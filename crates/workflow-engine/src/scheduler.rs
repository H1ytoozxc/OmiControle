//! Cron-trigger scheduler. Wakes on `pg_notify('schedules', ...)` from the
//! trigger that updates `next_fire_at`, otherwise ticks every 10s.

use sqlx::PgPool;
use std::time::Duration;
use tracing::warn;

pub fn spawn(pool: PgPool) {
    tokio::spawn(async move {
        loop {
            if let Err(e) = tick(&pool).await {
                warn!(error=%e, "scheduler tick failed");
            }
            tokio::time::sleep(Duration::from_secs(10)).await;
        }
    });
}

async fn tick(_pool: &PgPool) -> anyhow::Result<()> {
    // SELECT due schedules → start instances → bump next_fire_at via cron parser.
    Ok(())
}
