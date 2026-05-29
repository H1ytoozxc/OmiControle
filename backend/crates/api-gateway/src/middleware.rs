use std::net::SocketAddr;
use std::sync::Arc;

use axum::body::Body;
use axum::extract::{ConnectInfo, State};
use axum::http::{HeaderValue, Request};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};

use sequoia_common::error::Error;

use crate::errors::ApiError;
use crate::state::AppState;

const PUBLIC_PREFIXES: &[&str] = &[
    "/healthz",
    "/readyz",
    "/metrics",
    "/.well-known/",
    "/auth/oidc/",
    "/v1/auth/login",
    "/v1/auth/refresh",
    // Logout authenticates via possession of the refresh_token in the body —
    // requiring a valid access token would prevent logout after expiry.
    "/v1/auth/logout",
];

pub async fn auth_layer(
    State(state): State<Arc<AppState>>,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, ApiError> {
    let path = req.uri().path().to_owned();
    if PUBLIC_PREFIXES.iter().any(|p| path.starts_with(p)) {
        return Ok(next.run(req).await);
    }

    let auth_hdr = req.headers().get(axum::http::header::AUTHORIZATION).cloned();
    let token = auth_hdr
        .and_then(|v| v.to_str().ok().map(str::to_owned))
        .and_then(|s| s.strip_prefix("Bearer ").map(str::to_owned))
        .ok_or(Error::Unauthenticated)?;

    let claims = state.jwt_verifier.verify(&token).await.map_err(|_| Error::Unauthenticated)?;

    // Stash claims into request extensions so handlers can pick them up.
    req.extensions_mut().insert(claims);
    Ok(next.run(req).await)
}

pub async fn rate_limit_layer(
    State(state): State<Arc<AppState>>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, ApiError> {
    let key = peer.ip().to_string();
    if state.ip_limiter.check_key(&key).is_err() {
        let mut resp = ApiError::from(Error::RateLimited { retry_after_ms: 1000 }).into_response();
        resp.headers_mut().insert(
            axum::http::header::RETRY_AFTER,
            HeaderValue::from_static("1"),
        );
        return Ok(resp);
    }
    if state.global_limiter.check().is_err() {
        return Ok(ApiError::from(Error::RateLimited { retry_after_ms: 100 }).into_response());
    }
    Ok(next.run(req).await)
}
