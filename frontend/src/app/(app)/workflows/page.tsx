"use client";

import * as React from "react";
import Link from "next/link";
import { Workflow, Plus, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge, Sparkline, SignalDot,
} from "@/components/primitives";

interface WfRow {
  id: string;
  name: string;
  trigger: "cron" | "event" | "manual" | "ai";
  last_run: { status: "ok" | "fail" | "warn"; at_ms: number; duration_ms: number };
  runs_24h: { ok: number; fail: number };
  spark: number[];
}

const WORKFLOWS: WfRow[] = [
  { id: "wf_RTS", name: "rotate-secrets",          trigger: "cron",   last_run: { status: "ok",   at_ms: Date.now()-12*60*1000,  duration_ms: 38400  }, runs_24h: { ok: 24, fail: 0 }, spark: gen(28, 0.4) },
  { id: "wf_ANM", name: "anomaly-respond",         trigger: "event",  last_run: { status: "warn", at_ms: Date.now()-2*60*1000,   duration_ms: 4100   }, runs_24h: { ok: 142, fail: 3 }, spark: gen(28, 0.7) },
  { id: "wf_BCK", name: "edge-backup",             trigger: "cron",   last_run: { status: "ok",   at_ms: Date.now()-46*60*1000,  duration_ms: 142000 }, runs_24h: { ok: 12, fail: 0 }, spark: gen(28, 0.6) },
  { id: "wf_PRV", name: "provision-from-template", trigger: "manual", last_run: { status: "ok",   at_ms: Date.now()-6*60*60*1000, duration_ms: 12300 }, runs_24h: { ok: 4, fail: 0 }, spark: gen(28, 0.2) },
  { id: "wf_TRG", name: "ai-triage-fanout",        trigger: "ai",     last_run: { status: "fail", at_ms: Date.now()-22*60*1000,  duration_ms: 9100   }, runs_24h: { ok: 88, fail: 7 }, spark: gen(28, 0.5) },
];

function gen(n: number, intensity: number) {
  return Array.from({ length: n }, (_, i) =>
    Math.max(0, Math.sin(i / 3) * 8 * intensity + Math.random() * 10 * intensity + 5 * intensity)
  );
}

const TRIGGER_BADGE = {
  cron:   { tone: "steel" as const, label: "CRON" },
  event:  { tone: "ember" as const, label: "EVENT" },
  manual: { tone: "bone"  as const, label: "MANUAL" },
  ai:     { tone: "ember" as const, label: "AI" },
};

