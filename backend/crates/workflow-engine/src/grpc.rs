use std::pin::Pin;
use std::sync::Arc;

use futures::Stream;
use sequoia_proto::sequoia::v1 as pb;
use sqlx::PgPool;
use tonic::{Request, Response, Status};
use tokio::sync::mpsc;

use crate::config::WorkflowConfig;

pub struct WorkflowGrpc { pub pool: PgPool, pub cfg: Arc<WorkflowConfig> }

type EvtStream = Pin<Box<dyn Stream<Item = Result<pb::WorkflowEvent, Status>> + Send + 'static>>;

#[tonic::async_trait]
impl pb::workflow_engine_server::WorkflowEngine for WorkflowGrpc {
    async fn create_definition(&self, _req: Request<pb::CreateDefinitionRequest>) -> Result<Response<pb::Definition>, Status> {
        Err(Status::unimplemented("todo"))
    }
    async fn start_instance(&self, _req: Request<pb::StartInstanceRequest>) -> Result<Response<pb::Instance>, Status> {
        Err(Status::unimplemented("todo"))
    }
    async fn get_instance(&self, _req: Request<pb::GetInstanceRequest>) -> Result<Response<pb::Instance>, Status> {
        Err(Status::unimplemented("todo"))
    }
    async fn list_instances(&self, _req: Request<pb::ListInstancesRequest>) -> Result<Response<pb::ListInstancesResponse>, Status> {
        Err(Status::unimplemented("todo"))
    }
    async fn cancel_instance(&self, _req: Request<pb::CancelInstanceRequest>) -> Result<Response<pb::Empty>, Status> {
        Ok(Response::new(pb::Empty {}))
    }

    type StreamEventsStream = EvtStream;
    async fn stream_events(&self, _req: Request<pb::StreamEventsRequest>) -> Result<Response<Self::StreamEventsStream>, Status> {
        let (_tx, rx) = mpsc::channel::<Result<pb::WorkflowEvent, Status>>(64);
        use tokio_stream::wrappers::ReceiverStream;
        let s = ReceiverStream::new(rx);
        Ok(Response::new(Box::pin(s) as Self::StreamEventsStream))
    }
}
