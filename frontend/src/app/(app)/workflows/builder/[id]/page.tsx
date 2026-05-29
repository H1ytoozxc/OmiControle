"use client";

import * as React from "react";
import {
  Bot, Cpu, GitBranch, Mail, ShieldAlert, Sparkles, Webhook, Zap,
  Plus, Save, Play, MoreHorizontal,
} from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge,
} from "@/components/primitives";
import { cn } from "@/lib/utils";

/**
 * Workflow Builder canvas — a low-fi "blueprint" diagram with node cards on
 * an SVG grid. ReactFlow can drop in as a paid upgrade; this baseline is fast,
 * keyboard-navigable, and stylistically coherent with the rest of Sequoia OS.
 */

type NodeKind = "trigger" | "select" | "ai" | "exec" | "branch" | "notify" | "wait" | "webhook";

interface Node {
  id: string;
  kind: NodeKind;
  title: string;
  subtitle?: string;
  x: number;
  y: number;
}

const NODES: Node[] = [
  { id: "n1", kind: "trigger",  title: "On event",            subtitle: "device_telemetry · cpu > 85% (5m)", x: 80, y: 60 },
  { id: "n2", kind: "select",   title: "Select devices",      subtitle: "label region=eu-* · status=online",  x: 80, y: 220 },
  { id: "n3", kind: "ai",       title: "AI · summarize hotspots", subtitle: "agent=Triage · budget=2k",      x: 380, y: 220 },
  { id: "n4", kind: "branch",   title: "If severity ≥ HIGH",  subtitle: "branch",                              x: 380, y: 380 },
  { id: "n5", kind: "exec",     title: "Exec · perf-trace 60s", subtitle: "argv=[perf, record, -g, -a]",        x: 680, y: 380 },
  { id: "n6", kind: "notify",   title: "Notify oncall",       subtitle: "PagerDuty + Slack #ops",              x: 680, y: 540 },
  { id: "n7", kind: "webhook",  title: "POST /metrics",       subtitle: "https://hub.sequoia.dev/ingest",     x: 380, y: 540 },
];

const EDGES: [string, string][] = [
  ["n1", "n2"], ["n2", "n3"], ["n3", "n4"], ["n4", "n5"], ["n4", "n7"], ["n5", "n6"],
];

const ICONS: Record<NodeKind, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  trigger: Zap, select: Cpu, ai: Sparkles, exec: GitBranch, branch: ShieldAlert, notify: Mail, wait: Bot, webhook: Webhook,
};
const KIND_TONE: Record<NodeKind, "ember" | "steel" | "mint" | "bone" | "flame"> = {
  trigger: "ember", select: "steel", ai: "ember", exec: "bone", branch: "flame", notify: "steel", wait: "bone", webhook: "mint",
};

export default function WorkflowBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [selected, setSelected] = React.useState<string | null>("n3");
  const node = NODES.find((n) => n.id === selected);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-4">
      {/* head */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge size="xs" tone="bone">DRAFT</Badge>
          <h1 className="display-italic text-[28px] leading-none text-bone">anomaly-respond</h1>
          <span className="text-[11px] font-mono text-bone-dim">{id} · v3 (unsaved)</span>
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
        <div className="col-span-7 relative rounded-md border border-white/[0.08] bg-blueprint overflow-hidden">
          <Canvas selected={selected} onSelect={setSelected} />
          {/* hud */}
          <div className="absolute top-3 left-3 plate px-2 py-1.5 rounded-sm text-[10.5px] font-mono text-bone-dim flex items-center gap-3">
            <span>blueprint</span>
            <span className="opacity-60">scale 100%</span>
            <span className="opacity-60">space · drag · ⌥ zoom</span>
          </div>
          <div className="absolute bottom-3 right-3 plate px-2 py-1.5 rounded-sm text-[10.5px] font-mono text-bone-dim flex items-center gap-3">
            <span className="flex items-center gap-1.5"><Badge tone="ember" size="xs">●</Badge>trigger</span>
            <span className="flex items-center gap-1.5"><Badge tone="steel" size="xs">●</Badge>select</span>
            <span className="flex items-center gap-1.5"><Badge tone="ember" size="xs">●</Badge>ai</span>
            <span className="flex items-center gap-1.5"><Badge tone="flame" size="xs">●</Badge>branch</span>
          </div>
        </div>

        {/* inspector */}
        <Plate className="col-span-3 flex flex-col">
          <PlateHeader>
            <PlateTitle label="Inspector" subtle={node?.id ?? "—"} />
            <Button size="icon" variant="ghost"><MoreHorizontal className="w-3 h-3" /></Button>
          </PlateHeader>
          <PlateBody className="space-y-4 overflow-y-auto">
            {node ? <Inspector node={node} /> : <p className="text-[12px] text-bone-dim">Select a node.</p>}
          </PlateBody>
        </Plate>
      </div>
    </div>
  );
}

