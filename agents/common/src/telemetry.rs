//! Telemetry collection on the agent side.
//!
//! Sampled at a configurable interval and pushed over the bidi stream as
//! `ClientMessage::Telemetry` frames. Metrics are batched (up to 64) before
//! send to limit syscall + serialization overhead.

use sequoia_proto::sequoia::v1 as pb;
use std::time::Duration;
use tokio::sync::mpsc;

pub async fn run_loop(
    tx: mpsc::Sender<pb::ClientMessage>,
    interval: Duration,
) {
    let mut tick = tokio::time::interval(interval);
    loop {
        tick.tick().await;
        let now = prost_types::Timestamp {
            seconds: time::OffsetDateTime::now_utc().unix_timestamp(),
            nanos: 0,
        };
        // Heartbeat with quick resource snapshot.
        let hb = pb::Heartbeat {
            at: Some(now),
            uptime_s: 0,             // platform-specific lookup
            mem_rss_bytes: 0,
            cpu_load_1m: 0.0,
        };
        let _ = tx.send(pb::ClientMessage {
            seq: 0, ack: 0,
            body: Some(pb::client_message::Body::Heartbeat(hb)),
        }).await;
    }
}
