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

fn require_ai_client(s: &AppState) -> Result<pb::ai_orchestrator_client::AiOrchestratorClient<tonic::transport::Channel>, Error> {
    s.ai_client.clone().ok_or(Error::UpstreamUnavailable("ai-orchestrator not configured"))
}

fn require_workflow_client(s: &AppState) -> Result<pb::workflow_engine_client::WorkflowEngineClient<tonic::transport::Channel>, Error> {
    s.workflow_client.clone().ok_or(Error::UpstreamUnavailable("workflow-engine not configured"))
}

fn require_notify_client(s: &AppState) -> Result<pb::notification_service_client::NotificationServiceClient<tonic::transport::Channel>, Error> {
    s.notify_client.clone().ok_or(Error::UpstreamUnavailable("notification-service not configured"))
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
        .route("/v1/auth/register",  post(auth_register))
        .route("/v1/auth/ws-ticket", post(ws_ticket))

        // User management (admin — any active user of the tenant)
        .route("/v1/users/pending",          get(users_list_pending))
        .route("/v1/users/:id/approve",      post(user_approve))
        .route("/v1/users/:id/reject",       post(user_reject))

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

        // Notifications
        .route("/v1/notifications/channels", get(notif_channels))

        // Dashboard overview — aggregate of device counts.
        .route("/v1/stats/overview", get(stats_overview))

        .with_state(state)
}

#[derive(Serialize)] struct Health { ok: bool }
async fn ready(State(_s): State<Arc<AppState>>) -> Json<Health> { Json(Health { ok: true }) }

async fn metrics(State(s): State<Arc<AppState>>) -> Result<axum::response::Response, ApiError> {
    use axum::http::header;
    use axum::response::IntoResponse;
    let Some(handle) = s.prometheus.as_ref() else {
        return Err(Error::UpstreamUnavailable("metrics not enabled").into());
    };
    let body = handle.render();
    let mut resp = body.into_response();
    resp.headers_mut().insert(
        header::CONTENT_TYPE,
        axum::http::HeaderValue::from_static("text/plain; version=0.0.4"),
    );
    Ok(resp)
}

async fn jwks(State(s): State<Arc<AppState>>) -> Result<Json<serde_json::Value>, ApiError> {
    // Proxy JWKS from auth-service. auth-service.Jwks returns JSON verbatim
    // — we re-encode here so the client gets a consistent application/json
    // shape regardless of whether the upstream is wired.
    let mut client = require_auth_client(&s)?;
    let resp = client.jwks(pb::Empty {}).await.map_err(map_grpc)?;
    let json = resp.into_inner().keys_json;
    let parsed: serde_json::Value = serde_json::from_str(&json)
        .unwrap_or_else(|_| serde_json::json!({ "keys": [] }));
    Ok(Json(parsed))
}

// --- Auth ---

#[derive(Deserialize)]
struct LoginBody {
    /// Tenant ID (ULID). For now, the frontend must supply it; eventually
    /// resolved server-side from the email domain.
    tenant_id: String,
    email: String,
    password: String,
}

#[derive(Serialize)]
struct TokenResp {
    access_token: String,
    refresh_token: String,
    access_ttl_s: u32,
    refresh_ttl_s: u32,
}

async fn auth_login(
    State(s): State<Arc<AppState>>,
    Json(body): Json<LoginBody>,
) -> Result<Json<TokenResp>, ApiError> {
    let mut client = require_auth_client(&s)?;
    let resp = client
        .issue_tokens(pb::IssueTokensRequest {
            context: Some(pb::RequestContext {
                tenant_id: body.tenant_id,
                ..Default::default()
            }),
            primary: Some(pb::issue_tokens_request::Primary::Password(pb::PasswordCreds {
                email: body.email,
                password: body.password,
            })),
        })
        .await
        .map_err(map_grpc)?;
    let p = resp.into_inner();
    Ok(Json(TokenResp {
        access_token: p.access_token,
        refresh_token: p.refresh_token,
        access_ttl_s: p.access_ttl_s,
        refresh_ttl_s: p.refresh_ttl_s,
    }))
}

#[derive(Deserialize)] struct RefreshBody { refresh_token: String }

