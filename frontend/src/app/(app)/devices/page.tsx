"use client";

import * as React from "react";
import Link from "next/link";
import { Filter, Search, Plus, Cpu, MemoryStick, Wifi, MoreHorizontal } from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateFooter,
  Button, Badge, SignalDot, Sparkline,
} from "@/components/primitives";
import { cn, fmtAgo } from "@/lib/utils";

interface Row {
  id: string;
  name: string;
  platform: "linux" | "windows" | "macos" | "android";
  status: "ok" | "warn" | "crit" | "offline";
  region: string;
  cpu: number;
  ram: number;
  net: number;
  last_seen_ms: number;
  cpu_spark: number[];
  tags: string[];
  version: string;
}

const ROWS: Row[] = Array.from({ length: 14 }, (_, i) => {
  const status = (["ok", "ok", "ok", "ok", "warn", "ok", "ok", "crit", "offline", "ok", "ok", "warn", "ok", "ok"][i]) as Row["status"];
  const region = ["us-west-2", "eu-west-1", "ap-southeast-1", "ap-east-1", "us-east-1", "eu-central-1"][i % 6];
  const platform = (["linux", "linux", "windows", "macos", "linux", "android"] as const)[i % 6];
  return {
    id: `dvc_${(0x1e0a + i).toString(36).toUpperCase()}`,
    name: ["edge-fra-37", "edge-nrt-09", "db-prod-01", "kiosk-sf-12", "edge-sgp-12", "edge-tyo-04",
           "build-iad-01", "edge-dub-22", "edge-syd-15", "edge-bom-08", "edge-cdg-31", "edge-yyz-19",
           "edge-gru-04", "edge-jnb-02"][i],
    platform,
    status,
    region,
    cpu: status === "offline" ? 0 : Math.round(20 + Math.random() * 70),
    ram: status === "offline" ? 0 : Math.round(30 + Math.random() * 55),
    net: status === "offline" ? 0 : Math.round(50 + Math.random() * 4000),
    last_seen_ms: Date.now() - (status === "offline" ? 1000 * 60 * 14 : Math.random() * 6e4),
    cpu_spark: Array.from({ length: 24 }, () => Math.random() * 100),
    tags: ["prod", region.split("-")[0], platform],
    version: ["0.9.2", "0.9.1", "0.9.2", "0.9.2", "0.9.0", "0.9.2"][i % 6],
  };
});

const STATUS_TO_BADGE = { ok: "mint", warn: "ember", crit: "flame", offline: "bone" } as const;

export default function DevicesPage() {
  const [filter, setFilter] = React.useState<"all" | Row["status"]>("all");
  const [view, setView] = React.useState<"grid" | "list">("list");
  const visible = ROWS.filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4 fade-up">
        <div>
          <div className="eyebrow mb-2">/ devices</div>
          <h1 className="display-italic text-[44px] leading-none text-bone">Fleet</h1>
          <p className="text-[12.5px] text-bone-dim mt-2 font-mono">
            12 482 enrolled · 12 425 online · drift &lt; 0.4 %
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-[280px] flex items-center gap-2 px-2.5 bg-ink-100/50 border border-white/[0.06] rounded-sm">
            <Search className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
            <input
              placeholder="id, name, label, region…"
              className="flex-1 bg-transparent outline-none text-[12.5px] text-bone placeholder:text-bone-dim"
            />
            <span className="text-[10px] font-mono text-bone-dim">142</span>
          </div>
          <Button variant="outline" size="md"><Filter className="w-3.5 h-3.5" strokeWidth={1.6} />Filter</Button>
          <Button variant="ember" size="md"><Plus className="w-3.5 h-3.5" strokeWidth={1.8} />Enroll</Button>
        </div>
      </header>

      {/* status chips + view toggle */}
      <div className="flex items-center justify-between gap-3 fade-up" style={{ ["--d" as never]: "60ms" }}>
        <div className="flex items-center gap-1.5">
          {(["all", "ok", "warn", "crit", "offline"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "h-7 px-2.5 text-[11px] font-mono uppercase tracking-[0.08em]",
                "border rounded-sm transition-colors",
                filter === s
                  ? "bg-white/[0.08] border-white/[0.20] text-bone"
                  : "bg-transparent border-white/[0.06] text-bone-dim hover:text-bone-muted hover:border-white/[0.12]"
              )}
            >
              {s === "all" ? "ALL · 14" :
                s === "ok"     ? "HEALTHY · 9" :
                s === "warn"   ? "DEGRADED · 2" :
                s === "crit"   ? "CRITICAL · 1" : "OFFLINE · 1"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="eyebrow mr-2">view</span>
          {(["list", "grid"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "h-7 px-2.5 text-[11px] font-mono uppercase border rounded-sm",
                view === v ? "border-ember/40 bg-ember/10 text-ember" : "border-white/[0.06] text-bone-dim hover:text-bone-muted"
              )}
            >{v}</button>
          ))}
        </div>
      </div>

      {/* primary plate */}
      <Plate className="fade-up" style={{ ["--d" as never]: "120ms" }}>
        <PlateHeader>
          <PlateTitle label="Devices · live" subtle={`${visible.length} of 12 482`} live ts="STREAMING" />
          <div className="flex items-center gap-2 font-mono text-[10.5px] text-bone-dim">
            <span>sort:</span>
            <button className="text-bone-muted hover:text-bone underline-offset-2 underline">last_seen ↓</button>
          </div>
        </PlateHeader>

        {view === "list" ? <ListView rows={visible} /> : <GridView rows={visible} />}

        <PlateFooter>
          <span>showing {visible.length} of 12 482 · keyboard: J/K to step, ↵ to open</span>
          <Button size="xs" variant="ghost">Load more →</Button>
        </PlateFooter>
      </Plate>
    </div>
  );
}

