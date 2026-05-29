"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Envelope } from "@/types/events";

/**
 * Realtime store — the single source of truth for live state.
 *
 * Pattern:
 *   - Subsystem slices (devices, runs, alerts) live as Maps for O(1) updates.
 *   - We retain ~5min of recent events for the activity feed.
 *   - TanStack Query caches REST/gRPC fetches; the WS pushes ingest *into the
 *     same query keys* via `queryClient.setQueryData` so components don't have
 *     to dual-subscribe.
 */

export type ConnStatus = "idle" | "connecting" | "open" | "closed" | "errored";

interface LiveDevice {
  id: string;
  status: "online" | "offline" | "unreachable";
  last_seen_ms: number;
  cpu?: number;
  ram?: number;
  net_kbps?: number;
}

interface RealtimeStore {
  status: ConnStatus;
  setStatus: (s: ConnStatus) => void;

  devices: Map<string, LiveDevice>;
  ingestTelemetry: (deviceId: string, metric: string, value: number) => void;
  setDevice: (d: LiveDevice) => void;

  recent: Envelope[];
  ingest: (env: Envelope) => void;
}

const RECENT_CAP = 200;

export const useRealtime = create<RealtimeStore>()(
  subscribeWithSelector((set) => ({
    status: "idle",
    setStatus: (s) => set({ status: s }),

    devices: new Map(),
    ingestTelemetry: (deviceId, metric, value) =>
      set((s) => {
        const m = new Map(s.devices);
        const d = m.get(deviceId) ?? {
          id: deviceId,
          status: "online",
          last_seen_ms: Date.now(),
        };
        if (metric === "cpu") d.cpu = value;
        else if (metric === "ram") d.ram = value;
        else if (metric === "net_kbps") d.net_kbps = value;
        d.last_seen_ms = Date.now();
        m.set(deviceId, d);
        return { devices: m };
      }),
    setDevice: (d) =>
      set((s) => {
        const m = new Map(s.devices);
        m.set(d.id, d);
        return { devices: m };
      }),

    recent: [],
    ingest: (env) =>
      set((s) => {
        const recent = [env, ...s.recent].slice(0, RECENT_CAP);
        return { recent };
      }),
  }))
);
