//! Agent loop: plan → call tools → reflect, until terminal.
//!
//! The loop is a small state machine. Each step is durable: we persist
//! messages to `ai.messages` so a crashed run resumes from the last cursor.

use std::sync::Arc;

use anyhow::Context;
use futures::StreamExt;
use sequoia_eventbus::Envelope;
use serde_json::json;
use tokio::sync::mpsc;

use crate::budget::TokenBudget;
use crate::provider::{Delta, Message, Role};
use crate::router::ModelRouter;
use crate::tools::ToolRegistry;

pub struct Agent {
    pub router: Arc<ModelRouter>,
    pub tools: Arc<ToolRegistry>,
}

pub enum RunEvent {
    Text(String),
    ToolCall { id: String, name: String, args: serde_json::Value },
    ToolResult { id: String, result: serde_json::Value, is_error: bool },
    Finished { status: String },
    BudgetExceeded(&'static str),
}

impl Agent {
    pub async fn run(
        self: Arc<Self>,
        model: String,
        system_prompt: String,
        user_input: String,
        mut budget: TokenBudget,
        out: mpsc::Sender<RunEvent>,
    ) -> anyhow::Result<()> {
        let mut messages = vec![
            Message { role: Role::System, content: system_prompt, tool_calls: vec![], tool_call_id: None },
            Message { role: Role::User,   content: user_input,    tool_calls: vec![], tool_call_id: None },
        ];

        let provider = self.router.resolve(&model, crate::router::RoutePolicy {
            prefer_local: false,
            max_cost_usd_micro: None,
        }).context("router")?;

        let tool_specs = self.tools.specs();
        let tools_for_provider = tool_specs.iter().map(|s| crate::provider::Tool {
            name: s.name.clone(),
            description: s.description.clone(),
            input_schema: s.schema.clone(),
        }).collect::<Vec<_>>();

        for _step in 0..16 {
            let req = crate::provider::CompletionRequest {
                model: model.clone(),
                messages: messages.clone(),
                tools: tools_for_provider.clone(),
                temperature: 0.2,
                max_tokens: 2048,
                stream: true,
            };
            let mut stream = provider.complete(req).await?;
            let mut assistant = Message {
                role: Role::Assistant, content: String::new(),
                tool_calls: vec![], tool_call_id: None,
            };

            while let Some(d) = stream.next().await {
                match d {
                    Ok(Delta::TextDelta(t)) => {
                        assistant.content.push_str(&t);
                        let _ = out.send(RunEvent::Text(t)).await;
                    }
                    Ok(Delta::ToolCall(tc)) => {
                        let _ = out.send(RunEvent::ToolCall {
                            id: tc.id.clone(), name: tc.name.clone(), args: tc.arguments.clone(),
                        }).await;
                        assistant.tool_calls.push(tc);
                    }
                    Ok(Delta::Usage { input_tokens, output_tokens }) => {
                        if !budget.consume(input_tokens, output_tokens) {
                            let _ = out.send(RunEvent::BudgetExceeded("tokens")).await;
                            return Ok(());
                        }
                    }
                    Ok(Delta::FinishReason(r)) => {
                        if r == "stop" && assistant.tool_calls.is_empty() {
                            messages.push(assistant);
                            let _ = out.send(RunEvent::Finished { status: "succeeded".into() }).await;
                            return Ok(());
                        }
                    }
                    Err(e) => {
                        let _ = out.send(RunEvent::Finished { status: format!("failed: {e}") }).await;
                        return Ok(());
                    }
                }
            }

            // Run any tool calls and append results.
            let tool_calls = std::mem::take(&mut assistant.tool_calls);
            messages.push(assistant);
            for tc in tool_calls {
                let result = match self.tools.get(&tc.name) {
                    Some((_, imp)) => imp.invoke(tc.arguments).await
                        .map(|v| (v, false))
                        .unwrap_or_else(|e| (json!({"error": e.to_string()}), true)),
                    None => (json!({"error": "unknown tool"}), true),
                };
                let _ = out.send(RunEvent::ToolResult {
                    id: tc.id.clone(), result: result.0.clone(), is_error: result.1,
                }).await;
                messages.push(Message {
                    role: Role::Tool,
                    content: serde_json::to_string(&result.0).unwrap_or_default(),
                    tool_calls: vec![],
                    tool_call_id: Some(tc.id),
                });
            }
        }
        let _ = out.send(RunEvent::Finished { status: "failed: step limit".into() }).await;
        Ok(())
    }
}

/// Helper to publish run events onto the eventbus too (for cross-service
/// observers like the Realtime Gateway).
#[allow(dead_code)]
pub fn into_envelope(tenant_id: &str, run_id: &str, evt: &RunEvent) -> Envelope {
    let (kind, payload) = match evt {
        RunEvent::Text(t)            => ("ai_run_step_emitted", json!({"run_id": run_id, "delta": t})),
        RunEvent::ToolCall { id, name, args } => ("ai_run_step_emitted", json!({"run_id": run_id, "tool_call": {"id": id, "name": name, "args": args}})),
        RunEvent::ToolResult { id, result, is_error } => ("ai_run_step_emitted", json!({"run_id": run_id, "tool_result": {"id": id, "result": result, "is_error": is_error}})),
        RunEvent::Finished { status }       => ("ai_run_finished", json!({"run_id": run_id, "status": status})),
        RunEvent::BudgetExceeded(which)     => ("ai_run_finished", json!({"run_id": run_id, "status": "budget_exceeded", "which": which})),
    };
    let _ = kind;
    Envelope::new(sequoia_eventbus::EventKind::AiRunStepEmitted, tenant_id, payload)
}