function ListView({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="eyebrow text-left">
            <th className="px-4 py-2 font-normal w-6"></th>
            <th className="py-2 font-normal">Device</th>
            <th className="py-2 font-normal">Region</th>
            <th className="py-2 font-normal">CPU</th>
            <th className="py-2 font-normal">Memory</th>
            <th className="py-2 font-normal">Net</th>
            <th className="py-2 font-normal">Last seen</th>
            <th className="py-2 font-normal w-32">Trend · CPU 24m</th>
            <th className="px-4 py-2 font-normal w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            return (
              <tr key={r.id} className="group border-t border-white/[0.04] hover:bg-white/[0.02]">
                <td className="pl-4 py-2.5">
                  <SignalDot state={r.status as never} pulse />
                </td>
                <td className="py-2.5">
                  <Link href={`/devices/${r.id}` as never} className="flex flex-col">
                    <span className="text-bone group-hover:text-ember transition-colors">{r.name}</span>
                    <span className="text-[10.5px] font-mono text-bone-dim">{r.id} · {r.platform} · v{r.version}</span>
                  </Link>
                </td>
                <td className="py-2.5 font-mono text-bone-muted">{r.region}</td>
                <td className="py-2.5 font-mono">
                  <BarCell value={r.cpu} max={100} tone={r.cpu > 80 ? "flame" : r.cpu > 60 ? "ember" : "mint"} suffix="%" />
                </td>
                <td className="py-2.5 font-mono">
                  <BarCell value={r.ram} max={100} tone={r.ram > 80 ? "flame" : r.ram > 60 ? "ember" : "mint"} suffix="%" />
                </td>
                <td className="py-2.5 font-mono text-bone-muted tabular-nums">{r.net.toLocaleString()} kbps</td>
                <td className="py-2.5 font-mono text-bone-dim">{fmtAgo(Date.now() - r.last_seen_ms)}</td>
                <td className="py-2.5 pr-4 w-32">
                  <Sparkline data={r.cpu_spark} tone={r.status === "ok" ? "mint" : r.status === "warn" ? "ember" : "flame"} height={20} />
                </td>
                <td className="pr-4 py-2.5 text-right">
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-bone-dim hover:text-bone">
                    <MoreHorizontal className="w-4 h-4" strokeWidth={1.6} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GridView({ rows }: { rows: Row[] }) {
  return (
    <div className="p-4 grid grid-cols-3 gap-3">
      {rows.map((r) => (
        <Link
          key={r.id}
          href={`/devices/${r.id}` as never}
          className="group block p-4 rounded-sm border border-white/[0.06] hover:border-white/[0.16] bg-ink-100/40 hover:bg-ink-100 transition-colors scan-overlay"
        >
          <div className="flex items-center gap-2 mb-2">
            <SignalDot state={r.status as never} pulse />
            <span className="text-bone text-[13px] group-hover:text-ember transition-colors">{r.name}</span>
            <Badge size="xs" tone={STATUS_TO_BADGE[r.status]} className="ml-auto">{r.platform}</Badge>
          </div>
          <div className="text-[10.5px] font-mono text-bone-dim mb-3">{r.id} · {r.region}</div>
          <div className="grid grid-cols-3 gap-2 text-[10.5px] font-mono text-bone-muted">
            <Metric icon={Cpu}         label="CPU"  value={`${r.cpu}%`} />
            <Metric icon={MemoryStick} label="RAM"  value={`${r.ram}%`} />
            <Metric icon={Wifi}        label="NET"  value={`${r.net}k`} />
          </div>
          <div className="mt-3 -mx-1">
            <Sparkline data={r.cpu_spark} tone={r.status === "ok" ? "mint" : r.status === "warn" ? "ember" : "flame"} height={28} fill />
          </div>
        </Link>
      ))}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-bone-dim"><Icon className="w-2.5 h-2.5" strokeWidth={1.6} />{label}</span>
      <span className="text-bone tabular-nums">{value}</span>
    </div>
  );
}

function BarCell({ value, max, tone, suffix }: { value: number; max: number; tone: "mint" | "ember" | "flame"; suffix: string }) {
  const pct = (value / max) * 100;
  const color = `rgb(var(--${tone}))`;
  return (
    <div className="flex items-center gap-2">
      <span className="tabular-nums text-bone w-9">{value}{suffix}</span>
      <span className="relative h-1.5 w-24 bg-white/[0.06] rounded-sm overflow-hidden">
        <span className="absolute inset-y-0 left-0 rounded-sm" style={{ width: `${pct}%`, background: color }} />
      </span>
    </div>
  );
}
