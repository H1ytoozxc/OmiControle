//! Sequoia Auth Service.
//!
//! Owns: users, sessions, refresh tokens, OIDC linkage, signing keys.
//! Exposes: gRPC `AuthService` for internal callers, HTTPS endpoints for
//! OIDC callback + JWKS publication.

mod config;
mod domain;
mod ports;
mod adapters;
mod app;
mod grpc;

use anyhow::Context;
use std::net::SocketAddr;
use std::sync::Arc;
use tonic::transport::Server;
use tracing::info;

use crate::config::AuthConfig;
use crate::app::AuthApp;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> anyhow::Result<()> {
    let cfg: AuthConfig = sequoia_config::load(&sequoia_config::LoadOptions {
        env_prefix: "AUTH",
        ..Default::default()
    })
    .context("config")?;

    let _telemetry = sequoia_telemetry::init(sequoia_telemetry::TelemetryConfig {
        service_name: "auth-service".into(),
        service_namespace: "sequoia".into(),
        otlp_endpoint: cfg.otlp_endpoint.clone(),
        sample_ratio: 0.2,
        log_filter: cfg.log_filter.clone(),
        enable_prometheus: true,
    })?;

    let pool = sequoia_db::init_pool(&cfg.database).await.context("db pool")?;
    let app = Arc::new(AuthApp::new(cfg.clone(), pool).await?);

    let svc = grpc::AuthGrpc { app: app.clone() };

    let (health_reporter, health_service) = tonic_health::server::health_reporter();
    health_reporter
        .set_serving::<sequoia_proto::sequoia::v1::auth_service_server::AuthServiceServer<grpc::AuthGrpc>>()
        .await;

    let reflection = tonic_reflection::server::Builder::configure()
        .register_encoded_file_descriptor_set(sequoia_proto::FILE_DESCRIPTOR_SET)
        .build_v1()?;

    let addr: SocketAddr = cfg.bind.parse().context("bind")?;
    info!(addr=%addr, "auth-service listening");
    Server::builder()
        .layer(tower_http_otel_layer())
        .add_service(health_service)
        .add_service(reflection)
        .add_service(sequoia_proto::sequoia::v1::auth_service_server::AuthServiceServer::new(svc))
        .serve(addr)
        .await
        .context("grpc serve")
}

fn tower_http_otel_layer() -> tower::layer::util::Identity {
    // Placeholder: integrate `tower-http::trace::TraceLayer` + tonic interceptor
    // for OpenTelemetry baggage propagation. Kept identity here to keep the
    // example focused; production wires the full layer stack.
    tower::layer::util::Identity::new()
}
