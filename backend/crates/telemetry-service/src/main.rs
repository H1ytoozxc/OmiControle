//! Sequoia Telemetry Service.
//!
//! Accepts metric/event ingestion via gRPC client-streaming, writes to a
//! TimescaleDB hypertable, and serves queries for metrics + events.

mod config;
mod ingest;
mod query;
mod grpc;

use anyhow::Context;
use std::net::SocketAddr;
use std::sync::Arc;
use tonic::transport::Server;
use tracing::info;

use crate::config::TelemetryServiceConfig;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> anyhow::Result<()> {
    let cfg: TelemetryServiceConfig = sequoia_config::load(&sequoia_config::LoadOptions {
        env_prefix: "TELEMETRY",
        ..Default::default()
    })?;
    let _telemetry = sequoia_telemetry::init(sequoia_telemetry::TelemetryConfig {
        service_name: "telemetry-service".into(),
        service_namespace: "sequoia".into(),
        otlp_endpoint: cfg.otlp_endpoint.clone(),
        sample_ratio: 0.05,
        log_filter: cfg.log_filter.clone(),
        enable_prometheus: true,
    })?;

    let pool = sequoia_db::init_pool(&cfg.database).await?;
    let svc = grpc::TelemetryGrpc { pool, cfg: Arc::new(cfg.clone()) };

    let addr: SocketAddr = cfg.bind.parse().context("bind")?;
    info!(addr=%addr, "telemetry-service listening");
    Server::builder()
        .add_service(sequoia_proto::sequoia::v1::telemetry_service_server::TelemetryServiceServer::new(svc))
        .serve(addr).await?;
    Ok(())
}
