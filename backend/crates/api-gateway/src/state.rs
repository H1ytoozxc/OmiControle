use std::sync::Arc;

use governor::{
    clock::DefaultClock,
    middleware::NoOpMiddleware,
    state::{InMemoryState, NotKeyed},
    Quota, RateLimiter,
};
use sequoia_auth::jwks::JwksCache;
use sequoia_auth::Verifier;

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
}

impl AppState {
    pub async fn build(cfg: &GatewayConfig) -> anyhow::Result<Self> {
        let jwks = Arc::new(JwksCache::new(cfg.auth.jwks_url.clone()));
        let jwt_verifier = Verifier::new(cfg.auth.issuer.clone(), cfg.auth.audience.clone(), jwks);

        let ip_quota = Quota::per_second(
            std::num::NonZeroU32::new(cfg.rate_limit.per_ip_rps).unwrap()
        ).allow_burst(std::num::NonZeroU32::new(cfg.rate_limit.burst).unwrap());

        let ip_limiter = governor::RateLimiter::keyed(ip_quota);

        let global_quota = Quota::per_second(
            std::num::NonZeroU32::new(cfg.rate_limit.per_tenant_rps).unwrap()
        );
        let global_limiter = RateLimiter::direct(global_quota);

        Ok(Self {
            cfg: cfg.clone(),
            jwt_verifier,
            ip_limiter,
            global_limiter,
        })
    }
}