export default function WorkflowsPage() {
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-6 fade-up">
        <div>
          <div className="eyebrow mb-2">/ workflows</div>
          <h1 className="display-italic text-[44px] leading-none text-bone">Workflow engine</h1>
          <p className="text-[12.5px] font-mono text-bone-dim mt-2">
            23 active definitions · 318 runs · 24h · 98.7% success
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Import blueprint</Button>
          <Button variant="ember" asChild>
            <Link href="/workflows/builder/new"><Plus className="w-3.5 h-3.5" strokeWidth={1.8} />New workflow</Link>
          </Button>
        </div>
      </header>

      <Plate className="fade-up" style={{ ["--d" as never]: "100ms" }}>
        <PlateHeader>
          <PlateTitle label="Definitions" subtle="23 of 23" live ts="LIVE" />
        </PlateHeader>
        <PlateBody className="p-0">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="eyebrow text-left">
                <th className="pl-4 py-2 font-normal w-6"></th>
                <th className="py-2 font-normal">Workflow</th>
                <th className="py-2 font-normal">Trigger</th>
                <th className="py-2 font-normal">Last run</th>
                <th className="py-2 font-normal">Duration</th>
                <th className="py-2 font-normal">24h success</th>
                <th className="py-2 font-normal w-44">Trend · 24h</th>
                <th className="pr-4 py-2 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {WORKFLOWS.map((w) => (
                <tr key={w.id} className="group border-t border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="pl-4 py-3"><Workflow className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} /></td>
                  <td className="py-3">
                    <Link href={`/workflows/builder/${w.id}` as never} className="flex flex-col">
                      <span className="text-bone group-hover:text-ember transition-colors">{w.name}</span>
                      <span className="text-[10.5px] font-mono text-bone-dim">{w.id}</span>
                    </Link>
                  </td>
                  <td className="py-3">
                    <Badge size="xs" tone={TRIGGER_BADGE[w.trigger].tone}>{TRIGGER_BADGE[w.trigger].label}</Badge>
                  </td>
                  <td className="py-3 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {w.last_run.status === "ok"   && <CheckCircle2 className="w-3 h-3 text-mint" strokeWidth={1.8} />}
                      {w.last_run.status === "warn" && <AlertTriangle className="w-3 h-3 text-ember" strokeWidth={1.8} />}
                      {w.last_run.status === "fail" && <XCircle className="w-3 h-3 text-flame" strokeWidth={1.8} />}
                      <span className="text-bone-muted">{ago(w.last_run.at_ms)}</span>
                    </div>
                  </td>
                  <td className="py-3 font-mono text-bone-muted tabular-nums"><Clock className="w-3 h-3 inline mr-1" />{(w.last_run.duration_ms / 1000).toFixed(1)}s</td>
                  <td className="py-3 font-mono">
                    <span className="text-mint tabular-nums">{w.runs_24h.ok}</span>
                    <span className="text-bone-dim mx-1">/</span>
                    <span className="text-flame tabular-nums">{w.runs_24h.fail}</span>
                  </td>
                  <td className="py-3 pr-2 w-44">
                    <Sparkline data={w.spark} tone={w.runs_24h.fail > 0 ? "ember" : "mint"} height={22} />
                  </td>
                  <td className="pr-4 py-3 text-right">
                    <Button size="xs" variant="ghost">Run now</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PlateBody>
      </Plate>

      {/* live runs */}
      <Plate className="fade-up" style={{ ["--d" as never]: "200ms" }} reticle>
        <PlateHeader>
          <PlateTitle label="Live executions" subtle="3 of 14 in-flight" live ts="STREAMING" />
        </PlateHeader>
        <PlateBody className="p-4 space-y-3">
          <LiveRun name="anomaly-respond" id="run_8F2A" progress={64} steps={7} step={5} took={2.4} kind="ok" />
          <LiveRun name="ai-triage-fanout" id="run_8F18" progress={22} steps={11} step={3} took={0.8} kind="warn" />
          <LiveRun name="edge-backup" id="run_8F09" progress={89} steps={4} step={4} took={14.1} kind="ok" />
        </PlateBody>
      </Plate>
    </div>
  );
}

function ago(t: number) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s/60)}m`;
  if (s < 86400) return `${Math.round(s/3600)}h`;
  return `${Math.round(s/86400)}d`;
}

function LiveRun({ name, id, progress, steps, step, took, kind }: { name: string; id: string; progress: number; steps: number; step: number; took: number; kind: "ok" | "warn" | "crit" }) {
  return (
    <div className="border border-white/[0.06] rounded-sm bg-ink-50/40">
      <div className="flex items-center gap-3 px-3 h-9 border-b border-white/[0.04]">
        <SignalDot state={kind} pulse />
        <span className="text-[12.5px] text-bone">{name}</span>
        <span className="text-[10.5px] font-mono text-bone-dim">{id}</span>
        <span className="ml-auto text-[10.5px] font-mono text-bone-muted">step {step} of {steps} · {took.toFixed(1)}s</span>
      </div>
      <div className="relative h-1.5 bg-white/[0.04]">
        <div
          className={kind === "warn" ? "absolute inset-y-0 left-0 bg-ember" : "absolute inset-y-0 left-0 bg-mint"}
          style={{ width: `${progress}%`, transition: "width 600ms cubic-bezier(0.16,1,0.3,1)" }}
        />
        <div
          className="absolute inset-y-0 right-0 left-0"
          style={{ background: "repeating-linear-gradient(90deg, transparent 0 8px, rgb(var(--bone) / 0.05) 8px 9px)" }}
        />
      </div>
      <div className="flex gap-px p-3">
        {Array.from({ length: steps }).map((_, i) => (
          <div
            key={i}
            className={
              i < step ? "h-1 flex-1 bg-mint/60" :
              i === step ? "h-1 flex-1 bg-ember animate-pulse-soft" :
              "h-1 flex-1 bg-white/[0.06]"
            }
          />
        ))}
      </div>
    </div>
  );
}
