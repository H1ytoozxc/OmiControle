//! In-memory routing table: device_id → sender of `ServerMessage`.
//!
//! Each connected device holds a single `Channel` bidi stream; this registry
//! is the only way external callers (Command Executor, Plugin Host) push
//! frames out to a device. In a multi-replica deployment we layer Redis
//! pub-sub on top: on local miss, publish to `devstream.<device_id>`; the
//! replica that owns the stream consumes & forwards.

use std::sync::Arc;

use dashmap::DashMap;
use tokio::sync::mpsc;

use sequoia_proto::sequoia::v1 as pb;

#[derive(Default)]
pub struct ChannelRegistry {
    by_device: DashMap<String, mpsc::Sender<pb::ServerMessage>>,
}

impl ChannelRegistry {
    pub fn register(&self, device_id: String, tx: mpsc::Sender<pb::ServerMessage>) {
        self.by_device.insert(device_id, tx);
    }

    pub fn unregister(&self, device_id: &str) {
        self.by_device.remove(device_id);
    }

    pub async fn send(&self, device_id: &str, msg: pb::ServerMessage) -> Result<(), SendError> {
        let tx = self.by_device.get(device_id).ok_or(SendError::NotConnected)?.clone();
        tx.send(msg).await.map_err(|_| SendError::Closed)
    }

    pub fn online_count(&self) -> usize { self.by_device.len() }
}

#[derive(Debug, thiserror::Error)]
pub enum SendError {
    #[error("device not connected to this node")]
    NotConnected,
    #[error("channel closed")]
    Closed,
}

pub type RegistryRef = Arc<ChannelRegistry>;
