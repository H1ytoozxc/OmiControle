import { Power, RotateCw, Terminal, FolderTree, GitBranch, ShieldCheck } from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge, Stat, Sparkline, SignalDot,
} from "@/components/primitives";

const RAM = Array.from({ length: 60 }, (_, i) => 50 + Math.sin(i / 4) * 10 + Math.random() * 5);
const CPU = Array.from({ length: 60 }, (_, i) => 38 + Math.sin(i / 3) * 18 + Math.random() * 7);
const NET = Array.from({ length: 60 }, (_, i) => 1100 + Math.cos(i / 5) * 600 + Math.random() * 80);

const PROCESSES = [
  { pid: 1422, user: "sequoia", cpu: 12.4, mem: 2.1, name: "sequoia-agent" },
  { pid: 3104, user: "postgres", cpu: 24.8, mem: 18.7, name: "postgres" },
  { pid: 4891, user: "root",    cpu:  4.1, mem:  1.2, name: "systemd" },
  { pid: 5102, user: "redis",   cpu:  8.0, mem:  3.4, name: "redis-server" },
  { pid: 5421, user: "nobody",  cpu:  0.6, mem:  0.4, name: "node_exporter" },
];

const TERMINAL = [
  { t: "14:08:11", lvl: "INFO",  msg: "agent connected · stream established · 11 ms RTT" },
  { t: "14:08:14", lvl: "INFO",  msg: "telemetry batch sent · 64 points · 1.2 KB" },
  { t: "14:08:18", lvl: "INFO",  msg: "command received · cmd_2H4 · exec · timeout 10s" },
  { t: "14:08:19", lvl: "WARN",  msg: "argv[0]=/usr/bin/journalctl · sudo required · escalation skipped" },
  { t: "14:08:20", lvl: "INFO",  msg: "command result · exit=0 · stdout=2.4 KB · 1.1s" },
  { t: "14:08:22", lvl: "INFO",  msg: "heartbeat ack · uptime 14d 06h 22m" },
  { t: "14:08:26", lvl: "ERROR", msg: "plugin sandbox · fuel exhausted · plg_log-rotator@0.3" },
  { t: "14:08:27", lvl: "INFO",  msg: "plugin terminated · usage 10.0M fuel · 1 invocation" },
];

