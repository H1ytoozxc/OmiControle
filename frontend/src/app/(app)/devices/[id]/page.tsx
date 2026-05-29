import * as React from "react";
import { Power, RotateCw, Terminal, ShieldCheck } from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge, SignalDot,
} from "@/components/primitives";

export default async function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-5">
      {/* head */}
      <div className="flex items-end justify-between gap-6 fade-up">
        <div>
          <div className="eyebrow mb-2">/ devices / {id}</div>
          <div className="flex items-center gap-3">
            <h1 className="display-italic text-[44px] leading-none text-bone">{id}</h1>
            <Badge tone="bone" size="sm"><SignalDot state="ok" />UNKNOWN</Badge>
          </div>
          <div className="text-[11.5px] font-mono text-bone-dim mt-2">
            No telemetry received yet
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
                <span className="font-mono text-bone-dim">Not enrolled</span>
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
