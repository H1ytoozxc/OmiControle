//! Workflow worker pool.

use sqlx::PgPool;
use std::time::Duration;
use tracing::warn;

pub fn spawn_pool(pool: PgPool, concurrency: usize) {
    for worker_id in 0..concurrency {
        let p = pool.clone();
        tokio::spawn(async move {
            let name = format!("wfw-{worker_id}");
            loop {
                match claim_and_run(&p, &name).await {
                    Ok(true)  => {}
                    Ok(false) => tokio::time::sleep(Duration::from_millis(250)).await,
                    Err(e)    => { warn!(error=%e, worker=%name, "claim failed"); tokio::time::sleep(Duration::from_secs(1)).await; }
                }
            }
        });
    }
}

/// Returns true if a step was processed, false if nothing was pending.
async fn claim_and_run(_pool: &PgPool, _worker: &str) -> anyhow::Result<bool> {
    // SELECT FOR UPDATE SKIP LOCKED on workflow.instances joined to leases;
    // claim, run a single step via crate::step::execute, commit, release lease.
    Ok(false)
}
