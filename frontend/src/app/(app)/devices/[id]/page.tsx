"use client";

import * as React from "react";
import { use } from "react";
import { Power, RotateCw, Terminal, ShieldCheck, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge, SignalDot,
} from "@/components/primitives";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

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

export default function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const deviceQuery = useQuery<Device>({
    queryKey: ["device", id],
    queryFn: () => api<Device>(`/v1/devices/${id}`),
    retry: false,
  });

  const device = deviceQuery.data;

  return (
    <div className="space-y-5">
      {/* head */}
      <div className="flex items-end justify-between gap-6 fade-up">
        <div>
          <div className="eyebrow mb-2 flex items-center gap-2">
            <Link href="/devices" className="hover:text-bone transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" strokeWidth={1.6} />/ devices
            </Link>
            <span className="text-bone-dim">/ {id}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="display-italic text-[44px] leading-none text-bone">
              {device?.name || id}
            </h1>
            {deviceQuery.isLoading ? (
              <RefreshCw className="w-4 h-4 text-bone-dim animate-spin" strokeWidth={1.6} />
            ) : device ? (
              <Badge tone={statusTone(device.status)} size="sm">
                <SignalDot state={statusState(device.status)} />
                {device.status.toUpperCase()}
              </Badge>
            ) : (
              <Badge tone="bone" size="sm"><SignalDot state="offline" />UNKNOWN</Badge>
            )}
          </div>
          <div className="text-[11.5px] font-mono text-bone-dim mt-2">
            {device
              ? `${device.platform} · agent v${device.agent_version}${device.last_seen_at ? ` · last seen ${new Date(device.last_seen_at).toLocaleString()}` : ""}`
              : deviceQuery.isError
                ? "Could not load device"
                : "Loading…"
            }
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => toast.info("Coming soon")}>
            <RotateCw className="w-3.5 h-3.5" strokeWidth={1.6} />Restart agent
          </Button>
          <Button variant="outline" onClick={() => toast.info("Coming soon")}>
            <Power className="w-3.5 h-3.5" strokeWidth={1.6} />Reboot host
          </Button>
          <Button variant="ember" onClick={() => toast.info("Coming soon")}>
            <Terminal className="w-3.5 h-3.5" strokeWidth={1.8} />Console
          </Button>
        </div>
      </div>

      {/* metric strip */}
      <div className="grid grid-cols-4 gap-5 fade-up" style={{ ["--d" as never]: "80ms" }}>
        {(["CPU", "Memory", "Network", "Disk"] as const).map((label) => (
          <Plate key={label} className="scan-overlay">
            <PlateBody>
              <div className="eyebrow mb-1">{label}</div>
              <div className="text-[28px] font-semibold text-bone-dim tabular-nums">—</div>
              <div className="mt-3 h-12 flex items-center justify-center text-[11px] font-mono text-bone-dim">
                No data
              </div>
            </PlateBody>
          </Plate>
        ))}
      </div>

      {/* console + info */}
      <div className="grid grid-cols-12 gap-5 fade-up" style={{ ["--d" as never]: "160ms" }}>
        <Plate className="col-span-7" reticle>
          <PlateHeader>
            <PlateTitle label="Live telemetry · console" />
          </PlateHeader>
          <PlateBody className="bg-ink-50/60 font-mono text-[12px] leading-relaxed py-3 h-[420px] flex items-center justify-center">
            <span className="text-bone-dim">Waiting for agent to connect…</span>
          </PlateBody>
        </Plate>

        <div className="col-span-5 space-y-5">
          <Plate>
            <PlateHeader><PlateTitle label="Processes" /></PlateHeader>
            <PlateBody className="flex items-center justify-center py-8 text-[12px] font-mono text-bone-dim">
              No process data
            </PlateBody>
          </Plate>

          <Plate>
            <PlateHeader><PlateTitle label="Identity · Trust" /></PlateHeader>
            <PlateBody className="space-y-3">
              <Row label="Status">
                <span className="font-mono text-bone-dim">
                  {device?.status ?? "—"}
                </span>
              </Row>
              <Row label="Enrolled">
                <span className="font-mono text-bone-dim">
                  {device?.enrolled_at ? new Date(device.enrolled_at).toLocaleDateString() : "—"}
                </span>
              </Row>
              <Row label="Agent">
                <span className="font-mono text-bone-dim">
                  {device?.agent_version ? `v${device.agent_version}` : "—"}
                </span>
              </Row>
              <Row label="Platform">
                <span className="font-mono text-bone-dim">{device?.platform ?? "—"}</span>
              </Row>
              <Row label="Attestation">
                <span className="inline-flex items-center gap-1 text-bone-dim">
                  <ShieldCheck className="w-3 h-3" />pending
                </span>
              </Row>
            </PlateBody>
          </Plate>
        </div>
      </div>
    </div>
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