function Canvas({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="absolute inset-0">
      {/* edges */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 660" preserveAspectRatio="none">
        {EDGES.map(([a, b], i) => {
          const A = NODES.find((n) => n.id === a)!;
          const B = NODES.find((n) => n.id === b)!;
          const x1 = A.x + 110, y1 = A.y + 32;
          const x2 = B.x + 110, y2 = B.y + 32;
          const mx = (x1 + x2) / 2;
          const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
          return (
            <g key={i}>
              <path d={d} stroke="rgb(var(--hairline))" strokeOpacity="0.15" strokeWidth="1" fill="none" />
              <path d={d} stroke="rgb(var(--ember))" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="3 5" fill="none">
                <animate attributeName="stroke-dashoffset" values="0;-32" dur="3s" repeatCount="indefinite" />
              </path>
            </g>
          );
        })}
      </svg>

      {/* nodes */}
      {NODES.map((n) => {
        const Icon = ICONS[n.kind];
        const active = selected === n.id;
        return (
          <button
            key={n.id}
            onClick={() => onSelect(n.id)}
            style={{ left: n.x, top: n.y }}
            className={cn(
              "absolute w-[220px] text-left",
              "rounded-sm border bg-ink-50/95 backdrop-blur-sm transition-all duration-200",
              active
                ? "border-ember/40 shadow-ember"
                : "border-white/[0.08] hover:border-white/[0.22]"
            )}
          >
            <div className="px-3 h-7 flex items-center gap-2 border-b border-white/[0.06]">
              <span className={cn(
                "w-4 h-4 grid place-items-center rounded-[3px] border",
                `text-${KIND_TONE[n.kind]}`,
                `border-${KIND_TONE[n.kind]}/40`,
                `bg-${KIND_TONE[n.kind]}/10`,
              )}>
                <Icon className="w-2.5 h-2.5" strokeWidth={1.8} />
              </span>
              <span className="eyebrow text-[9.5px]">{n.kind}</span>
              <span className="ml-auto text-[9.5px] font-mono text-bone-dim">{n.id}</span>
            </div>
            <div className="px-3 py-2">
              <div className="text-[12.5px] text-bone leading-tight">{n.title}</div>
              {n.subtitle && (
                <div className="text-[10.5px] font-mono text-bone-dim mt-0.5 truncate">{n.subtitle}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Inspector({ node }: { node: Node }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Badge size="sm" tone={KIND_TONE[node.kind]} className="uppercase">{node.kind}</Badge>
        <span className="font-mono text-[10.5px] text-bone-dim">{node.id}</span>
      </div>
      <Field label="Title">{node.title}</Field>
      <Field label="Description">{node.subtitle}</Field>
      <Field label="Retry policy"><span className="font-mono text-bone-muted">3 attempts · exp backoff · jitter</span></Field>
      <Field label="Timeout"><span className="font-mono text-bone-muted">10s</span></Field>
      <Field label="Idempotency"><span className="font-mono text-bone-muted">auto · (run · step · attempt)</span></Field>
      <Field label="Connections">
        <div className="space-y-1.5">
          {EDGES.filter(([a]) => a === node.id).map(([, to], i) => (
            <div key={i} className="flex items-center gap-2 text-[11.5px] font-mono">
              <span className="text-bone-dim">→</span>
              <span className="text-bone-muted">{to}</span>
            </div>
          ))}
        </div>
      </Field>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div className="text-[12.5px] text-bone">{children}</div>
    </div>
  );
}
