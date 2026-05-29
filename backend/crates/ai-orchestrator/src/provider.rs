//! Provider abstraction.
//!
//! Each backend (Anthropic, OpenAI, Ollama, vLLM) implements `LlmProvider`.
//! Streaming returns a `Stream<Delta>` so callers can backpressure.

use std::collections::HashMap;
use std::pin::Pin;
use std::sync::Arc;

use async_trait::async_trait;
use futures::Stream;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::config::AiConfig;

#[derive(Debug, Error)]
pub enum ProviderError {
    #[error("transport: {0}")] Transport(String),
    #[error("rate limited")]  RateLimited,
    #[error("model not supported: {0}")] UnsupportedModel(String),
    #[error("auth: {0}")]     Auth(String),
    #[error("decode: {0}")]   Decode(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: Role,
    pub content: String,
    #[serde(default)] pub tool_calls: Vec<ToolCall>,
    #[serde(default)] pub tool_call_id: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role { System, User, Assistant, Tool }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Clone)]
pub struct CompletionRequest {
    pub model: String,
    pub messages: Vec<Message>,
    pub tools: Vec<Tool>,
    pub temperature: f32,
    pub max_tokens: u32,
    pub stream: bool,
}

#[derive(Debug, Clone)]
pub enum Delta {
    TextDelta(String),
    ToolCall(ToolCall),
    FinishReason(String),
    Usage { input_tokens: u64, output_tokens: u64 },
}

pub type DeltaStream = Pin<Box<dyn Stream<Item = Result<Delta, ProviderError>> + Send + 'static>>;

#[async_trait]
pub trait LlmProvider: Send + Sync {
    fn name(&self) -> &'static str;
    fn supports(&self, model: &str) -> bool;
    async fn complete(&self, req: CompletionRequest) -> Result<DeltaStream, ProviderError>;
}

pub struct ProviderRegistry {
    by_name: HashMap<String, Arc<dyn LlmProvider>>,
}

impl ProviderRegistry {
    pub fn from_config(_cfg: &AiConfig) -> anyhow::Result<Self> {
        let mut by_name: HashMap<String, Arc<dyn LlmProvider>> = HashMap::new();
        // Skeleton — real providers wired here:
        // by_name.insert("anthropic".into(), Arc::new(anthropic::AnthropicProvider::new(&cfg)?));
        // by_name.insert("openai".into(),    Arc::new(openai::OpenAiProvider::new(&cfg)?));
        // by_name.insert("ollama".into(),    Arc::new(ollama::OllamaProvider::new(&cfg)?));
        Ok(Self { by_name })
    }

    pub fn pick_for(&self, model: &str) -> Option<Arc<dyn LlmProvider>> {
        self.by_name.values().find(|p| p.supports(model)).cloned()
    }
}
