//! The actual agent runtime composing common pieces with platform glue.

use std::time::Duration;

use sequoia_agent_common::commands;
use sequoia_agent_common::stream::ChannelClient;
use sequoia_agent_common::telemetry;
use sequoia_proto::sequoia::v1 as pb;
use tokio::sync::mpsc;
use tracing::{info, warn};

use crate::cli::EnrollOpts;
use crate::platform::current;

pub async fn enroll(opts: EnrollOpts) -> anyhow::Result<()> {
    info!(endpoint=%opts.endpoint, "enrolling…");
    // 1. Generate Ed25519 identity, build CSR/public-key.
    // 2. Call Device Service Enroll RPC with the code + public key.
    // 3. Receive device_id, device_jwt, trust anchor; persist via state::save.
    Ok(())
}

pub async fn status() -> anyhow::Result<()> {
    println!("sequoia-agent {}: state dir = {}", env!("CARGO_PKG_VERSION"), current::state_dir().display());
    Ok(())
}

pub async fn run() -> anyhow::Result<()> {
    current::drop_privileges();

    // Load encrypted state — in production this gates startup. Skeleton:
    let endpoint = std::env::var("SEQUOIA_ENDPOINT")
        .unwrap_or_else(|_| "https://device.sequoia.local:443".into());
    let device_jwt = std::env::var("SEQUOIA_DEVICE_JWT").unwrap_or_default();

    let (out_tx, out_rx) = mpsc::channel::<pb::ClientMessage>(256);
    let (in_tx, mut in_rx) = mpsc::channel::<pb::ServerMessage>(256);

    // Background telemetry loop.
    tokio::spawn(telemetry::run_loop(out_tx.clone(), Duration::from_secs(20)));

    // Inbound dispatcher.
    let out_for_dispatch = out_tx.clone();
    tokio::spawn(async move {
        while let Some(msg) = in_rx.recv().await {
            match msg.body {
                Some(pb::server_message::Body::Command(cmd)) => {
                    match commands::execute_exec_command(&cmd).await {
                        Ok(result) => {
                            let _ = out_for_dispatch.send(pb::ClientMessage {
                                seq: 0, ack: msg.seq,
                                body: Some(pb::client_message::Body::CommandResult(result)),
                            }).await;
                        }
                        Err(e) => warn!(error=%e, "command failed"),
                    }
                }
                Some(pb::server_message::Body::Ping(_)) => {
                    // server liveness probe — already handled by stream-level pong.
                }
                _ => {}
            }
        }
    });

    let client = ChannelClient::new(endpoint, device_jwt);
    client.run(out_rx, in_tx).await
}
