"use client";

import * as React from "react";
import { Sparkles, ArrowUp, Wand2, Workflow, Cpu, ShieldAlert } from "lucide-react";
import { Plate, PlateHeader, PlateTitle, PlateBody, Button, Badge } from "@/components/primitives";
import { motion } from "motion/react";

/**
 * The AI Copilot panel — sits on the right of the dashboard.
 * Streams suggestion cards based on the current view + recent telemetry.
 *
 * The streaming "typewriter" effect uses scheduled requestAnimationFrame
 * substring updates for crisp 60fps text reveal.
 */

const SUGGESTIONS = [
  { icon: ShieldAlert, tone: "ember", title: "Quarantine 2 unreachable devices",     hint: "edge-sgp-12, edge-tyo-04",     action: "Run workflow" },
  { icon: Workflow,    tone: "steel", title: "Schedule rotate-secrets at 02:00 UTC", hint: "next idle window",             action: "Schedule" },
  { icon: Cpu,         tone: "mint",  title: "Profile db-prod-01 (CPU saturating)",  hint: "perf trace · 60s",             action: "Capture" },
] as const;

export function AIAssistantPanel() {
  const [text, setText] = React.useState("");
  const target =
    "We detected a 3.2× spike in command failures over the last 4 minutes — predominantly on Linux edge devices in Singapore. " +
    "I drafted a rollback to v0.9.1 and prepared a containment workflow. Approve to dispatch.";

  React.useEffect(() => {
    let i = 0;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const elapsed = t - start;
      const idx = Math.min(target.length, Math.floor(elapsed / 14));
      if (idx !== i) { setText(target.slice(0, idx)); i = idx; }
      if (idx < target.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <Plate className="flex flex-col" raised reticle>
      <PlateHeader>
        <PlateTitle label="Copilot" live ts="LIVE · STREAMING" />
        <Badge tone="ember" size="xs"><Sparkles className="w-2.5 h-2.5" />Opus 4.7</Badge>
      </PlateHeader>

      {/* streamed reading */}
      <PlateBody className="space-y-4 grow">
        <div className="flex gap-3">
          <span className="w-7 h-7 shrink-0 rounded-full bg-ember/15 border border-ember/30 grid place-items-center">
            <Wand2 className="w-3.5 h-3.5 text-ember" strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <div className="eyebrow mb-1">Anomaly · 4m window</div>
            <p className="text-[13px] leading-relaxed text-bone">
              {text}
              <span className="inline-block w-[6px] h-[14px] bg-ember align-text-bottom ml-1 animate-pulse-soft" />
            </p>
          </div>
        </div>

        {/* suggestion cards */}
        <div className="space-y-2 pt-1">
          <div className="eyebrow">Suggested actions</div>
          {SUGGESTIONS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-sm border border-white/[0.06] bg-ink-100/40 hover:bg-ink-100 hover:border-white/[0.14] transition-colors"
              >
                <span className="w-6 h-6 rounded-sm grid place-items-center border border-white/[0.08] bg-ink-50">
                  <Icon className="w-3 h-3" strokeWidth={1.6} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-bone truncate">{s.title}</div>
                  <div className="text-[10.5px] font-mono text-bone-dim truncate">{s.hint}</div>
                </div>
                <Button size="xs" variant="outline" className="opacity-70 group-hover:opacity-100">
                  {s.action}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </PlateBody>

      {/* compose */}
      <div className="border-t border-white/[0.06] p-3">
        <form
          className="relative flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); }}
        >
          <textarea
            rows={1}
            placeholder="Ask Sequoia anything · ⏎ to send"
            className="flex-1 resize-none bg-ink-50/60 border border-white/[0.08] focus:border-ember/40 focus:bg-ink-50 rounded-sm px-3 py-2 text-[12.5px] text-bone placeholder:text-bone-dim outline-none"
          />
          <Button size="icon" variant="ember" type="submit" aria-label="send">
            <ArrowUp className="w-3.5 h-3.5" strokeWidth={1.8} />
          </Button>
        </form>
        <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-bone-dim">
          <Badge size="xs" tone="bone">/run</Badge>
          <Badge size="xs" tone="bone">/find</Badge>
          <Badge size="xs" tone="bone">/explain</Badge>
          <span className="ml-auto">context · 142 events · 12 devices</span>
        </div>
      </div>
    </Plate>
  );
}
