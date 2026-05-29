use std::sync::Arc;

use anyhow::Context;
use governor::{
    clock::DefaultClock,
    middleware::NoOpMiddleware,
    state::{InMemoryState, NotKeyed},
    Quota, RateLimiter,
};
use sequoia_auth::jwks::JwksCache;
use sequoia_auth::{Claims, LocalVerifier, Verifier};
use sequoia_auth::jwt::JwtError;
use sequoia_proto::sequoia::v1::ai_orchestrator_client::AiOrchestratorClient;
use sequoia_proto::sequoia::v1::auth_service_client::AuthServiceClient;
use sequoia_proto::sequoia::v1::device_service_client::DeviceServiceClient;
use sequoia_proto::sequoia::v1::notification_service_client::NotificationServiceClient;
use sequoia_proto::sequoia::v1::workflow_engine_client::WorkflowEngineClient;
use tonic::transport::Channel;

use crate::config::GatewayConfig;

/// Token verifier choice — JWKS-backed (production, supports key rotation)
/// or local (v0.1, shares the public key out-of-band).
#[derive(Clone)]
pub enum JwtVerifier {
    Jwks(Verifier),
    Local(LocalVerifier),
}

impl JwtVerifier {
    pub async fn verify(&self, token: &str) -> Result<Claims, JwtError> {
        match self {
            Self::Jwks(v) => v.verify(token).await,
            Self::Local(v) => v.verify(token),
        }
    }
}

pub struct AppState {
    pub cfg: GatewayConfig,
    pub jwt_verifier: JwtVerifier,

    pub ip_limiter: governor::RateLimiter<
        String,
        governor::state::keyed::DefaultKeyedStateStore<String>,
        DefaultClock,
        NoOpMiddleware,
    >,
    pub global_limiter: RateLimiter<NotKeyed, InMemoryState, DefaultClock>,

    /// Decoded HMAC key for issuing WebSocket tickets. `None` disables issuance.
    pub ws_ticket_key: Option<Vec<u8>>,

    /// gRPC client for device-service. Connected lazily so the gateway starts
    /// even if the downstream is briefly unavailable; calls return Unavailable
    /// until the channel reconnects.
    pub device_client: Option<DeviceServiceClient<Channel>>,

    /// gRPC client for auth-service. Same lazy-connect rationale as device.
    pub auth_client: Option<AuthServiceClient<Channel>>,
    pub ai_client: Option<AiOrchestratorClient<Channel>>,
    pub workflow_client: Option<WorkflowEngineClient<Channel>>,
    pub notify_client: Option<NotificationServiceClient<Channel>>,

    /// Prometheus exporter for the `/metrics` route. `None` when telemetry's
    /// `enable_prometheus` is false; route returns 503 in that case.
    pub prometheus: Option<metrics_exporter_prometheus::PrometheusHandle>,
}

impl AppState {
    pub async fn build(
        cfg: &GatewayConfig,
        prometheus: Option<metrics_exporter_prometheus::PrometheusHandle>,
    ) -> anyhow::Result<Self> {
        let jwt_verifier = if cfg.auth.local_public_key_pem.is_empty() {
            let jwks = Arc::new(JwksCache::new(cfg.auth.jwks_url.clone()));
            JwtVerifier::Jwks(Verifier::new(
                cfg.auth.issuer.clone(),
                cfg.auth.audience.clone(),
                jwks,
            ))
        } else {
            let pem = sequoia_config::resolve_secret(&cfg.auth.local_public_key_pem)
                .context("resolve auth.local_public_key_pem")?;
            let local = LocalVerifier::from_es256_pem(
                pem.as_bytes(),
                cfg.auth.issuer.clone(),
                cfg.auth.audience.clone(),
            ).map_err(|e| anyhow::anyhow!("local verifier: {e}"))?;
            tracing::info!("using LocalVerifier for access-token verification (JWKS bypassed)");
            JwtVerifier::Local(local)
        };

        let per_ip = std::num::NonZeroU32::new(cfg.rate_limit.per_ip_rps)
            .context("rate_limit.per_ip_rps must be > 0")?;
        let burst = std::num::NonZeroU32::new(cfg.rate_limit.burst)
            .context("rate_limit.burst must be > 0")?;
        let per_tenant = std::num::NonZeroU32::new(cfg.rate_limit.per_tenant_rps)
            .context("rate_limit.per_tenant_rps must be > 0")?;

        let ip_quota = Quota::per_second(per_ip).allow_burst(burst);
        let ip_limiter = governor::RateLimiter::keyed(ip_quota);

        let global_quota = Quota::per_second(per_tenant);
        let global_limiter = RateLimiter::direct(global_quota);

        let ws_ticket_key = if cfg.ws_ticket_hmac_key_b64.is_empty() {
            tracing::warn!("WS_TICKET_HMAC_KEY_B64 not set; /v1/auth/ws-ticket will return 503");
            None
        } else {
            Some(sequoia_auth::ticket::decode_key(&cfg.ws_ticket_hmac_key_b64)
                .context("ws_ticket_hmac_key_b64 must be base64url-encoded and ≥ 32 bytes")?)
        };

        let device_client = build_grpc_client("device-service", &cfg.upstreams.device, DeviceServiceClient::new)?;
        let auth_client = build_grpc_client("auth-service", &cfg.upstreams.auth, AuthServiceClient::new)?;
        let ai_client = build_grpc_client("ai-orchestrator", &cfg.upstreams.ai, AiOrchestratorClient::new)?;
        let workflow_client = build_grpc_client("workflow-engine", &cfg.upstreams.workflow, WorkflowEngineClient::new)?;
        let notify_client = build_grpc_client("notification-service", &cfg.upstreams.notification, NotificationServiceClient::new)?;

        Ok(Self {
            cfg: cfg.clone(),
            jwt_verifier,
            ip_limiter,
            global_limiter,
            ws_ticket_key,
            device_client,
            auth_client,
            ai_client,
            workflow_client,
            notify_client,
            prometheus,
        })
    }
}

fn build_grpc_client<C>(
    name: &'static str,
    upstream: &str,
    ctor: impl FnOnce(Channel) -> C,
) -> anyhow::Result<Option<C>> {
    if upstream.is_empty() {
        tracing::warn!(service = name, "upstream not configured; routes will return 503");
        return Ok(None);
    }
    let endpoint = tonic::transport::Endpoint::from_shared(upstream.to_owned())
        .with_context(|| format!("upstream URI invalid for {name}"))?
        .connect_timeout(std::time::Duration::from_secs(5))
        .timeout(std::time::Duration::from_secs(15));
    Ok(Some(ctor(endpoint.connect_lazy())))
}
