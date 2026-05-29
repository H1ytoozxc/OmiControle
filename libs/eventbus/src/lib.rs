//! Pluggable event bus abstraction.
//!
//! Default implementation: Redis Streams with consumer groups providing
//! at-least-once delivery. The `EventBus` trait is provider-agnostic so we
//! can swap to NATS JetStream / Kafka without touching call sites.

pub mod envelope;
pub mod redis_streams;

use async_trait::async_trait;
use futures::stream::BoxStream;
use thiserror::Error;

pub use envelope::{Envelope, EventKind};

#[derive(Debug, Error)]
pub enum BusError {
    #[error("publish: {0}")]
    Publish(String),
    #[error("subscribe: {0}")]
    Subscribe(String),
    #[error("ack: {0}")]
    Ack(String),
}

#[async_trait]
pub trait EventBus: Send + Sync {
    /// Publish a single event to a topic. Caller is responsible for ordering
    /// guarantees — partitioning is by `Envelope::partition_key` when set.
    async fn publish(&self, topic: &str, env: &Envelope) -> Result<(), BusError>;

    /// Subscribe with a consumer group. Returned stream yields `(ack_id, env)`;
    /// the consumer MUST call `ack` after successful processing.
    async fn subscribe(
        &self,
        topic: &str,
        group: &str,
        consumer: &str,
    ) -> Result<BoxStream<'static, (String, Envelope)>, BusError>;

    async fn ack(&self, topic: &str, group: &str, ids: &[String]) -> Result<(), BusError>;
}
