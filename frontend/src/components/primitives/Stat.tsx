import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Stat — the largest type a dashboard uses.
 *
 * Pair a small label, a big tabular number, and an optional delta. The number
 * is a serif italic to break the cold sans-monotony — distinctive marker of
 * Sequoia OS.
 */
export function Stat({
  label,
  value,
  unit,
  delta,
  trend = "flat",
  hint,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  delta?: React.ReactNode;
  trend?: "up" | "down" | "flat";
  hint?: React.ReactNode;
  className?: string;
}) {
  const trendColor =
    trend === "up" ? "text-mint" : trend === "down" ? "text-flame" : "text-bone-dim";
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="eyebrow">{label}</div>
      <div className="flex items-baseline gap-2.5">
        <span className="display-italic text-[44px] leading-none text-bone">{value}</span>
        {unit && (
          <span className="font-mono text-[12px] text-bone-muted tracking-wider uppercase">{unit}</span>
        )}
      </div>
      {(delta || hint) && (
        <div className="flex items-center gap-2 text-[11px] font-mono">
          {delta && (
            <span className={cn("inline-flex items-center gap-1 tabular-nums", trendColor)}>
              {trend === "up" && "▲"}
              {trend === "down" && "▼"}
              {trend === "flat" && "—"}
              {delta}
            </span>
          )}
          {hint && <span className="text-bone-dim">{hint}</span>}
        </div>
      )}
    </div>
  );
}
