use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

/// Universal event envelope used across topics.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Envelope {
    /// Stable id (ULID) — also used to dedupe at consumers.
    pub id: String,
    pub kind: EventKind,
    /// Tenant scope; consumers can filter on this without parsing payload.
    pub tenant_id: String,
    pub correlation_id: String,
    /// Optional partition key — providers that support it use it for ordering.
    pub partition_key: Option<String>,
    pub schema_version: u32,
    #[serde(with = "time::serde::rfc3339")]
    pub occurred_at: OffsetDateTime,
    pub payload: serde_json::Value,
}

impl Envelope {
    pub fn new(kind: EventKind, tenant_id: impl Into<String>, payload: serde_json::Value) -> Self {
        Self {
            id: ulid::Ulid::new().to_string(),
            kind,
            tenant_id: tenant_id.into(),
            correlation_id: ulid::Ulid::new().to_string(),
            partition_key: None,
            schema_version: 1,
            occurred_at: OffsetDateTime::now_utc(),
            payload,
        }
    }
}

/// Cross-cutting categorization. Keep this list short; per-topic shape lives
/// in `payload`.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum EventKind {
    DeviceConnected,
    DeviceDisconnected,
    DeviceTelemetry,
    DeviceCommand,
    DeviceCommandResult,
    WorkflowStarted,
    WorkflowStepCompleted,
    WorkflowFailed,
    WorkflowCompleted,
    AiRunStarted,
    AiRunStepEmitted,
    AiRunFinished,
    NotificationDelivered,
    AuditEvent,
}
