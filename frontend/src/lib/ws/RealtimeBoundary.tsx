"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RealtimeClient } from "./client";
import { useRealtime } from "@/lib/store/realtime";
import type { Envelope, DeviceTelemetry } from "@/types/events";

/**
 * Mounted once at the app root. Owns the singleton RealtimeClient and pipes
 * every envelope into:
 *   1. The Zustand realtime store (live UI bits)
 *   2. TanStack Query caches (so paginated tables update without refetch)
 */
export function RealtimeBoundary({ children }: { children: React.ReactNode }) {
  const setStatus = useRealtime((s) => s.setStatus);
  const ingest = useRealtime((s) => s.ingest);
  const ingestTelemetry = useRealtime((s) => s.ingestTelemetry);
  const qc = useQueryClient();

  React.useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8083/ws";
    const client = new RealtimeClient({
      url,
      fetchTicket: async () => {
        // POST /v1/auth/ws-ticket — exchange the access cookie for a single-use ticket.
        try {
          const r = await fetch("/api/auth/ws-ticket", { method: "POST", credentials: "include" });
          const j = await r.json();
          return j.ticket;
        } catch {
          return "dev-ticket";
        }
      },
      onStatus: (s) => setStatus(s),
    });
    client.connect();

    const off = client.subscribe((env: Envelope) => {
      ingest(env);
      switch (env.kind) {
        case "device_telemetry": {
          const t = env.payload as DeviceTelemetry;
          ingestTelemetry(t.device_id, t.metric, t.value);
          // Live-patch the cached list, if any.
          qc.setQueryData(["devices"], (prev: unknown) => prev);
          break;
        }
        case "device_connected":
        case "device_disconnected":
          qc.invalidateQueries({ queryKey: ["devices"], refetchType: "none" });
          break;
        case "workflow_started":
        case "workflow_step_completed":
        case "workflow_failed":
        case "workflow_completed":
          qc.invalidateQueries({ queryKey: ["workflows"], refetchType: "none" });
          break;
      }
    });

    return () => { off(); client.destroy(); };
  }, [ingest, ingestTelemetry, setStatus, qc]);

  return <>{children}</>;
}
