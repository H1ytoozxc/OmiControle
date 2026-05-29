//! Step trait. Native steps register at compile time; WASM steps are looked
//! up at runtime via the plugin-host.

use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait Step: Send + Sync {
    fn name(&self) -> &'static str;
    async fn execute(&self, input: Value, idempotency_key: &str) -> anyhow::Result<Value>;
}
