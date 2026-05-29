//! Redis Streams implementation of `EventBus`.
//!
//! Topics map 1:1 to streams. Consumer groups provide at-least-once delivery;
//! pending entries are reclaimed by `XAUTOCLAIM` (started by a background
//! janitor in the service binary, not here).

use async_trait::async_trait;
use deadpool_redis::{Config as PoolConfig, Pool, Runtime};
use futures::stream::{self, BoxStream};
use futures::StreamExt;
use redis::streams::{StreamReadOptions, StreamReadReply};
use redis::AsyncCommands;
use thiserror::Error;
use tokio::sync::mpsc;

use crate::envelope::Envelope;
use crate::{BusError, EventBus};

#[derive(Debug, Error)]
pub enum InitError {
    #[error("pool: {0}")]
    Pool(String),
}

pub struct RedisStreamsBus {
    pool: Pool,
}

impl RedisStreamsBus {
    pub fn new(url: &str) -> Result<Self, InitError> {
        let cfg = PoolConfig::from_url(url);
        let pool = cfg
            .create_pool(Some(Runtime::Tokio1))
            .map_err(|e| InitError::Pool(e.to_string()))?;
        Ok(Self { pool })
    }
}

#[async_trait]
impl EventBus for RedisStreamsBus {
    async fn publish(&self, topic: &str, env: &Envelope) -> Result<(), BusError> {
        let mut conn = self.pool.get().await.map_err(|e| BusError::Publish(e.to_string()))?;
        let payload = serde_json::to_vec(env).map_err(|e| BusError::Publish(e.to_string()))?;
        // MAXLEN ~ N approximate trimming; production sets this from config.
        let _: String = redis::cmd("XADD")
            .arg(topic)
            .arg("MAXLEN")
            .arg("~")
            .arg(1_000_000)
            .arg("*")
            .arg("v")
            .arg(payload)
            .query_async(&mut *conn)
            .await
            .map_err(|e| BusError::Publish(e.to_string()))?;
        Ok(())
    }

    async fn subscribe(
        &self,
        topic: &str,
        group: &str,
        consumer: &str,
    ) -> Result<BoxStream<'static, (String, Envelope)>, BusError> {
        let pool = self.pool.clone();
        let topic = topic.to_owned();
        let group = group.to_owned();
        let consumer = consumer.to_owned();

        // ensure group exists (idempotent)
        {
            let mut conn = pool.get().await.map_err(|e| BusError::Subscribe(e.to_string()))?;
            let _: Result<(), _> = redis::cmd("XGROUP")
                .arg("CREATE")
                .arg(&topic)
                .arg(&group)
                .arg("$")
                .arg("MKSTREAM")
                .query_async(&mut *conn)
                .await; // ignore BUSYGROUP
        }

        let (tx, rx) = mpsc::channel::<(String, Envelope)>(1024);

        tokio::spawn(async move {
            let opts = StreamReadOptions::default()
                .group(&group, &consumer)
                .count(64)
                .block(5_000);
            loop {
                let mut conn = match pool.get().await {
                    Ok(c) => c,
                    Err(e) => {
                        tracing::warn!(error=%e, "redis pool unavailable, retrying");
                        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                        continue;
                    }
                };
                let reply: redis::RedisResult<StreamReadReply> = conn
                    .xread_options(&[&topic], &[">"], &opts)
                    .await;
                let r = match reply {
                    Ok(r) => r,
                    Err(e) => {
                        tracing::warn!(error=%e, topic=%topic, "xread failed");
                        tokio::time::sleep(std::time::Duration::from_millis(250)).await;
                        continue;
                    }
                };
                for k in r.keys {
                    for id in k.ids {
                        let raw: Option<Vec<u8>> = id
                            .map
                            .get("v")
                            .and_then(|v| match v {
                                redis::Value::BulkString(b) => Some(b.clone()),
                                redis::Value::SimpleString(s) => Some(s.clone().into_bytes()),
                                _ => None,
                            });
                        let Some(raw) = raw else { continue };
                        match serde_json::from_slice::<Envelope>(&raw) {
                            Ok(env) => {
                                if tx.send((id.id, env)).await.is_err() { return; }
                            }
                            Err(e) => {
                                tracing::error!(error=%e, "envelope deser failed; dropping");
                            }
                        }
                    }
                }
            }
        });

        Ok(tokio_stream::wrappers::ReceiverStream::new(rx).boxed())
    }

    async fn ack(&self, topic: &str, group: &str, ids: &[String]) -> Result<(), BusError> {
        if ids.is_empty() { return Ok(()); }
        let mut conn = self.pool.get().await.map_err(|e| BusError::Ack(e.to_string()))?;
        let mut cmd = redis::cmd("XACK");
        cmd.arg(topic).arg(group);
        for id in ids { cmd.arg(id); }
        let _: i64 = cmd.query_async(&mut *conn).await.map_err(|e| BusError::Ack(e.to_string()))?;
        Ok(())
    }
}

// Bring stream/StreamExt into scope for `.boxed()`.
#[allow(unused_imports)]
use stream::Stream;
