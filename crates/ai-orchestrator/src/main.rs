//! Sequoia AI Orchestrator.
//!
//! Provider-agnostic LLM orchestration with:
//!   - typed `LlmProvider` trait (Anthropic / OpenAI / Ollama / vLLM)
//!   - agent runtime (planner → tool → reflect loop)
//!   - typed tool registry (native, WASM, workflow, HTTP)
//!   - per-tenant token + cost budgets
//!   - streaming progress events to callers (server-streamed gRPC)

mod config;
mod provider;
mod router;
mod tools;
mod agent;
mod budget;
mod grpc;

use anyhow::Context;
use std::net::SocketAddr;
use std::sync::Arc;
use tonic::transport::Server;
use tracing::info;

use crate::config::AiConfig;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> anyhow::Result<()> {
    let cfg: AiConfig = sequoia_config::load(&sequoia_config::LoadOptions {
        env_prefix: "AI",
        ..Default::default()
    })?;

    let _telemetry = sequoia_telemetry::init(sequoia_telemetry::TelemetryConfig {
        service_name: "ai-orchestrator".into(),
        service_namespace: "sequoia".into(),
        otlp_endpoint: cfg.otlp_endpoint.clone(),
        sample_ratio: 0.5,   // expensive operations: keep more traces
        log_filter: cfg.log_filter.clone(),
        enable_prometheus: true,
    })?;

    let pool = sequoia_db::init_pool(&cfg.database).await?;
    let registry = Arc::new(provider::ProviderRegistry::from_config(&cfg)?);
    let tools = Arc::new(tools::ToolRegistry::built_in());

    let svc = grpc::AiGrpc {
        pool,
        providers: registry,
        tools,
        cfg: Arc::new(cfg.clone()),
    };

    let addr: SocketAddr = cfg.bind.parse().context("bind")?;
    info!(addr=%addr, "ai-orchestrator listening");
    Server::builder()
        .add_service(sequoia_proto::sequoia::v1::ai_orchestrator_server::AiOrchestratorServer::new(svc))
        .serve(addr)
        .await?;
    Ok(())
}
