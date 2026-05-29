import { Bell, ShieldAlert, Mail, MessageSquare, Webhook, CheckCircle2 } from "lucide-react";
import {
  Plate, PlateHeader, PlateTitle, PlateBody,
  Button, Badge, SignalDot,
} from "@/components/primitives";

const ALERTS = [
  { id: 1, sev: "crit", title: "edge-sgp-12 unreachable for 14 minutes",      meta: "host · network · region ap-southeast-1", at: "14:08 UTC" },
  { id: 2, sev: "warn", title: "Workflow ai-triage-fanout — 7 failures / 24h", meta: "step ‘route → Responder’ · 4 reclaims", at: "13:51 UTC" },
  { id: 3, sev: "info", title: "Daily digest delivered",                       meta: "12 recipients · 0 bounces", at: "13:00 UTC" },
  { id: 4, sev: "warn", title: "Plugin perf-trace · OOM 2× today",             meta: "fuel limit 10.0M reached", at: "12:24 UTC" },
];

export default function NotificationsPage() {
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4 fade-up">
        <div>
          <div className="eyebrow mb-2">/ notifications</div>
          <h1 className="display-italic text-[44px] leading-none text-bone">Inbox</h1>
          <p className="text-[12.5px] font-mono text-bone-dim mt-2">3 unread · 142 delivered · 24 h · 0 bounces</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Channels</Button>
          <Button variant="outline">Templates</Button>
          <Button variant="ember">Mark all read</Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8 space-y-3">
          {ALERTS.map((a, i) => (
            <Plate
              key={a.id}
              className="fade-up scan-overlay"
              style={{ ["--d" as never]: `${i * 60 + 80}ms` }}
            >
              <PlateBody className="flex items-start gap-4">
                <span className={
                  a.sev === "crit" ? "w-10 h-10 rounded-md bg-flame/15 border border-flame/30 text-flame grid place-items-center" :
                  a.sev === "warn" ? "w-10 h-10 rounded-md bg-ember/15 border border-ember/30 text-ember grid place-items-center" :
                                      "w-10 h-10 rounded-md bg-steel/10 border border-steel/30 text-steel grid place-items-center"
                }>
                  {a.sev === "crit" ? <ShieldAlert className="w-4 h-4" strokeWidth={1.7} /> :
                    a.sev === "warn" ? <Bell className="w-4 h-4" strokeWidth={1.7} /> :
                                       <CheckCircle2 className="w-4 h-4" strokeWidth={1.7} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge size="xs" tone={a.sev === "crit" ? "flame" : a.sev === "warn" ? "ember" : "steel"}>{a.sev}</Badge>
                    <span className="text-[13px] text-bone">{a.title}</span>
                  </div>
                  <div className="text-[10.5px] font-mono text-bone-dim">{a.meta}</div>
                </div>
                <div className="text-[10.5px] font-mono text-bone-dim text-right">
                  <div>{a.at}</div>
                  <div className="mt-1 flex gap-1 justify-end">
                    <Button size="xs" variant="ghost">Snooze</Button>
                    <Button size="xs" variant="outline">Acknowledge</Button>
                  </div>
                </div>
              </PlateBody>
            </Plate>
          ))}
        </div>

        <div className="col-span-4 space-y-5">
          <Plate>
            <PlateHeader><PlateTitle label="Channels" /></PlateHeader>
            <PlateBody className="space-y-2">
              {[
                { name: "Slack · #ops",     icon: MessageSquare, status: "ok" as const, hint: "webhook v2 · 12 ms" },
                { name: "PagerDuty · prod", icon: Bell,          status: "ok" as const, hint: "service key · valid" },
                { name: "Email · digest",   icon: Mail,          status: "ok" as const, hint: "smtp · 1.4 s" },
                { name: "Webhook · ingest", icon: Webhook,       status: "warn" as const, hint: "429 · backoff 30s" },
              ].map((c, i) => {
                const Icon = c.icon;
                return (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-sm border border-white/[0.06] bg-ink-50/40">
                    <span className="w-6 h-6 rounded-sm grid place-items-center bg-ink-100 border border-white/[0.08]">
                      <Icon className="w-3 h-3 text-bone-muted" strokeWidth={1.6} />
                    </span>
                    <span className="flex-1 text-[12px] text-bone truncate">{c.name}</span>
                    <SignalDot state={c.status} pulse />
                    <span className="text-[10px] font-mono text-bone-dim hidden xl:inline">{c.hint}</span>
                  </div>
                );
              })}
            </PlateBody>
          </Plate>

          <Plate>
            <PlateHeader><PlateTitle label="Delivery · 24h" /></PlateHeader>
            <PlateBody>
              <div className="grid grid-cols-3 gap-3 text-center font-mono">
                <Stat label="Sent"     value="142" tone="bone" />
                <Stat label="Bounced"  value="0"   tone="mint" />
                <Stat label="Avg lat"  value="1.4s" tone="ember" />
              </div>
            </PlateBody>
          </Plate>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "bone" | "mint" | "ember" }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div className={`display-italic text-[24px] leading-none ${tone === "mint" ? "text-mint" : tone === "ember" ? "text-ember" : "text-bone"}`}>{value}</div>
    </div>
  );
}
