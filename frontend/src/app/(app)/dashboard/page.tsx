import { Cpu, Bot, Workflow, ShieldCheck, Power, Plus, Terminal } from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody, PlateFooter,
  Button, Badge, Stat, Sparkline, SignalDot,
} from "@/components/primitives";
import { ActivityFeed } from "@/components/widgets/ActivityFeed";
import { AIAssistantPanel } from "@/components/widgets/AIAssistantPanel";
import { FleetMap } from "@/components/widgets/FleetMap";
import { AmbientPulse } from "@/components/widgets/AmbientPulse";

const SPARK_A = [12, 18, 14, 22, 19, 24, 21, 28, 26, 31, 30, 34, 32, 38, 41, 37, 44, 42];
const SPARK_B = [82, 80, 78, 84, 79, 76, 71, 73, 70, 69, 72, 68, 65, 67, 62, 64, 61, 59];
const SPARK_C = [3, 4, 2, 6, 4, 7, 5, 8, 6, 9, 11, 8, 14, 12, 17, 19, 16, 22];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* ============= HERO ============= */}
      <section
        className="relative reticle overflow-hidden border border-white/[0.08] rounded-md bg-ink-50/40 px-8 py-7 fade-up"
        style={{ ["--d" as never]: "0ms" }}
      >
        <span className="reticle-tr" /><span className="reticle-br" />

        {/* ambient art */}
        <AmbientPulse className="absolute inset-x-0 top-0 h-full w-full opacity-60 pointer-events-none" />
        <div className="absolute inset-0 bg-scanline opacity-[0.06] pointer-events-none" />

        <div className="relative flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="eyebrow">Status · 29 May 2026 · 14:08 UTC</span>
            <Badge tone="mint" size="xs"><SignalDot state="ok" />nominal</Badge>
            <Badge tone="ember" size="xs">3 advisories</Badge>
          </div>

          <div className="flex items-end justify-between gap-8 flex-wrap">
            <div className="max-w-[640px]">
              <h1 className="display-italic text-[68px] leading-[0.95] text-bone">
                Every <span className="text-ember">signal</span>
                <br /> in one instrument.
              </h1>
              <p className="mt-3 text-[13.5px] text-bone-muted leading-relaxed max-w-[520px]">
                12 482 devices · 47 active workflows · 8 autonomous agents — sequenced
                through one realtime control plane. Drift detection, anomaly response,
                and remote command are <span className="text-bone">one keystroke</span> away.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="ember" size="lg"><Plus className="w-4 h-4" strokeWidth={1.8} />Enroll device</Button>
              <Button variant="outline" size="lg"><Bot className="w-4 h-4" strokeWidth={1.8} />Launch agent</Button>
              <Button variant="ghost" size="lg"><Terminal className="w-4 h-4" strokeWidth={1.6} />Open console</Button>
            </div>
          </div>

          {/* hero kpi row */}
          <div className="mt-4 grid grid-cols-4 gap-x-8 gap-y-1 max-w-[820px]">
            <Stat label="Devices online" value="12 482" delta="+38" trend="up" hint="last 1h" />
            <Stat label="Realtime latency" value="11" unit="ms p99" delta="−4 ms" trend="up" />
            <Stat label="Workflows / hr" value="2 318" delta="+12%" trend="up" />
            <Stat label="Commands / hr" value="918" delta="−3%" trend="down" />
          </div>
        </div>
      </section>

      {/* ============= GRID ============= */}
      <div className="grid grid-cols-12 gap-5">
        {/* fleet plot — wide */}
        <Plate className="col-span-8 fade-up" style={{ ["--d" as never]: "80ms" }} reticle>
          <PlateHeader>
            <PlateTitle label="Fleet · Geographic distribution" live ts="UPDATED 4s AGO" />
            <div className="flex items-center gap-2">
              <Badge size="xs" tone="mint">12 425 online</Badge>
              <Badge size="xs" tone="ember">42 degraded</Badge>
              <Badge size="xs" tone="flame">15 offline</Badge>
            </div>
          </PlateHeader>
          <PlateBody className="p-0 h-[320px] bg-ink-50/60">
            <FleetMap />
          </PlateBody>
          <PlateFooter>
            <span>EQUIRECTANGULAR · scale 1:8.5e7 · region rings ▣</span>
            <span className="flex items-center gap-3 normal-case tracking-normal text-bone-muted">
              <span><span className="text-mint">●</span> healthy</span>
              <span><span className="text-ember">●</span> degraded</span>
              <span><span className="text-flame">●</span> offline</span>
            </span>
          </PlateFooter>
        </Plate>

        {/* ai copilot */}
        <div className="col-span-4 fade-up" style={{ ["--d" as never]: "150ms" }}>
          <AIAssistantPanel />
        </div>

        {/* metric strip */}
        <div className="col-span-8 grid grid-cols-3 gap-5 fade-up" style={{ ["--d" as never]: "230ms" }}>
          <MetricCard label="CPU load · fleet avg" value="42" unit="%" trend="up" delta="+3.1%" data={SPARK_A} tone="ember" />
          <MetricCard label="Memory pressure"     value="61" unit="%" trend="down" delta="−2.4%" data={SPARK_B} tone="mint" />
          <MetricCard label="Error rate · 5m"     value="0.18" unit="%" trend="up" delta="+0.04%" data={SPARK_C} tone="flame" />
        </div>

        {/* activity */}
        <Plate className="col-span-8 fade-up" style={{ ["--d" as never]: "310ms" }}>
          <PlateHeader>
            <PlateTitle label="Activity feed" subtle="142 events · 5m" live ts="STREAMING" />
            <Button size="xs" variant="ghost">All ↗</Button>
          </PlateHeader>
          <PlateBody className="pt-1">
            <ActivityFeed />
          </PlateBody>
        </Plate>

        {/* quick actions + system health */}
        <div className="col-span-4 flex flex-col gap-5 fade-up" style={{ ["--d" as never]: "240ms" }}>
          <Plate>
            <PlateHeader>
              <PlateTitle label="Quick actions" />
            </PlateHeader>
            <PlateBody className="space-y-1.5">
              {[
                { icon: Cpu,         title: "Enroll a device",         hint: "creates one-time code" },
                { icon: Bot,         title: "New AI agent",            hint: "from template" },
                { icon: Workflow,    title: "New workflow",            hint: "from blueprint" },
                { icon: ShieldCheck, title: "Rotate signing key",      hint: "kid lifecycle" },
                { icon: Power,       title: "Drain & restart workers", hint: "graceful · 30s" },
              ].map((q, i) => {
                const Icon = q.icon;
                return (
                  <button key={i} className="group w-full flex items-center gap-2.5 px-2 h-8 rounded-sm hover:bg-white/[0.04] text-left">
                    <span className="w-6 h-6 grid place-items-center rounded-sm border border-white/[0.08] bg-ink-50">
                      <Icon className="w-3 h-3 text-bone-muted group-hover:text-bone" strokeWidth={1.6} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <div className="text-[12px] text-bone group-hover:text-bone truncate">{q.title}</div>
                      <div className="text-[10.5px] font-mono text-bone-dim truncate">{q.hint}</div>
                    </span>
                  </button>
                );
              })}
            </PlateBody>
          </Plate>

          <Plate>
            <PlateHeader>
              <PlateTitle label="System health" live ts="OK" />
              <Badge tone="mint" size="xs">All green</Badge>
            </PlateHeader>
            <PlateBody className="space-y-2">
              {[
                { label: "Postgres primary",  state: "ok",   detail: "p99 8.4 ms · 2.3k qps" },
                { label: "Redis cluster",     state: "ok",   detail: "67 ms repl lag" },
                { label: "Realtime gateway",  state: "ok",   detail: "200 132 conns" },
                { label: "Workflow workers",  state: "warn", detail: "3 lease reclaims" },
                { label: "Plugin host",       state: "ok",   detail: "fuel 4% avg" },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between text-[11.5px]">
                  <span className="flex items-center gap-2 text-bone-muted">
                    <SignalDot state={row.state as never} pulse />
                    {row.label}
                  </span>
                  <span className="font-mono text-bone-dim text-[10.5px]">{row.detail}</span>
                </div>
              ))}
            </PlateBody>
          </Plate>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label, value, unit, delta, trend, data, tone,
}: {
  label: string; value: string; unit: string; delta: string;
  trend: "up" | "down" | "flat"; data: number[];
  tone: "ember" | "mint" | "flame";
}) {
  return (
    <Plate className="scan-overlay">
      <PlateBody className="space-y-3">
        <Stat label={label} value={value} unit={unit} delta={delta} trend={trend} />
        <Sparkline data={data} tone={tone} fill height={48} />
      </PlateBody>
    </Plate>
  );
}
