//! In-process fan-out.
//!
//! Connections subscribe to topics by string. The hub keeps a per-topic
//! `DashSet<conn_id>` and a per-conn `mpsc::Sender<WsFrame>`. Events arrive
//! from Redis Streams; the pump reads, looks up subscribers, and broadcasts.
//!
//! Slow consumers are dropped (`try_send` + recycle on full) rather than
//! buffered indefinitely.

use std::sync::Arc;

use dashmap::DashMap;
use futures::StreamExt;
use sequoia_eventbus::{redis_streams::RedisStreamsBus, EventBus};
use tokio::sync::mpsc;
use tracing::warn;

use crate::config::RealtimeConfig;

pub type ConnId = u64;

pub struct Conn {
    pub tx: mpsc::Sender<String>, // JSON frames
    pub user_id: String,
    pub tenant_id: String,
}

pub struct Hub {
    pub cfg: RealtimeConfig,
    conns: DashMap<ConnId, Conn>,
    by_topic: DashMap<String, dashmap::DashSet<ConnId>>,
    bus: Arc<dyn EventBus>,
    next_id: std::sync::atomic::AtomicU64,
}

impl Hub {
    pub async fn new(cfg: RealtimeConfig) -> anyhow::Result<Self> {
        let bus = RedisStreamsBus::new(&cfg.redis_url)?;
        Ok(Self {
            cfg,
            conns: DashMap::new(),
            by_topic: DashMap::new(),
            bus: Arc::new(bus),
            next_id: std::sync::atomic::AtomicU64::new(1),
        })
    }

    pub fn register(&self, c: Conn) -> ConnId {
        let id = self.next_id.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        self.conns.insert(id, c);
        id
    }

    pub fn unregister(&self, id: ConnId) {
        self.conns.remove(&id);
        for entry in self.by_topic.iter() { entry.value().remove(&id); }
    }

    pub fn subscribe(&self, id: ConnId, topic: &str) {
        self.by_topic.entry(topic.to_owned()).or_default().insert(id);
    }

    pub fn unsubscribe(&self, id: ConnId, topic: &str) {
        if let Some(set) = self.by_topic.get(topic) { set.remove(&id); }
    }

    pub fn online_count(&self) -> usize { self.conns.len() }

    pub fn spawn_event_pump(self: Arc<Self>) {
        tokio::spawn(async move {
            let topics = ["events.devices", "events.workflows", "events.audit"];
            for topic in topics {
                let this = self.clone();
                let topic = topic.to_owned();
                tokio::spawn(async move {
                    let mut stream = match this.bus.subscribe(&topic, "realtime", "rt-1").await {
                        Ok(s) => s,
                        Err(e) => { warn!(error=%e, topic, "subscribe failed"); return; }
                    };
                    while let Some((ack_id, env)) = stream.next().await {
                        let body = match serde_json::to_string(&env) {
                            Ok(b) => b,
                            Err(_) => continue,
                        };
                        if let Some(set) = this.by_topic.get(&topic) {
                            for cid in set.iter() {
                                if let Some(c) = this.conns.get(&*cid) {
                                    // Non-blocking: drop slow consumers.
                                    let _ = c.tx.try_send(body.clone());
                                }
                            }
                        }
                        let _ = this.bus.ack(&topic, "realtime", &[ack_id]).await;
                    }
                });
            }
        });
    }
}
