"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Sparkline — featherweight inline trend line. Zero dependencies; uses raw SVG.
 *
 * Design rules:
 *   - 1px stroke (no anti-alias smear)
 *   - last point gets a 2px dot
 *   - optional baseline at min
 *   - optional area gradient fill (for "hero" stats)
 */
export function Sparkline({
  data,
  height = 36,
  className,
  tone = "ember",
  fill = false,
}: {
  data: number[];
  height?: number;
  className?: string;
  tone?: "ember" | "mint" | "flame" | "steel" | "bone";
  fill?: boolean;
}) {
  const { d, dx, dy, last } = React.useMemo(() => build(data, height), [data, height]);
  const id = React.useId();
  const stroke = `rgb(var(--${tone}))`;

  return (
    <svg
      className={cn("w-full block", className)}
      viewBox={`0 0 ${dx} ${dy}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="trend"
    >
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={`${d} L ${dx} ${dy} L 0 ${dy} Z`} fill={`url(#sp-${id})`} />}
      <path d={d} stroke={stroke} strokeWidth="1.25" fill="none" vectorEffect="non-scaling-stroke" />
      <circle cx={last.x} cy={last.y} r="1.8" fill={stroke} />
    </svg>
  );
}

function build(data: number[], height: number) {
  if (!data.length) return { d: "", dx: 100, dy: height, last: { x: 0, y: height } };
  const dx = 100;
  const dy = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = dx / (data.length - 1 || 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = dy - ((v - min) / span) * dy * 0.92 - dy * 0.04;
    return { x, y };
  });
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  return { d, dx, dy, last: pts[pts.length - 1] };
}
