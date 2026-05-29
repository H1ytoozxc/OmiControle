use std::sync::Arc;

use axum::extract::{Extension, Path, Query, State};
use axum::http::StatusCode;
use axum::routing::{get, post, delete};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use sequoia_auth::Claims;
use sequoia_common::error::Error;
use sequoia_common::pagination::PageRequest;
use sequoia_proto::sequoia::v1 as pb;

use crate::errors::ApiError;
use crate::state::AppState;

/// Build the gRPC RequestContext from the verified JWT claims.
fn ctx_from(claims: &Claims) -> pb::RequestContext {
    pb::RequestContext {
        tenant_id: claims.tid.clone(),
        actor: Some(pb::Actor {
            kind: pb::actor::Kind::User as i32,
            id: claims.sub.clone(),
            scopes: claims.scope.split_whitespace().map(str::to_owned).collect(),
            on_behalf_of: None,
        }),
        correlation_id: String::new(),
        causation_id: String::new(),
        client_ip: String::new(),
        labels: Default::default(),
    }
}

/// Translate a downstream gRPC error into our HTTP-shaped Error enum.
fn map_grpc(s: tonic::Status) -> Error {
    use tonic::Code::*;
    let msg = s.message().to_string();
    match s.code() {
        InvalidArgument | OutOfRange => Error::BadRequest(msg),
        Unauthenticated => Error::Unauthenticated,
        PermissionDenied => Error::Forbidden("denied"),
        NotFound => Error::NotFound("not found"),
        AlreadyExists => Error::Conflict("conflict"),
        FailedPrecondition => Error::PreconditionFailed("precondition"),
        ResourceExhausted => Error::RateLimited { retry_after_ms: 1000 },
        Unavailable | DeadlineExceeded => Error::UpstreamUnavailable("downstream unavailable"),
        _ => Error::Internal(anyhow::anyhow!("upstream: {msg}")),
    }
}

fn require_device_client(s: &AppState) -> Result<pb::device_service_client::DeviceServiceClient<tonic::transport::Channel>, Error> {
    s.device_client.clone().ok_or(Error::UpstreamUnavailable("device-service not configured"))
}

fn require_auth_client(s: &AppState) -> Result<pb::auth_service_client::AuthServiceClient<tonic::transport::Channel>, Error> {
    s.auth_client.clone().ok_or(Error::UpstreamUnavailable("auth-service not configured"))
}

pub fn build_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/healthz/live",  get(|| async { (StatusCode::OK, "ok") }))
        .route("/healthz/ready", get(ready))
        .route("/metrics",       get(metrics))
        .route("/.well-known/jwks.json", get(jwks))

        // Auth
        .route("/v1/auth/login",     post(auth_login))
        .route("/v1/auth/refresh",   post(auth_refresh))
        .route("/v1/auth/logout",    post(auth_logout))
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

#[derive(Deserialize, Default)]
#[serde(default)]
struct LogoutBody {
    refresh_token: String,
}

/// Revoke the entire refresh-token family. No auth required: the refresh_token
/// itself is the credential. Idempotent — unknown tokens still return 204.
async fn auth_logout(
    State(s): State<Arc<AppState>>,
    body: Option<Json<LogoutBody>>,
) -> Result<StatusCode, ApiError> {
    let body = body.map(|Json(b)| b).unwrap_or_default();
    if !body.refresh_token.is_empty() {
        let mut client = require_auth_client(&s)?;
        client.logout(pb::LogoutRequest {
            context: None,
            refresh_token: body.refresh_token,
        }).await.map_err(map_grpc)?;
    }
    Ok(StatusCode::NO_CONTENT)
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

#[derive(Serialize)]
struct DeviceDto {
    id: String,
    tenant_id: String,
    name: String,
    platform: String,
    agent_version: String,
    status: String,
    enrolled_at: Option<String>,
    last_seen_at: Option<String>,
}

impl From<pb::Device> for DeviceDto {
    fn from(d: pb::Device) -> Self {
        Self {
            id: d.id,
            tenant_id: d.tenant_id,
            name: d.name,
            platform: d.platform,
            agent_version: d.agent_version,
            status: d.status,
            enrolled_at: d.enrolled_at.map(fmt_ts),
            last_seen_at: d.last_seen_at.map(fmt_ts),
        }
    }
}

#[derive(Serialize)] struct DeviceListResp { items: Vec<DeviceDto>, next_cursor: Option<String> }

#[derive(Deserialize)]
struct DevicesListQuery {
    #[serde(default)]
    cursor: Option<String>,
    #[serde(default)]
    limit: Option<u32>,
    #[serde(default)]
    status: Option<String>,
}

async fn devices_list(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(q): Query<DevicesListQuery>,
) -> Result<Json<DeviceListResp>, ApiError> {
    let mut client = require_device_client(&s)?;
    let resp = client
        .list_devices(pb::ListDevicesRequest {
            context: Some(ctx_from(&claims)),
            page: Some(pb::PageRequest {
                cursor: q.cursor.unwrap_or_default(),
                limit: q.limit.unwrap_or(50),
            }),
            status: q.status.unwrap_or_default(),
        })
        .await
        .map_err(map_grpc)?;
    let inner = resp.into_inner();
    Ok(Json(DeviceListResp {
        items: inner.items.into_iter().map(DeviceDto::from).collect(),
        next_cursor: if inner.next_cursor.is_empty() { None } else { Some(inner.next_cursor) },
    }))
}

async fn device_get(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Result<Json<DeviceDto>, ApiError> {
    let mut client = require_device_client(&s)?;
    let resp = client
        .get_device(pb::GetDeviceRequest {
            context: Some(ctx_from(&claims)),
            device_id: id,
        })
        .await
        .map_err(map_grpc)?;
    Ok(Json(DeviceDto::from(resp.into_inner())))
}

async fn device_delete(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Result<StatusCode, ApiError> {
    let mut client = require_device_client(&s)?;
    client
        .delete_device(pb::DeleteDeviceRequest {
            context: Some(ctx_from(&claims)),
            device_id: id,
        })
        .await
        .map_err(map_grpc)?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize, Default)]
#[serde(default)]
struct EnrollBody {
    ttl_s: u32,
    labels: std::collections::HashMap<String, String>,
}

#[derive(Serialize)] struct EnrollResp { code: String, expires_at: Option<String> }

async fn device_enroll(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    body: Option<Json<EnrollBody>>,
) -> Result<Json<EnrollResp>, ApiError> {
    let body = body.map(|Json(b)| b).unwrap_or_default();
    let mut client = require_device_client(&s)?;
    let resp = client
        .create_enrollment(pb::CreateEnrollmentRequest {
            context: Some(ctx_from(&claims)),
            ttl_s: body.ttl_s,
            labels: body.labels,
        })
        .await
        .map_err(map_grpc)?;
    let e = resp.into_inner();
    Ok(Json(EnrollResp {
        code: e.code,
        expires_at: e.expires_at.map(fmt_ts),
    }))
}

fn fmt_ts(ts: prost_types::Timestamp) -> String {
    // RFC 3339 in UTC, with seconds precision (good enough for the UI).
    time::OffsetDateTime::from_unix_timestamp(ts.seconds)
        .map(|t| t.format(&time::format_description::well_known::Rfc3339).unwrap_or_default())
        .unwrap_or_default()
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
