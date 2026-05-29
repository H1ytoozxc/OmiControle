//! Sequoia API Gateway.
//!
//! Responsibilities:
//! - Terminate TLS, accept HTTP/1.1 and HTTP/2.
//! - Verify JWTs via `sequoia-auth`, build a `RequestContext`.
//! - Apply per-route, per-tenant, per-IP rate limits.
//! - Route REST calls to internal gRPC services (typed clients).
//! - Emit RFC-7807 problem responses for any error.
//! - Propagate W3C traceparent and our `x-correlation-id` to downstream calls.

mod config;
mod state;
mod routes;
mod middleware;
mod errors;

use anyhow::Context;
use axum::http::{header, HeaderName, HeaderValue, Method};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::signal;
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};
use tracing::{info, warn};

use crate::config::GatewayConfig;
use crate::state::AppState;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> anyhow::Result<()> {
    let cfg: GatewayConfig = sequoia_config::load(&sequoia_config::LoadOptions {
        env_prefix: "GATEWAY",
        ..Default::default()
    })
    .context("loading gateway config")?;

    let _telemetry = sequoia_telemetry::init(sequoia_telemetry::TelemetryConfig {
        service_name: "api-gateway".into(),
        service_namespace: "sequoia".into(),
        otlp_endpoint: cfg.otlp_endpoint.clone(),
        sample_ratio: 0.2,
        log_filter: cfg.log_filter.clone(),
        enable_prometheus: true,
    })
    .context("telemetry init")?;

    let state = Arc::new(AppState::build(&cfg).await?);

    let app = routes::build_router(state.clone())
        .layer(
            tower::ServiceBuilder::new()
                .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid))
                .layer(PropagateRequestIdLayer::x_request_id())
                .layer(TraceLayer::new_for_http())
                .layer(TimeoutLayer::new(std::time::Duration::from_secs(cfg.request_timeout_s)))
                .layer(build_cors(&cfg.cors_origins))
                .layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    middleware::auth_layer,
                ))
                .layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    middleware::rate_limit_layer,
                )),
        );

    let addr: SocketAddr = cfg.bind.parse().context("bind addr")?;
    let listener = tokio::net::TcpListener::bind(addr).await.context("bind")?;
    info!(addr=%addr, "api-gateway listening");

    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("serve")?;
    Ok(())
}

fn build_cors(origins: &[String]) -> CorsLayer {
    let base = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::PATCH, Method::OPTIONS])
        .allow_headers([
            header::AUTHORIZATION,
            header::CONTENT_TYPE,
            header::ACCEPT,
            HeaderName::from_static("x-correlation-id"),
            HeaderName::from_static("x-request-id"),
        ])
        .max_age(std::time::Duration::from_secs(86400));

    // "*" → mirror request origin without credentials (Any).
    // Otherwise: explicit allowlist with credentials allowed.
    if origins.iter().any(|o| o == "*") {
        warn!("CORS configured with wildcard origin; credentials will NOT be allowed");
        return base.allow_origin(AllowOrigin::any());
    }
    let parsed: Vec<HeaderValue> = origins
        .iter()
        .filter_map(|o| match HeaderValue::from_str(o) {
            Ok(v) => Some(v),
            Err(_) => {
                warn!(origin = %o, "skipping malformed CORS origin");
                None
            }
        })
        .collect();
    base.allow_origin(parsed).allow_credentials(true)
}

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let terminate = async {
        let mut s = signal::unix::signal(signal::unix::SignalKind::terminate()).expect("sig");
        s.recv().await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
    info!("shutdown signal received, draining");
}
