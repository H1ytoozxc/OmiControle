"use client";

import * as React from "react";
import { Bot, Plus, Sparkles, Zap, Brain, MessageSquare, Wrench, Activity } from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge, Stat, Sparkline, SignalDot,
} from "@/components/primitives";
import { cn } from "@/lib/utils";

interface AgentCard {
  id: string;
  name: string;
  model: "claude-opus-4-7" | "claude-sonnet-4-6" | "gpt-4-turbo" | "llama-3.3-70b-local";
  role: string;
  status: "idle" | "running" | "blocked" | "cooldown";
  runs_24h: number;
  cost_usd_24h: number;
  tokens_24h: number;
  spark: number[];
}

const AGENTS: AgentCard[] = [
  { id: "agt_TRG", name: "Triage", model: "claude-opus-4-7",   role: "Anomaly classification & routing",   status: "running",  runs_24h: 412, cost_usd_24h: 4.21, tokens_24h: 142_320, spark: gen(40, 0.7) },
  { id: "agt_CPL", name: "Copilot", model: "claude-opus-4-7",  role: "User-facing operator assistant",     status: "running",  runs_24h: 1822, cost_usd_24h: 11.40, tokens_24h: 612_400, spark: gen(40, 0.9) },
  { id: "agt_ROT", name: "Rotator", model: "claude-sonnet-4-6", role: "Secret + credential rotation",      status: "idle",     runs_24h: 12, cost_usd_24h: 0.08, tokens_24h: 8_400, spark: gen(40, 0.2) },
  { id: "agt_PRF", name: "Profiler", model: "llama-3.3-70b-local", role: "Local perf trace summarization", status: "running",  runs_24h: 224, cost_usd_24h: 0.0, tokens_24h: 38_000, spark: gen(40, 0.6) },
  { id: "agt_RSP", name: "Responder", model: "gpt-4-turbo",   role: "Incident response orchestrator",     status: "cooldown", runs_24h: 19, cost_usd_24h: 0.62, tokens_24h: 14_000, spark: gen(40, 0.3) },
  { id: "agt_QSP", name: "Quartermaster", model: "claude-sonnet-4-6", role: "Plugin install & supply",     status: "blocked",  runs_24h: 6, cost_usd_24h: 0.04, tokens_24h: 5_200, spark: gen(40, 0.1) },
];

function gen(n: number, intensity: number) {
  return Array.from({ length: n }, (_, i) =>
    Math.max(0, Math.sin(i / 4) * 20 * intensity + Math.random() * 20 * intensity + 15 * intensity)
  );
}

const MULTI_AGENT_LANES = [
  { agent: "Triage",   color: "ember", events: ["classify(alert#41822)", "route → Responder"] },
  { agent: "Responder", color: "flame", events: ["assess(severity=high)", "draft workflow", "request approval"] },
  { agent: "Profiler", color: "mint",  events: ["perf-trace start (60s)", "summarize hotspots"] },
];

