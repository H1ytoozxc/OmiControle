use std::pin::Pin;
use std::sync::Arc;

use futures::Stream;
use sequoia_proto::sequoia::v1 as pb;
use sqlx::PgPool;
use tokio::sync::mpsc;
use tonic::{Request, Response, Status};

use crate::config::AiConfig;
use crate::provider::ProviderRegistry;
use crate::tools::ToolRegistry;

pub struct AiGrpc {
    pub pool: PgPool,
    pub providers: Arc<ProviderRegistry>,
    pub tools: Arc<ToolRegistry>,
    pub cfg: Arc<AiConfig>,
}

type RunStream = Pin<Box<dyn Stream<Item = Result<pb::RunDelta, Status>> + Send + 'static>>;
type CompletionStream = Pin<Box<dyn Stream<Item = Result<pb::CompletionDelta, Status>> + Send + 'static>>;

#[tonic::async_trait]
impl pb::ai_orchestrator_server::AiOrchestrator for AiGrpc {
    async fn create_agent(&self, _req: Request<pb::CreateAgentRequest>) -> Result<Response<pb::Agent>, Status> {
        Err(Status::unimplemented("todo"))
    }
    async fn list_agents(&self, _req: Request<pb::ListAgentsRequest>) -> Result<Response<pb::ListAgentsResponse>, Status> {
        Err(Status::unimplemented("todo"))
    }
    async fn start_run(&self, _req: Request<pb::StartRunRequest>) -> Result<Response<pb::Run>, Status> {
        Err(Status::unimplemented("todo"))
    }

    type StreamRunStream = RunStream;
    async fn stream_run(&self, _req: Request<pb::StreamRunRequest>) -> Result<Response<Self::StreamRunStream>, Status> {
        let (_tx, rx) = mpsc::channel::<Result<pb::RunDelta, Status>>(64);
        use tokio_stream::wrappers::ReceiverStream;
        let s = ReceiverStream::new(rx);
        Ok(Response::new(Box::pin(s) as Self::StreamRunStream))
    }

    async fn cancel_run(&self, _req: Request<pb::CancelRunRequest>) -> Result<Response<pb::Empty>, Status> {
        Ok(Response::new(pb::Empty {}))
    }

    type CompleteStream = CompletionStream;
    async fn complete(&self, _req: Request<pb::CompleteRequest>) -> Result<Response<Self::CompleteStream>, Status> {
        let (_tx, rx) = mpsc::channel::<Result<pb::CompletionDelta, Status>>(64);
        use tokio_stream::wrappers::ReceiverStream;
        let s = ReceiverStream::new(rx);
        Ok(Response::new(Box::pin(s) as Self::CompleteStream))
    }
}
