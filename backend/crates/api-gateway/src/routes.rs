use std::sync::Arc;

use axum::extract::{Extension, Path, Query, State};
use axum::http::StatusCode;
use axum::routing::{get, post, delete};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use sequoia_auth::Claims;
use sequoia_common::error::Error;
use sequoia_common::pagination::PageRequest;

use crate::errors::ApiError;
use crate::state::AppState;

pub fn build_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/healthz/live",  get(|| async { (StatusCode::OK, "ok") }))
        .route("/healthz/ready", get(ready))
        .route("/metrics",       get(metrics))
        .route("/.well-known/jwks.json", get(jwks))

        // Auth
        .route("/v1/auth/login",     post(auth_login))
        .route("/v1/auth/refresh",   post(auth_refresh))
        .route("/v1/auth/ws-ticket", post(ws_ticket))

        // Devices
        .route("/v1/devices",                get(devices_list))
        .route("/v1/devices/:id",            get(device_get))
        .route("/v1/devices/:id",            delete(device_delete))
        .route("/v1/devices/enrollments",    post(device_enroll))

        // AI
        .route("/v1/ai/agents",              get(ai_agents_list).post(ai_agents_create))
        .route("/v1/ai/agents/:id/runs",     post(ai_run_start))
        .route("/v1/ai/runs/:id/stream",     get(ai_run_stream))

        // Workflow
        .route("/v1/workflows",              get(wf_list).post(wf_create))
        .route("/v1/workflows/:id/instances",post(wf_start))
        .route("/v1/workflows/instances/:id",get(wf_get))

        .with_state(state)
}

#[derive(Serialize)] struct Health { ok: bool }
async fn ready(State(_s): State<Arc<AppState>>) -> Json<Health> { Json(Health { ok: true }) }

async fn metrics() -> &'static str {
    // metrics-exporter-prometheus installs a global recorder; this is a stub
    // — production routes /metrics to the exporter's `render()`.
    ""
}

async fn jwks(State(_s): State<Arc<AppState>>) -> Json<serde_json::Value> {
    // proxied from auth-service
    Json(serde_json::json!({ "keys": [] }))
}

// --- Auth ---

#[derive(Deserialize)] struct LoginBody { email: String, password: String }
#[derive(Serialize)]   struct TokenResp { access_token: String, refresh_token: String, access_ttl_s: u32 }

async fn auth_login(State(_s): State<Arc<AppState>>, Json(_body): Json<LoginBody>)
    -> Result<Json<TokenResp>, ApiError>
{
    // delegates to auth-service via tonic client; stubbed here.
    Ok(Json(TokenResp { access_token: String::new(), refresh_token: String::new(), access_ttl_s: 900 }))
}

#[derive(Deserialize)] struct RefreshBody { refresh_token: String }
async fn auth_refresh(State(_s): State<Arc<AppState>>, Json(_body): Json<RefreshBody>)
    -> Result<Json<TokenResp>, ApiError>
{
    Ok(Json(TokenResp { access_token: String::new(), refresh_token: String::new(), access_ttl_s: 900 }))
}

#[derive(Serialize)] struct WsTicketResp { ticket: String, expires_in_s: u32 }

/// Issue a short-lived HMAC ticket bound to (tenant, user) from the caller's
/// access JWT. The realtime-gateway verifies these on `GET /ws?ticket=...`.
async fn ws_ticket(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<WsTicketResp>, ApiError> {
    let key = s.ws_ticket_key.as_ref()
        .ok_or(Error::UpstreamUnavailable("ws ticket issuance not configured"))?;
    let ticket = sequoia_auth::ticket::issue(
        key,
        &claims.tid,
        &claims.sub,
        s.cfg.ws_ticket_ttl_s as i64,
    ).map_err(|e| Error::Internal(anyhow::anyhow!(e.to_string())))?;
    Ok(Json(WsTicketResp {
        ticket,
        expires_in_s: s.cfg.ws_ticket_ttl_s,
    }))
}

// --- Devices ---

#[derive(Serialize)] struct DeviceDto { id: String, name: String, status: String }
#[derive(Serialize)] struct DeviceListResp { items: Vec<DeviceDto>, next_cursor: Option<String> }

async fn devices_list(State(_s): State<Arc<AppState>>, Query(_p): Query<PageRequest>)
    -> Result<Json<DeviceListResp>, ApiError>
{
    Ok(Json(DeviceListResp { items: vec![], next_cursor: None }))
}
async fn device_get(State(_s): State<Arc<AppState>>, Path(_id): Path<String>)
    -> Result<Json<DeviceDto>, ApiError>
{
    Ok(Json(DeviceDto { id: "".into(), name: "".into(), status: "offline".into() }))
}
async fn device_delete(State(_s): State<Arc<AppState>>, Path(_id): Path<String>)
    -> Result<StatusCode, ApiError>
{
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Serialize)] struct EnrollResp { code: String, expires_at: String }
async fn device_enroll(State(_s): State<Arc<AppState>>)
    -> Result<Json<EnrollResp>, ApiError>
{
    Ok(Json(EnrollResp { code: "STUB".into(), expires_at: "".into() }))
}

// --- AI ---

#[derive(Serialize)] struct AgentDto { id: String, name: String, model: String }
async fn ai_agents_list(State(_s): State<Arc<AppState>>) -> Result<Json<Vec<AgentDto>>, ApiError> { Ok(Json(vec![])) }
async fn ai_agents_create(State(_s): State<Arc<AppState>>, Json(_v): Json<serde_json::Value>) -> Result<Json<AgentDto>, ApiError> {
    Ok(Json(AgentDto { id: "".into(), name: "".into(), model: "".into() }))
}
async fn ai_run_start(State(_s): State<Arc<AppState>>, Path(_id): Path<String>, Json(_v): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, ApiError> {
    Ok(Json(serde_json::json!({ "run_id": "" })))
}
async fn ai_run_stream(State(_s): State<Arc<AppState>>, Path(_id): Path<String>) -> Result<Json<serde_json::Value>, ApiError> {
    // production: returns an SSE stream proxied from ai-orchestrator's StreamRun.
    Ok(Json(serde_json::json!({ "stream": "use SSE" })))
}

// --- Workflow ---

async fn wf_list  (State(_s): State<Arc<AppState>>) -> Result<Json<serde_json::Value>, ApiError> { Ok(Json(serde_json::json!({"items": []}))) }
async fn wf_create(State(_s): State<Arc<AppState>>, Json(_v): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, ApiError> { Ok(Json(serde_json::json!({"id": ""}))) }
async fn wf_start (State(_s): State<Arc<AppState>>, Path(_id): Path<String>, Json(_v): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, ApiError> { Ok(Json(serde_json::json!({"instance_id": ""}))) }
async fn wf_get   (State(_s): State<Arc<AppState>>, Path(_id): Path<String>) -> Result<Json<serde_json::Value>, ApiError> { Ok(Json(serde_json::json!({}))) }
