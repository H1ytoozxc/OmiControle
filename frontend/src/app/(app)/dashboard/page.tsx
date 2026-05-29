import { Cpu, Bot, Workflow, Terminal, Plus, ArrowRight } from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge, SignalDot,
} from "@/components/primitives";
import { ActivityFeed } from "@/components/widgets/ActivityFeed";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* header */}
      <section className="fade-up">
        <p className="eyebrow mb-3">Overview</p>
        <h1 className="text-[36px] font-semibold leading-tight text-bone tracking-tight">
          Fleet control plane
        </h1>
        <p className="text-[13.5px] text-bone-muted mt-1.5 max-w-[480px] leading-relaxed">
          Enroll your first device to start monitoring. Devices, workflows, and agents appear here in real time.
        </p>
        <div className="flex gap-2 mt-5">
          <Button variant="ember" size="lg">
            <Plus className="w-4 h-4" strokeWidth={1.8} />Enroll device
          </Button>
          <Button variant="outline" size="lg">
            <Bot className="w-4 h-4" strokeWidth={1.8} />Launch agent
          </Button>
        </div>
      </section>

      {/* kpi row — empty state */}
      <div className="grid grid-cols-4 gap-4 fade-up" style={{ ["--d" as never]: "60ms" }}>
        {[
          { label: "Devices online",    value: "—", hint: "No devices enrolled" },
          { label: "Realtime latency",  value: "—", hint: "Awaiting connection" },
          { label: "Workflows / hr",    value: "—", hint: "No workflows defined" },
          { label: "Commands / hr",     value: "—", hint: "No commands issued" },
        ].map((s) => (
          <Plate key={s.label}>
            <PlateBody className="space-y-1">
              <p className="eyebrow">{s.label}</p>
              <p className="text-[28px] font-semibold text-bone leading-none tabular-nums">{s.value}</p>
              <p className="text-[11px] font-mono text-bone-dim">{s.hint}</p>
            </PlateBody>
          </Plate>
        ))}
      </div>

      {/* main grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* activity */}
        <Plate className="col-span-8 fade-up" style={{ ["--d" as never]: "120ms" }}>
          <PlateHeader>
            <PlateTitle label="Activity" live ts="LIVE" />
          </PlateHeader>
          <PlateBody>
            <ActivityFeed />
          </PlateBody>
        </Plate>

        {/* quick actions */}
        <div className="col-span-4 flex flex-col gap-4 fade-up" style={{ ["--d" as never]: "160ms" }}>
          <Plate>
            <PlateHeader><PlateTitle label="Quick start" /></PlateHeader>
            <PlateBody className="space-y-2">
              {[
                { icon: Cpu,      label: "Enroll a device",    href: "/devices",   hint: "Install the agent on any host" },
                { icon: Workflow, label: "Create a workflow",  href: "/workflows", hint: "Automate device operations" },
                { icon: Bot,      label: "Configure an agent", href: "/ai",        hint: "AI-powered anomaly response" },
                { icon: Terminal, label: "Open console",       href: "#",          hint: "Run commands on your fleet" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 p-2.5 rounded-sm border border-white/[0.06] bg-ink-50/40 hover:bg-ink-100/60 hover:border-white/[0.10] transition-colors group"
                  >
                    <span className="w-7 h-7 rounded-sm bg-ink-100 border border-white/[0.08] grid place-items-center group-hover:border-ember/30 transition-colors">
                      <Icon className="w-3.5 h-3.5 text-bone-muted group-hover:text-ember transition-colors" strokeWidth={1.6} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] text-bone group-hover:text-ember transition-colors">{item.label}</p>
                      <p className="text-[10.5px] font-mono text-bone-dim truncate">{item.hint}</p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-bone-dim opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.6} />
                  </a>
                );
              })}
            </PlateBody>
          </Plate>

          <Plate>
            <PlateHeader><PlateTitle label="System status" /></PlateHeader>
            <PlateBody className="space-y-2">
              {[
                { label: "API gateway",       state: "ok"   as const },
                { label: "Database",          state: "ok"   as const },
                { label: "Realtime gateway",  state: "ok"   as const },
                { label: "Workflow workers",  state: "ok"   as const },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2 text-bone-muted">
                    <SignalDot state={row.state} />
                    {row.label}
                  </span>
                  <Badge size="xs" tone="mint">operational</Badge>
                </div>
              ))}
            </PlateBody>
          </Plate>
        </div>
      </div>
    </div>
  );
}
