use std::sync::Arc;

use sequoia_proto::sequoia::v1 as pb;
use sqlx::PgPool;
use tonic::{Request, Response, Status};

use crate::config::NotifyConfig;

pub struct NotifyGrpc { pub pool: PgPool, pub cfg: Arc<NotifyConfig> }

#[tonic::async_trait]
impl pb::notification_service_server::NotificationService for NotifyGrpc {
    async fn send(&self, _req: Request<pb::SendRequest>) -> Result<Response<pb::SendResponse>, Status> {
        // Insert one row per (recipient × channel_kind) into notification.deliveries
        // with status=queued; the worker will dispatch.
        let id = ulid::Ulid::new().to_string();
        Ok(Response::new(pb::SendResponse { delivery_id: id }))
    }
    async fn list_channels(&self, _req: Request<pb::ListChannelsRequest>) -> Result<Response<pb::ListChannelsResponse>, Status> {
        Ok(Response::new(pb::ListChannelsResponse { items: vec![], next_cursor: String::new() }))
    }
}
