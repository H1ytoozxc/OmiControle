//! Sequoia Notification Service.
//!
//! Multi-channel delivery (push / email / webhook / sms). Each `Send` enqueues
//! a row in `notification.deliveries`; a worker pool drains it with retries
//! and exponential backoff. Failed deliveries become `bounced` after N tries.

mod config;
mod channels;
mod worker;
mod grpc;

use anyhow::Context;
use std::net::SocketAddr;
use std::sync::Arc;
use tonic::transport::Server;
use tracing::info;

use crate::config::NotifyConfig;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> anyhow::Result<()> {
    let cfg: NotifyConfig = sequoia_config::load(&sequoia_config::LoadOptions {
        env_prefix: "NOTIFY",
        ..Default::default()
    })?;
    let _telem = sequoia_telemetry::init(sequoia_telemetry::TelemetryConfig {
        service_name: "notification-service".into(),
        service_namespace: "sequoia".into(),
        otlp_endpoint: cfg.otlp_endpoint.clone(),
        sample_ratio: 0.2,
        log_filter: cfg.log_filter.clone(),
        enable_prometheus: true,
    })?;

    let pool = sequoia_db::init_pool(&cfg.database).await?;
    worker::spawn(pool.clone());

    let svc = grpc::NotifyGrpc { pool, cfg: Arc::new(cfg.clone()) };
    let addr: SocketAddr = cfg.bind.parse().context("bind")?;
    info!(addr=%addr, "notification-service listening");
    Server::builder()
        .add_service(sequoia_proto::sequoia::v1::notification_service_server::NotificationServiceServer::new(svc))
        .serve(addr).await?;
    Ok(())
}
