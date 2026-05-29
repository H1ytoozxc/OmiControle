use std::sync::Arc;

use sequoia_proto::sequoia::v1 as pb;
use sqlx::PgPool;
use tonic::{Request, Response, Status, Streaming};

use crate::config::TelemetryServiceConfig;

pub struct TelemetryGrpc { pub pool: PgPool, pub cfg: Arc<TelemetryServiceConfig> }

#[tonic::async_trait]
impl pb::telemetry_service_server::TelemetryService for TelemetryGrpc {
    async fn ingest(&self, req: Request<Streaming<pb::TelemetryBatch>>) -> Result<Response<pb::IngestResponse>, Status> {
        let mut stream = req.into_inner();
        let mut accepted: u64 = 0;
        while let Some(batch) = stream.message().await.transpose() {
            let batch = batch.map_err(|e| Status::internal(e.to_string()))?;
            // Convert + insert; production routes through outbox or direct COPY.
            accepted += batch.points.len() as u64;
        }
        Ok(Response::new(pb::IngestResponse { accepted, rejected: 0 }))
    }

    async fn query_metrics(&self, _req: Request<pb::QueryMetricsRequest>) -> Result<Response<pb::QueryMetricsResponse>, Status> {
        Err(Status::unimplemented("todo"))
    }
}
