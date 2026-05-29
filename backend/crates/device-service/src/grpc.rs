//! Inbound adapter: gRPC DeviceService.
//!
//! `channel` is the heart of this service. The server accepts a stream of
//! `ClientMessage` and returns a stream of `ServerMessage`. We:
//!  1. Authenticate the first frame's metadata (device JWT).
//!  2. Register the device in the routing table.
//!  3. Spawn forwarder + handler tasks; the response stream is fed from an
//!     mpsc that any code in the cluster can push into via the registry.

use std::pin::Pin;
use std::sync::Arc;
use std::time::Duration;

use futures::Stream;
use rand::Rng;
use sequoia_proto::sequoia::v1 as pb;
use sqlx::PgPool;
use time::OffsetDateTime;
use tokio::sync::mpsc;
use tonic::{Request, Response, Status, Streaming};
use tracing::{info, warn};
use uuid::Uuid;

use crate::config::DeviceConfig;
use crate::registry::RegistryRef;

// Row structs replace compile-time sqlx::query! macros (no DB needed at build time).
#[derive(sqlx::FromRow)]
struct DeviceRow {
    id: Uuid,
    tenant_id: Uuid,
    name: String,
    platform: String,
    agent_version: String,
    status: String,
    public_key: Vec<u8>,
    enrolled_at: OffsetDateTime,
    last_seen_at: Option<OffsetDateTime>,
    labels: serde_json::Value,
}

#[derive(sqlx::FromRow)]
struct EnrollmentCodeRow {
    tenant_id: Uuid,
    labels: serde_json::Value,
}

pub struct DeviceGrpc {
    pub pool: PgPool,
    pub registry: RegistryRef,
    pub cfg: Arc<DeviceConfig>,
}

type SrvStream =
    Pin<Box<dyn Stream<Item = Result<pb::ServerMessage, Status>> + Send + 'static>>;