export default function AiPage() {
  const [tab, setTab] = React.useState<"agents" | "runs" | "memory">("agents");

  return (
    <div className="space-y-5">
      {/* head */}
      <header className="flex items-end justify-between gap-6 fade-up">
        <div>
          <div className="eyebrow mb-2">/ ai</div>
          <h1 className="display-italic text-[44px] leading-none text-bone">AI control center</h1>
          <p className="text-[12.5px] text-bone-dim mt-2 font-mono">
            8 agents · 2 491 runs · 24 h · {(4.21 + 11.4 + 0.08 + 0.62 + 0.04).toFixed(2)} USD spent · 820 k tokens
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Sparkles className="w-3.5 h-3.5" strokeWidth={1.8} />Playground</Button>
          <Button variant="ember"><Plus className="w-3.5 h-3.5" strokeWidth={1.8} />New agent</Button>
        </div>
      </header>

      {/* hero kpi */}
      <div className="grid grid-cols-12 gap-5 fade-up" style={{ ["--d" as never]: "80ms" }}>
        <Plate className="col-span-3 scan-overlay">
          <PlateBody><Stat label="Active runs" value="14" hint="of 64 concurrent cap" delta="+3" trend="up" /></PlateBody>
        </Plate>
        <Plate className="col-span-3 scan-overlay">
          <PlateBody><Stat label="Tokens · 24h" value="820k" delta="+12%" trend="up" /></PlateBody>
        </Plate>
        <Plate className="col-span-3 scan-overlay">
          <PlateBody><Stat label="Spend · 24h" value="16.35" unit="USD" delta="−$1.10 vs avg" trend="up" /></PlateBody>
        </Plate>
        <Plate className="col-span-3 scan-overlay">
          <PlateBody><Stat label="Tool success" value="98.7" unit="%" delta="−0.4 pp" trend="down" /></PlateBody>
        </Plate>
      </div>

      {/* tabs */}
      <div className="flex items-center gap-1 fade-up" style={{ ["--d" as never]: "160ms" }}>
        {(["agents", "runs", "memory"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "h-8 px-3 text-[11.5px] font-mono uppercase tracking-[0.08em] border rounded-sm transition-colors",
              tab === t
                ? "border-white/[0.16] bg-white/[0.06] text-bone"
                : "border-white/[0.06] text-bone-dim hover:text-bone-muted"
            )}
          >{t}</button>
        ))}
        <span className="ml-3 eyebrow">⇥ next</span>
      </div>

      {tab === "agents" && <AgentsGrid />}
      {tab === "runs"   && <RunsView />}
      {tab === "memory" && <MemoryView />}

      {/* multi-agent orchestration */}
      <Plate className="fade-up" style={{ ["--d" as never]: "320ms" }} reticle>
        <PlateHeader>
          <PlateTitle label="Multi-agent · live coordination" subtle="incident #41822" live ts="t+04:21" />
          <Badge tone="ember" size="xs"><Zap className="w-2.5 h-2.5" />active</Badge>
        </PlateHeader>
        <PlateBody className="p-0">
          <Coordination />
        </PlateBody>
      </Plate>
    </div>
  );
}

function AgentsGrid() {
  return (
    <div className="grid grid-cols-3 gap-5 fade-up" style={{ ["--d" as never]: "200ms" }}>
      {AGENTS.map((a) => (
        <Plate key={a.id} className="scan-overlay">
          <PlateBody className="space-y-4">
            <div className="flex items-start gap-3">
              <span className={cn(
                "w-10 h-10 rounded-md border grid place-items-center",
                a.status === "running" ? "bg-ember/15 border-ember/30 text-ember" :
                a.status === "idle"    ? "bg-ink-100 border-white/[0.08] text-bone-muted" :
                a.status === "blocked" ? "bg-flame/15 border-flame/30 text-flame" :
                                          "bg-steel/10 border-steel/30 text-steel"
              )}>
                <Bot className="w-4 h-4" strokeWidth={1.6} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-bone text-[14px]">{a.name}</span>
                  <Badge size="xs" tone={
                    a.status === "running" ? "ember" :
                    a.status === "idle" ? "bone" :
                    a.status === "blocked" ? "flame" : "steel"
                  }>
                    <SignalDot state={
                      a.status === "running" ? "warn" :
                      a.status === "idle" ? "offline" :
                      a.status === "blocked" ? "crit" : "ok"
                    } />
                    {a.status}
                  </Badge>
                </div>
                <div className="text-[10.5px] font-mono text-bone-dim truncate">{a.id} · {a.model}</div>
              </div>
            </div>

            <p className="text-[12.5px] text-bone-muted leading-relaxed">{a.role}</p>

            <div className="grid grid-cols-3 gap-3 text-[11px] font-mono">
              <Cell label="Runs · 24h"   value={a.runs_24h.toLocaleString()} />
              <Cell label="Tokens"       value={(a.tokens_24h / 1000).toFixed(0) + "k"} />
              <Cell label="Cost · 24h"   value={a.cost_usd_24h === 0 ? "local" : "$" + a.cost_usd_24h.toFixed(2)} />
            </div>

            <Sparkline data={a.spark} tone={a.status === "running" ? "ember" : a.status === "blocked" ? "flame" : "steel"} fill height={40} />

            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" variant="outline" className="flex-1"><MessageSquare className="w-3 h-3" strokeWidth={1.6} />Conversation</Button>
              <Button size="sm" variant="ghost"><Wrench className="w-3 h-3" strokeWidth={1.6} /></Button>
            </div>
          </PlateBody>
        </Plate>
      ))}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow text-[9px]">{label}</div>
      <div className="text-bone tabular-nums">{value}</div>
    </div>
  );
}