async fn auth_refresh(
    State(s): State<Arc<AppState>>,
    Json(body): Json<RefreshBody>,
) -> Result<Json<TokenResp>, ApiError> {
    let mut client = require_auth_client(&s)?;
    let resp = client
        .refresh(pb::RefreshRequest {
            context: None,
            refresh_token: body.refresh_token,
        })
        .await
        .map_err(map_grpc)?;
    let p = resp.into_inner();
    Ok(Json(TokenResp {
        access_token: p.access_token,
        refresh_token: p.refresh_token,
        access_ttl_s: p.access_ttl_s,
        refresh_ttl_s: p.refresh_ttl_s,
    }))
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

// --- Registration ---

#[derive(Deserialize)]
struct RegisterBody {
    tenant_id: String,
    email: String,
    password: String,
    #[serde(default)]
    display_name: String,
}

#[derive(Serialize)]
struct RegisterResp {
    user_id: String,
    status: String,
}

async fn auth_register(
    State(s): State<Arc<AppState>>,
    Json(body): Json<RegisterBody>,
) -> Result<Json<RegisterResp>, ApiError> {
    let mut client = require_auth_client(&s)?;
    let resp = client
        .register(pb::RegisterRequest {
            tenant_id: body.tenant_id,
            email: body.email,
            password: body.password,
            display_name: body.display_name,
        })
        .await
        .map_err(map_grpc)?;
    let r = resp.into_inner();
    Ok(Json(RegisterResp { user_id: r.user_id, status: r.status }))
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

#[derive(Serialize)]
struct AgentDto {
    id: String,
    tenant_id: String,
    name: String,
    model: String,
    system_prompt: String,
    tool_ids: Vec<String>,
}

impl From<pb::Agent> for AgentDto {
    fn from(a: pb::Agent) -> Self {
        Self { id: a.id, tenant_id: a.tenant_id, name: a.name, model: a.model, system_prompt: a.system_prompt, tool_ids: a.tool_ids }
    }
}

#[derive(Serialize)] struct AgentListResp { items: Vec<AgentDto>, next_cursor: Option<String> }

async fn ai_agents_list(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(q): Query<PageRequest>,
) -> Result<Json<AgentListResp>, ApiError> {
    let mut client = require_ai_client(&s)?;
    let resp = client.list_agents(pb::ListAgentsRequest {
        context: Some(ctx_from(&claims)),
        page: Some(pb::PageRequest { cursor: q.cursor.clone().unwrap_or_default(), limit: q.capped_limit() }),
    }).await.map_err(map_grpc)?;
    let inner = resp.into_inner();
    Ok(Json(AgentListResp {
        items: inner.items.into_iter().map(AgentDto::from).collect(),
        next_cursor: if inner.next_cursor.is_empty() { None } else { Some(inner.next_cursor) },
    }))
}

#[derive(Deserialize)]
struct CreateAgentBody {
    name: String,
    model: String,
    #[serde(default)] system_prompt: String,
    #[serde(default)] tool_ids: Vec<String>,
}

async fn ai_agents_create(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateAgentBody>,
) -> Result<Json<AgentDto>, ApiError> {
    let mut client = require_ai_client(&s)?;
    let resp = client.create_agent(pb::CreateAgentRequest {
        context: Some(ctx_from(&claims)),
        name: body.name,
        model: body.model,
        system_prompt: body.system_prompt,
        tool_ids: body.tool_ids,
    }).await.map_err(map_grpc)?;
    Ok(Json(AgentDto::from(resp.into_inner())))
}

#[derive(Deserialize)]
struct StartRunBody {
    user_input: String,
    #[serde(default)] variables: std::collections::HashMap<String, String>,
}

#[derive(Serialize)] struct RunDto { id: String, agent_id: String, status: String }

async fn ai_run_start(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(agent_id): Path<String>,
    Json(body): Json<StartRunBody>,
) -> Result<Json<RunDto>, ApiError> {
    let mut client = require_ai_client(&s)?;
    let resp = client.start_run(pb::StartRunRequest {
        context: Some(ctx_from(&claims)),
        agent_id,
        user_input: body.user_input,
        budget: None,
        variables: body.variables,
    }).await.map_err(map_grpc)?;
    let r = resp.into_inner();
    Ok(Json(RunDto { id: r.id, agent_id: r.agent_id, status: r.status }))
}

async fn ai_run_stream(State(_s): State<Arc<AppState>>, Path(_id): Path<String>) -> Result<Json<serde_json::Value>, ApiError> {
    // Production: SSE stream proxied from ai-orchestrator's StreamRun.
    // The current gRPC server returns an empty stream; once it produces RunDelta
    // frames, this handler should convert them into Server-Sent Events.
    Err(Error::UpstreamUnavailable("SSE streaming not yet wired").into())
}

// --- Workflow ---

#[derive(Serialize)]
struct DefinitionDto {
    id: String,
    tenant_id: String,
    name: String,
    version: u32,
}

impl From<pb::Definition> for DefinitionDto {
    fn from(d: pb::Definition) -> Self {
        Self { id: d.id, tenant_id: d.tenant_id, name: d.name, version: d.version }
    }
}

#[derive(Serialize)] struct InstanceDto { id: String, definition_id: String, status: String }

impl From<pb::Instance> for InstanceDto {
    fn from(i: pb::Instance) -> Self {
        Self { id: i.id, definition_id: i.definition_id, status: i.status }
    }
}

#[derive(Serialize)] struct InstanceListResp { items: Vec<InstanceDto>, next_cursor: Option<String> }

#[derive(Deserialize)]
struct InstancesListQuery {
    #[serde(default)] cursor: Option<String>,
    #[serde(default)] limit: Option<u32>,
    #[serde(default)] status: Option<String>,
}

async fn wf_list(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(q): Query<InstancesListQuery>,
) -> Result<Json<InstanceListResp>, ApiError> {
    let mut client = require_workflow_client(&s)?;
    let resp = client.list_instances(pb::ListInstancesRequest {
        context: Some(ctx_from(&claims)),
        page: Some(pb::PageRequest { cursor: q.cursor.unwrap_or_default(), limit: q.limit.unwrap_or(50) }),
        status: q.status.unwrap_or_default(),
    }).await.map_err(map_grpc)?;
    let inner = resp.into_inner();
    Ok(Json(InstanceListResp {
        items: inner.items.into_iter().map(InstanceDto::from).collect(),
        next_cursor: if inner.next_cursor.is_empty() { None } else { Some(inner.next_cursor) },
    }))
}

#[derive(Deserialize)]
struct CreateDefinitionBody { name: String, spec_json: String }

async fn wf_create(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateDefinitionBody>,
) -> Result<Json<DefinitionDto>, ApiError> {
    let mut client = require_workflow_client(&s)?;
    let resp = client.create_definition(pb::CreateDefinitionRequest {
        context: Some(ctx_from(&claims)),
        name: body.name,
        spec_json: body.spec_json,
    }).await.map_err(map_grpc)?;
    Ok(Json(DefinitionDto::from(resp.into_inner())))
}

#[derive(Deserialize, Default)]
#[serde(default)]
struct StartInstanceBody {
    variables_json: String,
    idempotency_key: String,
}

async fn wf_start(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(definition_id): Path<String>,
    body: Option<Json<StartInstanceBody>>,
) -> Result<Json<InstanceDto>, ApiError> {
    let body = body.map(|Json(b)| b).unwrap_or_default();
    let mut client = require_workflow_client(&s)?;
    let resp = client.start_instance(pb::StartInstanceRequest {
        context: Some(ctx_from(&claims)),
        definition_id,
        variables_json: body.variables_json,
        idempotency_key: body.idempotency_key,
    }).await.map_err(map_grpc)?;
    Ok(Json(InstanceDto::from(resp.into_inner())))
}

async fn wf_get(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(instance_id): Path<String>,
) -> Result<Json<InstanceDto>, ApiError> {
    let mut client = require_workflow_client(&s)?;
    let resp = client.get_instance(pb::GetInstanceRequest {
        context: Some(ctx_from(&claims)),
        instance_id,
    }).await.map_err(map_grpc)?;
    Ok(Json(InstanceDto::from(resp.into_inner())))
}

// --- Notifications ---

#[derive(Serialize)] struct ChannelDto { id: String, kind: String, enabled: bool }

#[derive(Serialize)] struct ChannelListResp { items: Vec<ChannelDto>, next_cursor: Option<String> }

async fn notif_channels(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(q): Query<PageRequest>,
) -> Result<Json<ChannelListResp>, ApiError> {
    let mut client = require_notify_client(&s)?;
    let resp = client.list_channels(pb::ListChannelsRequest {
        context: Some(ctx_from(&claims)),
        page: Some(pb::PageRequest { cursor: q.cursor.clone().unwrap_or_default(), limit: q.capped_limit() }),
    }).await.map_err(map_grpc)?;
    let inner = resp.into_inner();
    Ok(Json(ChannelListResp {
        items: inner.items.into_iter().map(|c| ChannelDto { id: c.id, kind: c.kind, enabled: c.enabled }).collect(),
        next_cursor: if inner.next_cursor.is_empty() { None } else { Some(inner.next_cursor) },
    }))
}

// --- User management (pending approvals) ---

#[derive(Serialize)]
struct PendingUserDto {
    id: String,
    email: String,
    display_name: String,
    registered_at: Option<String>,
}

#[derive(Serialize)]
struct PendingUsersResp { items: Vec<PendingUserDto> }

async fn users_list_pending(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<PendingUsersResp>, ApiError> {
    let mut client = require_auth_client(&s)?;
    let resp = client
        .list_pending_users(pb::ListPendingUsersRequest {
            context: Some(ctx_from(&claims)),
        })
        .await
        .map_err(map_grpc)?;
    let items = resp.into_inner().users.into_iter().map(|u| PendingUserDto {
        id: u.user_id,
        email: u.email,
        display_name: u.display_name,
        registered_at: u.registered_at.map(fmt_ts),
    }).collect();
    Ok(Json(PendingUsersResp { items }))
}

async fn user_approve(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Result<StatusCode, ApiError> {
    let mut client = require_auth_client(&s)?;
    client.approve_user(pb::ApproveUserRequest {
        context: Some(ctx_from(&claims)),
        user_id: id,
    }).await.map_err(map_grpc)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn user_reject(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Result<StatusCode, ApiError> {
    let mut client = require_auth_client(&s)?;
    client.reject_user(pb::RejectUserRequest {
        context: Some(ctx_from(&claims)),
        user_id: id,
    }).await.map_err(map_grpc)?;
    Ok(StatusCode::NO_CONTENT)
}

// --- Dashboard overview ---

#[derive(Serialize)]
struct OverviewResp {
    devices_total: u32,
    devices_online: u32,
    workflows_total: u32,
}

/// Aggregate cheap counts for the dashboard. Each source is best-effort:
/// a 502 from one upstream still returns the rest with zeros.
async fn stats_overview(
    State(s): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<OverviewResp>, ApiError> {
    let ctx = ctx_from(&claims);
    let (devices, online, workflows) = tokio::join!(
        count_devices(&s, ctx.clone(), None),
        count_devices(&s, ctx.clone(), Some("online")),
        count_workflows(&s, ctx),
    );
    Ok(Json(OverviewResp {
        devices_total: devices.unwrap_or(0),
        devices_online: online.unwrap_or(0),
        workflows_total: workflows.unwrap_or(0),
    }))
}

async fn count_devices(s: &AppState, ctx: pb::RequestContext, status: Option<&str>) -> Option<u32> {
    let mut client = s.device_client.clone()?;
    let resp = client.list_devices(pb::ListDevicesRequest {
        context: Some(ctx),
        page: Some(pb::PageRequest { cursor: String::new(), limit: 500 }),
        status: status.unwrap_or("").to_owned(),
    }).await.ok()?;
    Some(resp.into_inner().items.len() as u32)
}

async fn count_workflows(s: &AppState, ctx: pb::RequestContext) -> Option<u32> {
    let mut client = s.workflow_client.clone()?;
    let resp = client.list_instances(pb::ListInstancesRequest {
        context: Some(ctx),
        page: Some(pb::PageRequest { cursor: String::new(), limit: 500 }),
        status: String::new(),
    }).await.ok()?;
    Some(resp.into_inner().items.len() as u32)
}
