/**
 * Domain hooks — TanStack Query wrappers per resource.
 */
"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "./client";

export interface DeviceDto {
  id: string;
  name: string;
  platform: "windows" | "linux" | "macos" | "android";
  status: "online" | "offline" | "unreachable";
  last_seen_at: string;
  labels: Record<string, string>;
  agent_version: string;
}

export function useDevices(params: { status?: string; q?: string }) {
  return useInfiniteQuery({
    queryKey: ["devices", params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      api<{ items: DeviceDto[]; next_cursor: string | null }>("/v1/devices", {
        searchParams: { cursor: pageParam, status: params.status, q: params.q, limit: 50 },
      }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: ["devices", id],
    queryFn: () => api<DeviceDto>(`/v1/devices/${id}`),
    enabled: !!id,
  });
}

export function useDispatchCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { device_id: string; argv: string[]; timeout_ms: number }) =>
      api<{ command_id: string }>("/v1/commands", {
        method: "POST",
        body: { device_id: input.device_id, kind: "exec", payload: { argv: input.argv }, timeout_ms: input.timeout_ms },
        headers: { "x-idempotency-key": crypto.randomUUID() },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
}

export interface AgentDto { id: string; name: string; model: string }
export function useAgents() {
  return useQuery({ queryKey: ["agents"], queryFn: () => api<AgentDto[]>("/v1/ai/agents") });
}