function RunsView() {
  return (
    <Plate className="fade-up" style={{ ["--d" as never]: "200ms" }}>
      <PlateBody className="font-mono text-[11.5px] text-bone-muted">
        Runs view — paginated stream of `ai.runs` with live progress, tool calls, and cost.
      </PlateBody>
    </Plate>
  );
}

function MemoryView() {
  return (
    <div className="grid grid-cols-3 gap-5 fade-up" style={{ ["--d" as never]: "200ms" }}>
      {[
        { kind: "Facts",    icon: Brain,    count: 142, hint: "tenant-scoped, embeddings 1536-d" },
        { kind: "Episodes", icon: Activity, count: 2_481, hint: "completed runs, vector-indexed" },
        { kind: "Skills",   icon: Wrench,   count: 17, hint: "fine-tuned task primitives" },
      ].map((m) => (
        <Plate key={m.kind}>
          <PlateBody className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-sm grid place-items-center border border-white/[0.08] bg-ink-50">
                <m.icon className="w-3.5 h-3.5 text-bone-muted" strokeWidth={1.6} />
              </span>
              <span className="text-bone text-[14px]">{m.kind}</span>
              <span className="ml-auto display-italic text-[28px] leading-none text-ember">{m.count.toLocaleString()}</span>
            </div>
            <div className="text-[11.5px] text-bone-dim font-mono">{m.hint}</div>
            <Button size="sm" variant="outline" className="w-full">Browse</Button>
          </PlateBody>
        </Plate>
      ))}
    </div>
  );
}

function Coordination() {
  return (
    <div className="relative px-6 pt-4 pb-6">
      {/* timeline */}
      <div className="absolute left-[140px] right-6 top-12 bottom-6 border-t border-white/[0.06]" />
      <div className="absolute left-[140px] right-6 top-12 bottom-6 bg-grid-fine bg-[length:80px_80px] opacity-[0.06]" />
      {/* lanes */}
      <div className="relative space-y-3">
        {/* header time markers */}
        <div className="relative flex items-end gap-0 pl-[140px] mb-2 h-5 font-mono text-[10px] tracking-wider text-bone-dim">
          {["00:00", "01:00", "02:00", "03:00", "04:00", "05:00"].map((m) => (
            <span key={m} className="flex-1">{m}</span>
          ))}
        </div>
        {MULTI_AGENT_LANES.map((lane) => (
          <div key={lane.agent} className="relative flex items-center">
            <div className="w-[140px] pr-3 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full bg-${lane.color}`} />
              <span className="text-[12px] text-bone">{lane.agent}</span>
            </div>
            <div className="flex-1 relative h-8">
              {lane.events.map((e, i) => (
                <div
                  key={i}
                  className="absolute top-1 h-6 px-2 rounded-sm border border-white/[0.08] bg-ink-50/80 backdrop-blur-sm text-[10.5px] font-mono text-bone-muted flex items-center gap-1.5"
                  style={{ left: `${i * 100 + 10}px`, animation: `slidein 600ms cubic-bezier(0.16,1,0.3,1) both`, animationDelay: `${i * 120}ms` }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full bg-${lane.color}`} />
                  {e}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes slidein { from { opacity:0; transform: translateX(8px) } to { opacity:1; transform:none } }`}</style>
    </div>
  );
}
