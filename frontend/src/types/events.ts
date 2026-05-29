/**
 * Wire-level event types — mirror of `libs/eventbus::Envelope` on the server.
 * The realtime gateway pushes these JSON-encoded over WebSocket; the desktop
 * Tauri app uses the same shape over the gRPC bridge.
 */

export type EventKind =
  | "device_connected"
  | "device_disconnected"
  | "device_telemetry"
  | "device_command"
  | "device_command_result"
  | "workflow_started"
  | "workflow_step_completed"
  | "workflow_failed"
  | "workflow_completed"
  | "ai_run_started"
  | "ai_run_step_emitted"
  | "ai_run_finished"
  | "notification_delivered"
  | "audit_event";

export interface Envelope<T = unknown> {
  id: string;
  kind: EventKind;
  tenant_id: string;
  correlation_id: string;
  partition_key?: string | null;
  schema_version: number;
  occurred_at: string;          // ISO-8601
  payload: T;
}

export type DeviceStatus = "online" | "offline" | "unreachable";

export interface DeviceConnected {
  device_id: string;
  agent_version: string;
}
export interface DeviceTelemetry {
  device_id: string;
  metric: string;
  value: number;
  labels?: Record<string, string>;
}
export interface AiRunStepEmitted {
  run_id: string;
  delta?: string;
  tool_call?: { id: string; name: string; args: unknown };
  tool_result?: { id: string; result: unknown; is_error: boolean };
}
