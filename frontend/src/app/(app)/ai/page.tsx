"use client";

import * as React from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge,
} from "@/components/primitives";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api/client";

interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  model: string;
  system_prompt: string;
  tool_ids: string[];
}

interface AgentListResp {
  items: Agent[];
  next_cursor?: string;
}

export default function AiPage() {
  const t = useT().ai;

  const agentsQuery = useQuery<AgentListResp>({
    queryKey: ["ai-agents"],
    queryFn: () => api<AgentListResp>("/v1/ai/agents"),
    retry: false,
  });

  const agents = agentsQuery.data?.items ?? [];
  const isUnavailable = agentsQuery.isError;

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-6 fade-up">
        <div>
          <p className="eyebrow mb-2">/ ai</p>
          <h1 className="text-[36px] font-semibold leading-tight text-bone tracking-tight">{t.title}</h1>
          <p className="text-[12.5px] text-bone-muted mt-1">{t.emptyNote}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ember" onClick={() => toast.info("AI agent creation — coming soon")}>
            <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />{t.create}
          </Button>
        </div>
      </header>

      <Plate className="fade-up" style={{ ["--d" as never]: "80ms" }}>
        <PlateHeader>
          <PlateTitle
            label={t.eyebrow}
            subtle={agentsQuery.isLoading ? "…" : String(agents.length)}
          />
          {isUnavailable && (
            <Badge size="xs" tone="bone">service unavailable</Badge>
          )}
        </PlateHeader>
        <PlateBody>
          {agentsQuery.isLoading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-bone-muted text-[13px]">
              <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.6} />
              Loading agents…
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-md bg-ink-100 border border-white/[0.08] grid place-items-center mb-4">
                <Plus className="w-5 h-5 text-bone-dim" strokeWidth={1.4} />
              </div>
              <p className="text-[14px] text-bone mb-1">{t.empty}</p>
              <p className="text-[12.5px] text-bone-muted max-w-[340px] leading-relaxed mb-5">{t.emptyNote}</p>
              <Button variant="ember" size="md" onClick={() => toast.info("AI agent creation — coming soon")}>
                <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />{t.create}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {agents.map((a) => (
                <div key={a.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-bone truncate">{a.name}</p>
                    <p className="text-[11px] font-mono text-bone-dim mt-0.5 truncate">
                      {a.model} · {a.tool_ids.length} tools
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => toast.info("Run — coming soon")}>
                    Run
                  </Button>
                </div>
              ))}
            </div>
          )}
        </PlateBody>
      </Plate>
    </div>
  );
}