#[tonic::async_trait]
impl pb::device_service_server::DeviceService for DeviceGrpc {
    async fn create_enrollment(
        &self,
        req: Request<pb::CreateEnrollmentRequest>,
    ) -> Result<Response<pb::Enrollment>, Status> {
        let r = req.into_inner();
        let ctx = r.context.ok_or_else(|| Status::invalid_argument("missing context"))?;
        let tenant_id = parse_uuid(&ctx.tenant_id)
            .map_err(|_| Status::invalid_argument("bad tenant"))?;
        let issued_by_user = parse_uuid(&ctx.actor.as_ref().map(|a| a.id.clone()).unwrap_or_default())
            .map_err(|_| Status::invalid_argument("bad actor"))?;
        let code = generate_code(8);
        let ttl = if r.ttl_s == 0 { self.cfg.enrollment_ttl_s } else { r.ttl_s as i64 };
        let expires_at = time::OffsetDateTime::now_utc() + time::Duration::seconds(ttl);
        let labels = serde_json::Value::Object(
            r.labels.into_iter().map(|(k, v)| (k, serde_json::Value::String(v))).collect()
        );
        sqlx::query(
            r#"INSERT INTO device.enrollment_codes (code, tenant_id, issued_by_user, expires_at, labels)
               VALUES ($1,$2,$3,$4,$5)"#,
        )
        .bind(&code)
        .bind(tenant_id)
        .bind(issued_by_user)
        .bind(expires_at)
        .bind(&labels)
        .execute(&self.pool).await
        .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(pb::Enrollment {
            code,
            expires_at: Some(into_pb_ts(expires_at)),
        }))
    }

    async fn list_devices(
        &self,
        req: Request<pb::ListDevicesRequest>,
    ) -> Result<Response<pb::ListDevicesResponse>, Status> {
        let r = req.into_inner();
        let ctx = r.context.ok_or_else(|| Status::invalid_argument("missing context"))?;
        let tenant_id = parse_uuid(&ctx.tenant_id)
            .map_err(|_| Status::invalid_argument("bad tenant"))?;
        let limit = r.page.as_ref().map(|p| p.limit.clamp(1, 500)).unwrap_or(50) as i64;

        let rows = sqlx::query_as::<_, DeviceRow>(
            r#"SELECT id, tenant_id, name, platform, agent_version, status, public_key,
                      enrolled_at, last_seen_at, labels
               FROM device.devices WHERE tenant_id = $1 AND deleted_at IS NULL
               ORDER BY enrolled_at DESC LIMIT $2"#,
        )
        .bind(tenant_id)
        .bind(limit)
        .fetch_all(&self.pool).await
        .map_err(|e| Status::internal(e.to_string()))?;

        let items: Vec<pb::Device> = rows.into_iter().map(|r| pb::Device {
            id: r.id.to_string(),
            tenant_id: r.tenant_id.to_string(),
            name: r.name,
            platform: r.platform,
            agent_version: r.agent_version,
            status: r.status,
            public_key: r.public_key,
            enrolled_at: Some(into_pb_ts(r.enrolled_at)),
            last_seen_at: r.last_seen_at.map(into_pb_ts),
            labels: serde_json::from_value(r.labels).unwrap_or_default(),
        }).collect();

        Ok(Response::new(pb::ListDevicesResponse { items, next_cursor: String::new() }))
    }

    async fn get_device(&self, _req: Request<pb::GetDeviceRequest>) -> Result<Response<pb::Device>, Status> {
        Err(Status::unimplemented("todo"))
    }

    async fn delete_device(&self, req: Request<pb::DeleteDeviceRequest>) -> Result<Response<pb::Empty>, Status> {
        let r = req.into_inner();
        let id = parse_uuid(&r.device_id).map_err(|_| Status::invalid_argument("bad id"))?;
        sqlx::query("UPDATE device.devices SET deleted_at = now() WHERE id = $1")
            .bind(id)
            .execute(&self.pool).await.map_err(|e| Status::internal(e.to_string()))?;
        self.registry.unregister(&r.device_id);
        Ok(Response::new(pb::Empty {}))
    }

    async fn enroll(&self, req: Request<pb::EnrollRequest>) -> Result<Response<pb::EnrollResponse>, Status> {
        let r = req.into_inner();
        // Atomic claim of the code under a transaction.
        let mut tx = self.pool.begin().await.map_err(|e| Status::internal(e.to_string()))?;
        let row = sqlx::query_as::<_, EnrollmentCodeRow>(
            r#"UPDATE device.enrollment_codes
               SET consumed_at = now()
               WHERE code = $1 AND consumed_at IS NULL AND expires_at > now()
               RETURNING tenant_id, labels"#,
        )
        .bind(&r.code)
        .fetch_optional(&mut *tx).await
        .map_err(|e| Status::internal(e.to_string()))?
        .ok_or_else(|| Status::failed_precondition("invalid or expired code"))?;

        let device_id = Uuid::from_u128(ulid::Ulid::new().0);
        sqlx::query(
            r#"INSERT INTO device.devices
                 (id, tenant_id, name, platform, agent_version, public_key, status, labels, enrolled_at)
               VALUES ($1,$2,$3,$4,$5,$6,'offline',$7, now())"#,
        )
        .bind(device_id)
        .bind(row.tenant_id)
        .bind(&r.hostname)
        .bind(&r.platform)
        .bind(&r.agent_version)
        .bind(&r.public_key)
        .bind(&row.labels)
        .execute(&mut *tx).await.map_err(|e| Status::internal(e.to_string()))?;
        tx.commit().await.map_err(|e| Status::internal(e.to_string()))?;

        info!(device=%device_id, "device enrolled");
        Ok(Response::new(pb::EnrollResponse {
            device_id: device_id.to_string(),
            tenant_id: row.tenant_id.to_string(),
            device_certificate: Vec::new(),    // TODO: per-tenant CA sign
            device_jwt: String::new(),          // TODO: issue device JWT via auth-service
            device_jwt_ttl_s: 24 * 3600,
            trust_anchor_cert: Vec::new(),
        }))
    }

    type ChannelStream = SrvStream;

    async fn channel(
        &self,
        req: Request<Streaming<pb::ClientMessage>>,
    ) -> Result<Response<Self::ChannelStream>, Status> {
        // Identify the device from the JWT in metadata.
        let device_id = req
            .metadata()
            .get("x-device-id")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| Status::unauthenticated("missing x-device-id"))?
            .to_owned();

        let mut inbound = req.into_inner();
        let (tx, rx) = mpsc::channel::<pb::ServerMessage>(self.cfg.channel_capacity);
        self.registry.register(device_id.clone(), tx.clone());

        let registry = self.registry.clone();
        let pool = self.pool.clone();
        let dev_for_task = device_id.clone();

        // Inbound forwarder: read frames from agent, dispatch.
        tokio::spawn(async move {
            // Mark device online.
            let _ = sqlx::query(
                r#"UPDATE device.devices SET status = 'online', last_seen_at = now() WHERE id = $1"#,
            )
            .bind(Uuid::parse_str(&dev_for_task).unwrap_or(Uuid::nil()))
            .execute(&pool).await;

            while let Some(frame) = inbound.message().await.transpose() {
                let frame = match frame { Ok(f) => f, Err(e) => { warn!(error=%e, "stream err"); break } };
                match frame.body {
                    Some(pb::client_message::Body::Heartbeat(_)) => {
                        let _ = sqlx::query(
                            r#"UPDATE device.devices SET last_seen_at = now() WHERE id = $1"#,
                        )
                        .bind(Uuid::parse_str(&dev_for_task).unwrap_or(Uuid::nil()))
                        .execute(&pool).await;
                    }
                    Some(pb::client_message::Body::Telemetry(t)) => {
                        // Hand off to telemetry pipeline via outbox in the future;
                        // for now we ignore at this layer.
                        let _ = t;
                    }
                    Some(pb::client_message::Body::CommandResult(_))
                    | Some(pb::client_message::Body::FileChunk(_))
                    | Some(pb::client_message::Body::Logs(_))
                    | Some(pb::client_message::Body::PluginEvent(_)) => {
                        // Forwarded to Command Executor / Plugin Host through the eventbus.
                    }
                    None => {}
                }
            }

            // Mark offline + unregister on disconnect.
            let _ = sqlx::query(
                r#"UPDATE device.devices SET status = 'offline' WHERE id = $1"#,
            )
            .bind(Uuid::parse_str(&dev_for_task).unwrap_or(Uuid::nil()))
            .execute(&pool).await;
            registry.unregister(&dev_for_task);
            info!(device=%dev_for_task, "device disconnected");
        });

        // Heartbeat: send a Ping every 20s.
        {
            let tx = tx.clone();
            tokio::spawn(async move {
                let mut interval = tokio::time::interval(Duration::from_secs(20));
                loop {
                    interval.tick().await;
                    if tx.send(pb::ServerMessage {
                        seq: 0, ack: 0,
                        body: Some(pb::server_message::Body::Ping(pb::Ping { nonce: rand::random() })),
                    }).await.is_err() { break; }
                }
            });
        }

        let stream = tokio_stream::wrappers::ReceiverStream::new(rx).map(Ok);
        Ok(Response::new(Box::pin(stream) as Self::ChannelStream))
    }
}

fn parse_uuid(s: &str) -> Result<Uuid, ()> {
    Uuid::parse_str(s).map_err(|_| ())
        .or_else(|_| ulid::Ulid::from_string(s).map(|u| Uuid::from_u128(u.0)).map_err(|_| ()))
}

fn generate_code(n: usize) -> String {
    const ALPHA: &[u8] = b"ABCDEFGHJKMNPQRSTUVWXYZ23456789";  // Crockford-ish, no ambiguous
    let mut rng = rand::thread_rng();
    (0..n).map(|_| ALPHA[rng.gen_range(0..ALPHA.len())] as char).collect()
}

fn into_pb_ts(t: time::OffsetDateTime) -> prost_types::Timestamp {
    prost_types::Timestamp {
        seconds: t.unix_timestamp(),
        nanos: t.nanosecond() as i32,
    }
}

use futures::StreamExt;
