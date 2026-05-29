//! Sequoia Command Executor.
//!
//! Authorized relay for operator-issued device commands.
//! Flow:
//!   operator → API gateway → CommandExecutor.Dispatch → eventbus
//!     → Device Service registry → device agent over bidi stream.
//!
//! Commands are Ed25519-signed by the issuing operator. The agent verifies
//! signatures against the operator's published key before execution.

mod config;
mod sign;
mod grpc;

use anyhow::Context;
use std::net::SocketAddr;
use std::sync::Arc;
use tonic::transport::Server;
use tracing::info;

use crate::config::ExecConfig;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> anyhow::Result<()> {
    let cfg: ExecConfig = sequoia_config::load(&sequoia_config::LoadOptions {
        env_prefix: "EXEC",
        ..Default::default()
    })?;
    let _telem = sequoia_telemetry::init(sequoia_telemetry::TelemetryConfig {
        service_name: "command-executor".into(),
        service_namespace: "sequoia".into(),
        otlp_endpoint: cfg.otlp_endpoint.clone(),
        sample_ratio: 0.5,
        log_filter: cfg.log_filter.clone(),
        enable_prometheus: true,
    })?;

    let svc = grpc::ExecGrpc { cfg: Arc::new(cfg.clone()) };
    let addr: SocketAddr = cfg.bind.parse().context("bind")?;
    info!(addr=%addr, "command-executor listening");
    Server::builder()
        .add_service(sequoia_proto::sequoia::v1::command_executor_server::CommandExecutorServer::new(svc))
        .serve(addr).await?;
    Ok(())
}
