use std::sync::Arc;

use anyhow::Context;
use governor::{
    clock::DefaultClock,
    middleware::NoOpMiddleware,
    state::{InMemoryState, NotKeyed},
    Quota, RateLimiter,
};
use sequoia_auth::jwks::JwksCache;
use sequoia_auth::Verifier;
use sequoia_proto::sequoia::v1::auth_service_client::AuthServiceClient;
use sequoia_proto::sequoia::v1::device_service_client::DeviceServiceClient;
use tonic::transport::Channel;

use crate::config::GatewayConfig;

pub struct AppState {
    pub cfg: GatewayConfig,
    pub jwt_verifier: Verifier,

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
}

impl AppState {
    pub async fn build(cfg: &GatewayConfig) -> anyhow::Result<Self> {
        let jwks = Arc::new(JwksCache::new(cfg.auth.jwks_url.clone()));
        let jwt_verifier = Verifier::new(cfg.auth.issuer.clone(), cfg.auth.audience.clone(), jwks);

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

        let device_client = build_grpc_client::<DeviceServiceClient<Channel>>(
            "device-service",
            &cfg.upstreams.device,
            DeviceServiceClient::new,
        )?;
        let auth_client = build_grpc_client::<AuthServiceClient<Channel>>(
            "auth-service",
            &cfg.upstreams.auth,
            AuthServiceClient::new,
        )?;

        Ok(Self {
            cfg: cfg.clone(),
            jwt_verifier,
            ip_limiter,
            global_limiter,
            ws_ticket_key,
            device_client,
            auth_client,
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
