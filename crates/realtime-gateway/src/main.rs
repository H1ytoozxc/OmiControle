//! Sequoia Realtime Gateway.
//!
//! Long-lived WebSocket fan-out:
//!  - Client connects with a one-time `ticket` query param (60s TTL, issued
//!    by auth-service).
//!  - Upgrade succeeds, then the connection is added to a tenant/user hub.
//!  - Events arrive from Redis Streams (`events.realtime.*`) and are routed
//!    to subscribed connections via a local fan-out index.
//!  - Heartbeat: server pings every 20s; clients must pong within 5s.

mod config;
mod hub;
mod ws;

use anyhow::Context;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::signal;
use tracing::info;

use crate::config::RealtimeConfig;
use crate::hub::Hub;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> anyhow::Result<()> {
    let cfg: RealtimeConfig = sequoia_config::load(&sequoia_config::LoadOptions {
        env_prefix: "REALTIME",
        ..Default::default()
    })?;

    let _telemetry = sequoia_telemetry::init(sequoia_telemetry::TelemetryConfig {
        service_name: "realtime-gateway".into(),
        service_namespace: "sequoia".into(),
        otlp_endpoint: cfg.otlp_endpoint.clone(),
        sample_ratio: 0.05,    // realtime is high-volume; lower sample
        log_filter: cfg.log_filter.clone(),
        enable_prometheus: true,
    })?;

    let hub = Arc::new(Hub::new(cfg.clone()).await?);
    hub.clone().spawn_event_pump();

    let app = ws::router(hub.clone());

    let addr: SocketAddr = cfg.bind.parse().context("bind")?;
    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!(addr=%addr, "realtime-gateway listening");

    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(async {
            let _ = signal::ctrl_c().await;
        })
        .await?;
    Ok(())
}
