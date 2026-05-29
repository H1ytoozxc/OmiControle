//! Sequoia Plugin Host.
//!
//! WASI Preview 2 component runtime. Bundles arrive via gRPC + object storage;
//! signatures verified before instantiation; capabilities enforced via WASI
//! handles + wasmtime fuel limits.

mod config;
mod runtime;
mod grpc;

use anyhow::Context;
use std::net::SocketAddr;
use std::sync::Arc;
use tonic::transport::Server;
use tracing::info;

use crate::config::PluginConfig;
use crate::runtime::WasmRuntime;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> anyhow::Result<()> {
    let cfg: PluginConfig = sequoia_config::load(&sequoia_config::LoadOptions {
        env_prefix: "PLUGIN",
        ..Default::default()
    })?;
    let _telem = sequoia_telemetry::init(sequoia_telemetry::TelemetryConfig {
        service_name: "plugin-host".into(),
        service_namespace: "sequoia".into(),
        otlp_endpoint: cfg.otlp_endpoint.clone(),
        sample_ratio: 0.3,
        log_filter: cfg.log_filter.clone(),
        enable_prometheus: true,
    })?;

    let pool = sequoia_db::init_pool(&cfg.database).await?;
    let rt = Arc::new(WasmRuntime::new(&cfg)?);

    let svc = grpc::PluginGrpc { pool, runtime: rt, cfg: Arc::new(cfg.clone()) };
    let addr: SocketAddr = cfg.bind.parse().context("bind")?;
    info!(addr=%addr, "plugin-host listening");
    Server::builder()
        .add_service(sequoia_proto::sequoia::v1::plugin_host_server::PluginHostServer::new(svc))
        .serve(addr).await?;
    Ok(())
}
