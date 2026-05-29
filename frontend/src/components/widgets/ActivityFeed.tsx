"use client";

import * as React from "react";
import { Bot, Cpu, Workflow, ShieldAlert, Bell } from "lucide-react";
import { cn, fmtAgo } from "@/lib/utils";
import { Badge } from "@/components/primitives";

interface FeedItem {
  id: string;
  at_ms: number;
  kind: "device" | "agent" | "workflow" | "alert" | "notify";
  tone: "ok" | "warn" | "crit" | "info";
  title: string;
  meta?: string;
}

const ICONS = { device: Cpu, agent: Bot, workflow: Workflow, alert: ShieldAlert, notify: Bell };
const TONE_TO_BADGE: Record<FeedItem["tone"], "mint" | "ember" | "flame" | "steel"> = {
  ok: "mint", warn: "ember", crit: "flame", info: "steel",
};

const SAMPLE: FeedItem[] = [
  { id: "1", at_ms: Date.now() - 12 * 1000,  kind: "device",   tone: "ok",   title: "edge-fra-37 connected",      meta: "linux · v0.9.2" },
  { id: "2", at_ms: Date.now() - 47 * 1000,  kind: "workflow", tone: "ok",   title: "Workflow #3018 completed",   meta: "rotate-secrets · 12 steps" },
  { id: "3", at_ms: Date.now() - 92 * 1000,  kind: "agent",    tone: "info", title: "Triage agent started",        meta: "claude-opus-4-7 · 2.3k tokens" },
  { id: "4", at_ms: Date.now() - 173 * 1000, kind: "alert",    tone: "warn", title: "CPU > 85% on db-prod-01",     meta: "5m window · sustained" },
  { id: "5", at_ms: Date.now() - 240 * 1000, kind: "device",   tone: "crit", title: "edge-sgp-12 unreachable",     meta: "lost heartbeat" },
  { id: "6", at_ms: Date.now() - 311 * 1000, kind: "notify",   tone: "info", title: "Daily digest delivered",      meta: "12 recipients" },
];

export function ActivityFeed() {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { const id = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(id); }, []);

  return (
    <ul className="flex flex-col">
      {SAMPLE.map((item, i) => {
        const Icon = ICONS[item.kind];
        return (
          <li
            key={item.id}
            className={cn(
              "group relative flex items-start gap-3 py-2.5 px-1 fade-up",
              "border-b last:border-b-0 border-white/[0.04]"
            )}
            style={{ ["--d" as never]: `${i * 50}ms` }}
          >
            {/* lane line */}
            <span aria-hidden className="absolute left-[14px] top-0 bottom-0 w-px bg-white/[0.04] group-first:top-3 group-last:bottom-3" />
            {/* icon node */}
            <span className="relative z-[1] w-7 h-7 grid place-items-center rounded-full bg-ink-100 border border-white/[0.08] shrink-0">
              <Icon className="w-3.5 h-3.5 text-bone-muted" strokeWidth={1.6} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-[12.5px] text-bone truncate">{item.title}</span>
                <Badge tone={TONE_TO_BADGE[item.tone]} size="xs">{item.kind}</Badge>
              </div>
              {item.meta && (
                <div className="text-[10.5px] font-mono text-bone-dim truncate">{item.meta}</div>
              )}
            </div>
            <span className="text-[10.5px] font-mono text-bone-dim tabular-nums whitespace-nowrap mt-0.5">
              {fmtAgo(now - item.at_ms)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
