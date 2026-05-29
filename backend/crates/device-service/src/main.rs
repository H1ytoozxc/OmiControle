//! Sequoia Device Service.
//!
//! Two concerns:
//!   1. Operator-facing CRUD over gRPC (enrollment codes, list/get/delete).
//!   2. Agent-facing bi-di stream multiplexer — every connected device holds
//!      exactly one `Channel` RPC; this binary keeps an in-memory routing
//!      table mapping `device_id -> mpsc::Sender<ServerMessage>` so other
//!      services (Command Executor, Plugin Host) can push messages out.

mod config;
mod registry;
mod grpc;

use anyhow::Context;
use std::net::SocketAddr;
use std::sync::Arc;
use tonic::transport::Server;
use tracing::info;

use crate::config::DeviceConfig;
use crate::registry::ChannelRegistry;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> anyhow::Result<()> {
    let cfg: DeviceConfig = sequoia_config::load(&sequoia_config::LoadOptions {
        env_prefix: "DEVICE",
        ..Default::default()
    })?;

    let _telemetry = sequoia_telemetry::init(sequoia_telemetry::TelemetryConfig {
        service_name: "device-service".into(),
        service_namespace: "sequoia".into(),
        otlp_endpoint: cfg.otlp_endpoint.clone(),
        sample_ratio: 0.2,
        log_filter: cfg.log_filter.clone(),
        enable_prometheus: true,
    })?;

    let pool = sequoia_db::init_pool(&cfg.database).await?;
    let registry = Arc::new(ChannelRegistry::default());

    let svc = grpc::DeviceGrpc {
        pool,
        registry: registry.clone(),
        cfg: Arc::new(cfg.clone()),
    };

    let addr: SocketAddr = cfg.grpc_bind.parse().context("bind")?;
    info!(addr=%addr, "device-service listening");
    Server::builder()
        .add_service(sequoia_proto::sequoia::v1::device_service_server::DeviceServiceServer::new(svc))
        .serve(addr)
        .await?;
    Ok(())
}
