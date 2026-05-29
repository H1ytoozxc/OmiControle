//! Sequoia Workflow Engine.
//!
//! Durable, retryable, idempotent task DAGs.
//!
//! Architecture summary (full details in ARCHITECTURE.md):
//! - `definitions` describe a DAG of steps (Rust trait impls or WASM exports).
//! - `instances` track a single run; `cursor` records the last committed
//!   position so a crashed worker can resume from there.
//! - Workers pull leases via `SELECT FOR UPDATE SKIP LOCKED`; a step commits
//!   its result and clears the lease in a single Postgres tx.
//! - Triggers: cron schedule, eventbus subscription, gateway-initiated, AI tool.

mod config;
mod scheduler;
mod worker;
mod step;
mod grpc;

use anyhow::Context;
use std::net::SocketAddr;
use std::sync::Arc;
use tonic::transport::Server;
use tracing::info;

use crate::config::WorkflowConfig;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> anyhow::Result<()> {
    let cfg: WorkflowConfig = sequoia_config::load(&sequoia_config::LoadOptions {
        env_prefix: "WORKFLOW",
        ..Default::default()
    })?;
    let _telem = sequoia_telemetry::init(sequoia_telemetry::TelemetryConfig {
        service_name: "workflow-engine".into(),
        service_namespace: "sequoia".into(),
        otlp_endpoint: cfg.otlp_endpoint.clone(),
        sample_ratio: 0.2,
        log_filter: cfg.log_filter.clone(),
        enable_prometheus: true,
    })?;

    let pool = sequoia_db::init_pool(&cfg.database).await?;
    worker::spawn_pool(pool.clone(), cfg.worker_concurrency);
    scheduler::spawn(pool.clone());

    let svc = grpc::WorkflowGrpc { pool, cfg: Arc::new(cfg.clone()) };
    let addr: SocketAddr = cfg.bind.parse().context("bind")?;
    info!(addr=%addr, "workflow-engine listening");
    Server::builder()
        .add_service(sequoia_proto::sequoia::v1::workflow_engine_server::WorkflowEngineServer::new(svc))
        .serve(addr).await?;
    Ok(())
}