export default async function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-5">
      {/* head */}
      <div className="flex items-end justify-between gap-6 fade-up">
        <div>
          <div className="eyebrow mb-2">/ devices / {id}</div>
          <div className="flex items-center gap-3">
            <h1 className="display-italic text-[44px] leading-none text-bone">edge-fra-37</h1>
            <Badge tone="mint" size="sm"><SignalDot state="ok" />ONLINE</Badge>
          </div>
          <div className="text-[11.5px] font-mono text-bone-dim mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <span>{id}</span>
            <span>linux · x86_64</span>
            <span>agent v0.9.2</span>
            <span>kernel 6.6.4-arch1-1</span>
            <span>enrolled 14d 06h ago</span>
            <span>region eu-central-1</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><RotateCw className="w-3.5 h-3.5" strokeWidth={1.6} />Restart agent</Button>
          <Button variant="outline"><Power     className="w-3.5 h-3.5" strokeWidth={1.6} />Reboot host</Button>
          <Button variant="ember"><Terminal   className="w-3.5 h-3.5" strokeWidth={1.8} />Console</Button>
        </div>
      </div>

      {/* metric strip */}
      <div className="grid grid-cols-4 gap-5 fade-up" style={{ ["--d" as never]: "80ms" }}>
        <MetricPlate label="CPU"     value="42" unit="%"  spark={CPU} tone="ember" />
        <MetricPlate label="Memory"  value="61" unit="%"  spark={RAM} tone="mint" />
        <MetricPlate label="Network" value="1.4" unit="MB/s" spark={NET} tone="steel" />
        <MetricPlate label="Disk"    value="218" unit="GB FREE" spark={RAM.map((v) => 100 - v)} tone="mint" />
      </div>

      {/* tabs row */}
      <div className="grid grid-cols-12 gap-5 fade-up" style={{ ["--d" as never]: "160ms" }}>
        <Plate className="col-span-7" reticle>
          <PlateHeader>
            <PlateTitle label="Live telemetry · console" live ts="STREAMING · MERGED" />
            <div className="flex items-center gap-2">
              <Badge size="xs" tone="bone">stdout</Badge>
              <Badge size="xs" tone="ember">events</Badge>
              <Button size="xs" variant="outline">Pause</Button>
            </div>
          </PlateHeader>
          <PlateBody className="bg-ink-50/60 font-mono text-[12px] leading-relaxed py-3 max-h-[420px] overflow-auto">
            {TERMINAL.map((line, i) => (
              <div key={i} className="flex gap-3 px-1 hover:bg-white/[0.02]">
                <span className="text-bone-dim w-[72px] shrink-0">{line.t}</span>
                <span className={
                  line.lvl === "ERROR" ? "text-flame w-12 shrink-0" :
                  line.lvl === "WARN"  ? "text-ember w-12 shrink-0" :
                                          "text-mint  w-12 shrink-0"
                }>{line.lvl}</span>
                <span className="text-bone-muted">{line.msg}</span>
              </div>
            ))}
            <div className="flex gap-2 px-1 mt-2 items-center">
              <span className="text-ember">›</span>
              <span className="text-bone caret">_</span>
              <span className="inline-block w-[7px] h-[14px] bg-ember ml-px animate-pulse-soft" />
            </div>
          </PlateBody>
        </Plate>

        <Plate className="col-span-5">
          <PlateHeader>
            <PlateTitle label="Process viewer" subtle="top 5 by CPU" />
            <Button size="xs" variant="ghost">All processes ↗</Button>
          </PlateHeader>
          <PlateBody className="p-0">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="eyebrow text-left">
                  <th className="px-4 py-2 font-normal w-12">PID</th>
                  <th className="py-2 font-normal">User</th>
                  <th className="py-2 font-normal">Process</th>
                  <th className="py-2 font-normal text-right">CPU%</th>
                  <th className="px-4 py-2 font-normal text-right">MEM%</th>
                </tr>
              </thead>
              <tbody>
                {PROCESSES.map((p) => (
                  <tr key={p.pid} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="pl-4 py-2 font-mono text-bone-muted">{p.pid}</td>
                    <td className="py-2 font-mono text-bone-dim">{p.user}</td>
                    <td className="py-2 text-bone">{p.name}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-bone">{p.cpu.toFixed(1)}</td>
                    <td className="pr-4 py-2 text-right font-mono tabular-nums text-bone-muted">{p.mem.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PlateBody>
        </Plate>
      </div>

      {/* secondary row */}
      <div className="grid grid-cols-12 gap-5 fade-up" style={{ ["--d" as never]: "240ms" }}>
        <Plate className="col-span-4">
          <PlateHeader><PlateTitle label="File system" /></PlateHeader>
          <PlateBody className="p-0">
            <ul className="text-[12px]">
              {[
                { p: "/", size: "412 GB", used: 47 },
                { p: "/var/lib/sequoia", size: "8.2 GB", used: 78 },
                { p: "/tmp", size: "1.0 GB", used: 12 },
                { p: "/home", size: "200 GB", used: 33 },
              ].map((f) => (
                <li key={f.p} className="border-t border-white/[0.04] px-4 py-2.5 flex items-center gap-3">
                  <FolderTree className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
                  <span className="font-mono text-bone-muted">{f.p}</span>
                  <span className="font-mono text-bone-dim ml-auto">{f.size}</span>
                  <span className="relative h-1.5 w-20 bg-white/[0.06] rounded-sm overflow-hidden">
                    <span
                      className="absolute inset-y-0 left-0"
                      style={{ width: `${f.used}%`, background: f.used > 80 ? "rgb(var(--flame))" : f.used > 60 ? "rgb(var(--ember))" : "rgb(var(--mint))" }}
                    />
                  </span>
                  <span className="font-mono text-[10.5px] text-bone-dim w-8 text-right">{f.used}%</span>
                </li>
              ))}
            </ul>
          </PlateBody>
        </Plate>

        <Plate className="col-span-4">
          <PlateHeader><PlateTitle label="Plugins" subtle="2 active" /></PlateHeader>
          <PlateBody className="space-y-2">
            {[
              { name: "log-rotator",      ver: "0.3.1", status: "ok" as const,   note: "fuel 4% avg" },
              { name: "fail2ban-bridge",  ver: "1.1.0", status: "ok" as const,   note: "blocked 42" },
              { name: "perf-trace",       ver: "0.2.0", status: "warn" as const, note: "OOM 2× today" },
            ].map((p) => (
              <div key={p.name} className="flex items-center gap-3 p-2 rounded-sm bg-ink-50/40 border border-white/[0.06]">
                <span className="w-7 h-7 rounded-sm grid place-items-center bg-ink-100 border border-white/[0.08]">
                  <GitBranch className="w-3.5 h-3.5 text-bone-muted" strokeWidth={1.6} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] text-bone truncate">{p.name}</div>
                  <div className="text-[10.5px] font-mono text-bone-dim">v{p.ver} · {p.note}</div>
                </div>
                <SignalDot state={p.status === "ok" ? "ok" : "warn"} pulse />
              </div>
            ))}
            <Button size="sm" variant="outline" className="w-full mt-1">Install plugin</Button>
          </PlateBody>
        </Plate>

        <Plate className="col-span-4">
          <PlateHeader><PlateTitle label="Identity & trust" /></PlateHeader>
          <PlateBody className="space-y-3 text-[12px]">
            <Row label="Identity">
              <span className="font-mono text-bone-muted">ed25519:7DqG…AfXq</span>
            </Row>
            <Row label="Issued by">
              <span className="font-mono text-bone-muted">tenant-CA · kid 4e</span>
            </Row>
            <Row label="Cert valid">
              <span className="font-mono text-bone-muted">until 2026-12-01</span>
            </Row>
            <Row label="JWT rotation">
              <Badge size="xs" tone="mint">fresh · 47m</Badge>
            </Row>
            <Row label="Attestation">
              <span className="inline-flex items-center gap-1 text-mint"><ShieldCheck className="w-3 h-3" />verified TPM</span>
            </Row>
          </PlateBody>
        </Plate>
      </div>
    </div>
  );
}

function MetricPlate({ label, value, unit, spark, tone }: {
  label: string; value: string; unit: string; spark: number[];
  tone: "ember" | "mint" | "flame" | "steel";
}) {
  return (
    <Plate className="scan-overlay">
      <PlateBody>
        <Stat label={label} value={value} unit={unit} />
        <Sparkline className="mt-3" data={spark} tone={tone} fill height={48} />
      </PlateBody>
    </Plate>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="eyebrow">{label}</span>
      <span>{children}</span>
    </div>
  );
}
