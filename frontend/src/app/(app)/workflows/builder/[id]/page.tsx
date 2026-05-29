"use client";

import * as React from "react";
import {
  Bot, Cpu, GitBranch, Mail, ShieldAlert, Sparkles, Webhook, Zap,
  Plus, Save, Play,
} from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge,
} from "@/components/primitives";

type NodeKind = "trigger" | "select" | "ai" | "exec" | "branch" | "notify" | "wait" | "webhook";

const ICONS: Record<NodeKind, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  trigger: Zap, select: Cpu, ai: Sparkles, exec: GitBranch, branch: ShieldAlert, notify: Mail, wait: Bot, webhook: Webhook,
};

export default function WorkflowBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-4">
      {/* head */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge size="xs" tone="bone">DRAFT</Badge>
          <h1 className="display-italic text-[28px] leading-none text-bone">New workflow</h1>
          <span className="text-[11px] font-mono text-bone-dim">{id} · unsaved</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost">History</Button>
          <Button size="sm" variant="outline"><Save className="w-3 h-3" strokeWidth={1.8} />Save draft</Button>
          <Button size="sm" variant="ember"><Play className="w-3 h-3" strokeWidth={1.8} />Test run</Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        {/* node palette */}
        <Plate className="col-span-2 flex flex-col">
          <PlateHeader><PlateTitle label="Nodes" /></PlateHeader>
          <PlateBody className="space-y-1.5 overflow-y-auto">
            {(["trigger", "select", "ai", "exec", "branch", "notify", "webhook", "wait"] as NodeKind[]).map((k) => {
              const Icon = ICONS[k];
              return (
                <div
                  key={k}
                  draggable
                  className="flex items-center gap-2 p-2 rounded-sm border border-white/[0.06] bg-ink-100/30 hover:bg-ink-100 hover:border-white/[0.14] cursor-grab text-[12px]"
                >
                  <span className="w-6 h-6 rounded-sm grid place-items-center border border-white/[0.08]">
                    <Icon className="w-3 h-3" strokeWidth={1.6} />
                  </span>
                  <span className="capitalize text-bone">{k}</span>
                  <Plus className="w-3 h-3 ml-auto text-bone-dim" strokeWidth={1.6} />
                </div>
              );
            })}
          </PlateBody>
        </Plate>

        {/* canvas */}
        <div className="col-span-7 relative rounded-md border border-white/[0.08] bg-blueprint overflow-hidden flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-[13px] text-bone">Empty canvas</p>
            <p className="text-[11.5px] font-mono text-bone-dim">Drag nodes from the palette to build your workflow</p>
          </div>
          <div className="absolute top-3 left-3 plate px-2 py-1.5 rounded-sm text-[10.5px] font-mono text-bone-dim flex items-center gap-3">
            <span>blueprint</span>
            <span className="opacity-60">scale 100%</span>
          </div>
        </div>

        {/* inspector */}
        <Plate className="col-span-3 flex flex-col">
          <PlateHeader>
            <PlateTitle label="Inspector" subtle="—" />
          </PlateHeader>
          <PlateBody>
            <p className="text-[12px] text-bone-dim">Select a node to inspect.</p>
          </PlateBody>
        </Plate>
      </div>
    </div>
  );
}
