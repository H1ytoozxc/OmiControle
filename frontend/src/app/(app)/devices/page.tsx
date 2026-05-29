"use client";

import * as React from "react";
import Link from "next/link";
import { Filter, Search, Plus, Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge, Modal, SignalDot,
} from "@/components/primitives";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api/client";

interface Device {
  id: string;
  tenant_id: string;
  name: string;
  platform: string;
  agent_version: string;
  status: string;
  enrolled_at?: string;
  last_seen_at?: string;
}

interface DeviceListResp {
  items: Device[];
  next_cursor?: string;
}

type StatusFilter = "all" | "online" | "offline" | "warn";

function statusTone(status: string): "mint" | "ember" | "flame" | "bone" {
  switch (status.toLowerCase()) {
    case "online": return "mint";
    case "warn":   return "ember";
    case "error":
    case "crit":   return "flame";
    default:       return "bone";
  }
}

function statusState(status: string): "ok" | "warn" | "crit" | "offline" {
  switch (status.toLowerCase()) {
    case "online": return "ok";
    case "warn":   return "warn";
    case "error":
    case "crit":   return "crit";
    default:       return "offline";
  }
}

export default function DevicesPage() {
  const t = useT().devices;
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [enrollOpen, setEnrollOpen] = React.useState(false);
  const [enrollCode, setEnrollCode] = React.useState<string | null>(null);
  const [enrollExpiry, setEnrollExpiry] = React.useState<string | null>(null);
  const [enrolling, setEnrolling] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const devicesQuery = useQuery<DeviceListResp>({
    queryKey: ["devices", statusFilter],
    queryFn: () => api<DeviceListResp>(
      `/v1/devices${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`
    ),
  });

  const devices = (devicesQuery.data?.items ?? []).filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.platform.toLowerCase().includes(q) || d.id.includes(q);
  });

  async function startEnroll() {
    setEnrolling(true);
    try {
      const resp = await api<{ code: string; expires_at?: string }>(
        "/v1/devices/enrollments",
        { method: "POST", body: {} }
      );
      setEnrollCode(resp.code);
      setEnrollExpiry(resp.expires_at ?? null);
    } catch {
      toast.error("Could not generate enrollment code — is the backend running?");
      setEnrollOpen(false);
    } finally {
      setEnrolling(false);
    }
  }

  function openEnroll() {
    setEnrollCode(null);
    setEnrollExpiry(null);
    setCopied(false);
    setEnrollOpen(true);
    startEnroll();
  }

  function copyCode() {
    if (!enrollCode) return;
    navigator.clipboard.writeText(enrollCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Enrollment code copied");
  }

  const statusFilters: { value: StatusFilter; label: string; tone: "mint" | "ember" | "flame" | "bone" }[] = [
    { value: "all",     label: "all",     tone: "bone" },
    { value: "online",  label: "online",  tone: "mint" },
    { value: "warn",    label: "warn",    tone: "ember" },
    { value: "offline", label: "offline", tone: "bone" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4 fade-up">
        <div>
          <p className="eyebrow mb-2">/ devices</p>
          <h1 className="text-[36px] font-semibold leading-tight text-bone tracking-tight">{t.title}</h1>
          <p className="text-[12.5px] text-bone-muted mt-1">{t.eyebrow}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-[260px] flex items-center gap-2 px-2.5 bg-ink-100/50 border border-white/[0.06] rounded-sm">
            <Search className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="flex-1 bg-transparent outline-none text-[12.5px] text-bone placeholder:text-bone-dim"
            />
          </div>
          <Button variant="outline" size="md" onClick={() => toast.info("Filters — coming soon")}>
            <Filter className="w-3.5 h-3.5" strokeWidth={1.6} />Filter
          </Button>
          <Button variant="ember" size="md" onClick={openEnroll}>
            <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />{t.enroll}
          </Button>
        </div>
      </header>

      <Plate className="fade-up" style={{ ["--d" as never]: "80ms" }}>
        <PlateHeader>
          <PlateTitle label={t.title} subtle={devicesQuery.isLoading ? "…" : String(devices.length)} />
          <div className="flex items-center gap-2">
            {statusFilters.map((f) => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}>
                <Badge
                  size="xs"
                  tone={f.tone}
                  className={statusFilter === f.value ? "ring-1 ring-white/20" : "opacity-60 hover:opacity-100"}
                >
                  {f.label}
                </Badge>
              </button>
            ))}
          </div>
        </PlateHeader>
        <PlateBody>
          {devicesQuery.isLoading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-bone-muted text-[13px]">
              <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.6} />
              Loading devices…
            </div>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-md bg-ink-100 border border-white/[0.08] grid place-items-center mb-4">
                <Plus className="w-5 h-5 text-bone-dim" strokeWidth={1.4} />
              </div>
              <p className="text-[14px] text-bone mb-1">{t.empty}</p>
              <p className="text-[12.5px] text-bone-muted max-w-[320px] leading-relaxed mb-5">{t.emptyNote}</p>
              <div className="flex gap-2">
                <Button variant="ember" size="md" onClick={openEnroll}>
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />{t.enroll}
                </Button>
                <Button variant="outline" size="md" asChild>
                  <Link href="#">Docs</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {devices.map((d) => (
                <Link
                  key={d.id}
                  href={`/devices/${d.id}`}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0 hover:bg-white/[0.02] transition-colors -mx-4 px-4 rounded-sm"
                >
                  <SignalDot state={statusState(d.status)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-bone truncate">{d.name || d.id}</p>
                    <p className="text-[11px] font-mono text-bone-dim mt-0.5 truncate">
                      {d.platform} · v{d.agent_version}
                      {d.last_seen_at && ` · ${new Date(d.last_seen_at).toLocaleString()}`}
                    </p>
                  </div>
                  <Badge size="xs" tone={statusTone(d.status)}>{d.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </PlateBody>
      </Plate>

      {/* Enroll modal */}
      <Modal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        title="Enroll a device"
        description="Run the agent installer on the device and enter this code."
      >
        {enrolling ? (
          <div className="flex items-center justify-center py-8 gap-3 text-bone-muted text-[13px]">
            <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.6} />
            Generating code…
          </div>
        ) : enrollCode ? (
          <div className="space-y-5">
            <p className="text-[12.5px] text-bone-muted">
              Run the agent installer on the target device, then enter this enrollment code.
              Valid for <span className="text-bone font-mono">10 minutes</span>.
            </p>

            <div className="flex items-center gap-3 p-4 rounded-sm bg-ink border border-white/[0.10]">
              <span className="flex-1 font-mono text-[22px] tracking-[0.2em] text-bone text-center select-all">
                {enrollCode}
              </span>
              <button
                onClick={copyCode}
                className="shrink-0 text-bone-dim hover:text-bone transition-colors"
                aria-label="Copy code"
              >
                {copied ? <Check className="w-5 h-5 text-mint" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            {enrollExpiry && (
              <p className="text-[11px] font-mono text-bone-dim text-center">
                Expires: {new Date(enrollExpiry).toLocaleTimeString()}
              </p>
            )}

            <div className="rounded-sm bg-ink-100 border border-white/[0.06] p-3 text-[12px] font-mono text-bone-muted space-y-1">
              <p className="text-bone-dim text-[10.5px] mb-2">On the device:</p>
              <p>curl -fsSL https://get.sequoia.io/agent | sudo bash</p>
              <p>sequoia-agent enroll <span className="text-ember">{enrollCode}</span></p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={openEnroll}>
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.6} />New code
              </Button>
              <Button variant="ember" size="sm" onClick={() => setEnrollOpen(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-[13px] text-bone-muted">
            Failed to generate code.{" "}
            <button onClick={startEnroll} className="ml-1 text-ember hover:underline">Try again</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
