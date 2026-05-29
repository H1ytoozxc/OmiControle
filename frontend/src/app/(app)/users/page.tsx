import { Plus } from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge, SignalDot,
} from "@/components/primitives";

export default function UsersPage() {
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-6 fade-up">
        <div>
          <p className="eyebrow mb-2">/ identity</p>
          <h1 className="text-[36px] font-semibold leading-tight text-bone tracking-tight">Identity & access</h1>
          <p className="text-[12.5px] text-bone-muted mt-1">Manage users, roles, and permissions for your organization.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Audit log</Button>
          <Button variant="ember">
            <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />Invite user
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-5">
        <Plate className="col-span-8 fade-up" style={{ ["--d" as never]: "80ms" }}>
          <PlateHeader>
            <PlateTitle label="Users" subtle="1 member" />
          </PlateHeader>
          <PlateBody>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-[13px] text-bone-muted mb-4">
                Invite teammates to collaborate on your fleet.
              </p>
              <Button variant="ember" size="md">
                <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />Invite first member
              </Button>
            </div>
          </PlateBody>
        </Plate>

        <div className="col-span-4 flex flex-col gap-5 fade-up" style={{ ["--d" as never]: "160ms" }}>
          <Plate>
            <PlateHeader><PlateTitle label="Roles" /></PlateHeader>
            <PlateBody className="space-y-2.5">
              {[
                { name: "Owner",    hint: "Full access including billing",  tone: "ember" as const },
                { name: "Admin",    hint: "Config + workflows",             tone: "steel" as const },
                { name: "Operator", hint: "Devices + runs",                 tone: "bone"  as const },
                { name: "Auditor",  hint: "Read-only + audit log",          tone: "bone"  as const },
              ].map((r) => (
                <div key={r.name} className="flex items-center gap-3 p-2.5 rounded-sm border border-white/[0.06] bg-ink-50/40">
                  <div className="flex-1">
                    <p className="text-[12.5px] text-bone">{r.name}</p>
                    <p className="text-[10.5px] font-mono text-bone-dim">{r.hint}</p>
                  </div>
                  <Badge size="xs" tone={r.tone}>{r.name.toLowerCase()}</Badge>
                </div>
              ))}
            </PlateBody>
          </Plate>

          <Plate>
            <PlateHeader><PlateTitle label="Active sessions" live ts="LIVE" /></PlateHeader>
            <PlateBody>
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-2 text-bone-muted">
                  <SignalDot state="ok" pulse />
                  Current session
                </span>
                <Badge size="xs" tone="mint">active</Badge>
              </div>
            </PlateBody>
          </Plate>
        </div>
      </div>
    </div>
  );
}
