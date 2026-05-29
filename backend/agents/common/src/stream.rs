//! Bi-di gRPC stream client.
//!
//! Maintains exactly one connection to Device Service. Auto-reconnects with
//! jittered exponential backoff. Reuses the last ack on reconnect so
//! unacknowledged frames are retransmitted (at-least-once).

use std::sync::Arc;
use std::time::Duration;

use backoff::{backoff::Backoff, ExponentialBackoff};
use sequoia_proto::sequoia::v1 as pb;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tonic::transport::{Channel, Endpoint};
use tonic::Request;
use tracing::{info, warn};

pub struct ChannelClient {
    pub endpoint: String,
    pub device_jwt: Arc<parking_lot::RwLock<String>>,
}

impl ChannelClient {
    pub fn new(endpoint: impl Into<String>, jwt: String) -> Self {
        Self {
            endpoint: endpoint.into(),
            device_jwt: Arc::new(parking_lot::RwLock::new(jwt)),
        }
    }

    /// Run the stream loop forever. Caller plugs in `outbound` (frames to send)
    /// and gets `inbound` (frames received).
    pub async fn run(
        self,
        mut outbound: mpsc::Receiver<pb::ClientMessage>,
        inbound: mpsc::Sender<pb::ServerMessage>,
    ) -> ! {
        let mut backoff = ExponentialBackoff {
            initial_interval: Duration::from_secs(1),
            max_interval: Duration::from_secs(60),
            max_elapsed_time: None,
            ..Default::default()
        };
        loop {
            match self.try_run(&mut outbound, &inbound).await {
                Ok(_) => backoff.reset(),
                Err(e) => {
                    let pause = backoff.next_backoff().unwrap_or(Duration::from_secs(60));
                    warn!(error=%e, pause_ms = pause.as_millis() as u64, "stream broken, retrying");
                    tokio::time::sleep(pause).await;
                }
            }
        }
    }

    async fn try_run(
        &self,
        outbound: &mut mpsc::Receiver<pb::ClientMessage>,
        inbound: &mpsc::Sender<pb::ServerMessage>,
    ) -> anyhow::Result<()> {
        let endpoint = Endpoint::from_shared(self.endpoint.clone())?
            .tcp_keepalive(Some(Duration::from_secs(30)))
            .http2_keep_alive_interval(Duration::from_secs(20))
            .keep_alive_while_idle(true)
            .connect_timeout(Duration::from_secs(15));
        let channel: Channel = endpoint.connect().await?;
        let mut client = pb::device_service_client::DeviceServiceClient::new(channel);

        // Re-pull JWT in case it rotated mid-run.
        let token = self.device_jwt.read().clone();

        let (tx, rx) = mpsc::channel::<pb::ClientMessage>(256);

        let mut req = Request::new(ReceiverStream::new(rx));
        req.metadata_mut().insert(
            "authorization",
            format!("Bearer {token}").parse().unwrap(),
        );

        let mut server_stream = client.channel(req).await?.into_inner();
        info!("device stream established");
        loop {
            tokio::select! {
                Some(msg) = outbound.recv() => {
                    if tx.send(msg).await.is_err() { break; }
                }
                result = server_stream.message() => {
                    match result? {
                        Some(msg) => { if inbound.send(msg).await.is_err() { break; } }
                        None => break,
                    }
                }
            }
        }
        Ok(())
    }
}
