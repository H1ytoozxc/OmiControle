//! Typed tool registry.
//!
//! Each tool declares a JSON Schema; LLM tool calls are validated against
//! it before dispatch. Implementations can be: native Rust, WASM plugin,
//! workflow trigger, or HTTP webhook.

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolSpec {
    pub name: String,
    pub description: String,
    pub schema: serde_json::Value,
    pub kind: ToolKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "impl")]
pub enum ToolKind {
    Native,
    Wasm     { installation_id: String, export: String },
    Workflow { definition_id: String },
    Http     { url: String, method: String },
}

#[async_trait]
pub trait ToolImpl: Send + Sync {
    async fn invoke(&self, args: serde_json::Value) -> anyhow::Result<serde_json::Value>;
}

pub struct ToolRegistry {
    by_name: HashMap<String, (ToolSpec, Arc<dyn ToolImpl>)>,
}

impl ToolRegistry {
    pub fn built_in() -> Self {
        let mut r = Self { by_name: HashMap::new() };
        r.register_native("now", "Current UTC time", serde_json::json!({"type": "object"}), Arc::new(NowTool));
        r
    }

    pub fn register_native(&mut self, name: &str, description: &str, schema: serde_json::Value, imp: Arc<dyn ToolImpl>) {
        let spec = ToolSpec { name: name.into(), description: description.into(), schema, kind: ToolKind::Native };
        self.by_name.insert(name.into(), (spec, imp));
    }

    pub fn specs(&self) -> Vec<ToolSpec> {
        self.by_name.values().map(|(s, _)| s.clone()).collect()
    }

    pub fn get(&self, name: &str) -> Option<&(ToolSpec, Arc<dyn ToolImpl>)> {
        self.by_name.get(name)
    }
}

struct NowTool;
#[async_trait]
impl ToolImpl for NowTool {
    async fn invoke(&self, _: serde_json::Value) -> anyhow::Result<serde_json::Value> {
        Ok(serde_json::json!({ "now": time::OffsetDateTime::now_utc().to_string() }))
    }
}
