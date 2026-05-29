use std::pin::Pin;
use std::sync::Arc;

use futures::Stream;
use sequoia_proto::sequoia::v1 as pb;
use tokio::sync::mpsc;
use tonic::{Request, Response, Status};

use crate::config::ExecConfig;

pub struct ExecGrpc { pub cfg: Arc<ExecConfig> }

type ResStream = Pin<Box<dyn Stream<Item = Result<pb::CommandResultEvent, Status>> + Send + 'static>>;

#[tonic::async_trait]
impl pb::command_executor_server::CommandExecutor for ExecGrpc {
    async fn dispatch(&self, req: Request<pb::DispatchRequest>) -> Result<Response<pb::DispatchResponse>, Status> {
        let r = req.into_inner();
        if r.device_id.is_empty() {
            return Err(Status::invalid_argument("device_id required"));
        }
        // Build & sign command, publish to device.<device_id> on the eventbus,
        // device-service relay forwards over the bidi stream.
        let command_id = ulid::Ulid::new().to_string();
        Ok(Response::new(pb::DispatchResponse { command_id }))
    }

    type StreamResultStream = ResStream;
    async fn stream_result(&self, _req: Request<pb::StreamResultRequest>) -> Result<Response<Self::StreamResultStream>, Status> {
        let (_tx, rx) = mpsc::channel::<Result<pb::CommandResultEvent, Status>>(64);
        use tokio_stream::wrappers::ReceiverStream;
        let s = ReceiverStream::new(rx);
        Ok(Response::new(Box::pin(s) as Self::StreamResultStream))
    }
}
