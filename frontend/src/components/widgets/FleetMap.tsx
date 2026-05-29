"use client";

import * as React from "react";

/**
 * FleetMap — a stylized, dimensionless world plot.
 *
 * Renders devices as dots positioned on an Equirectangular-projected canvas.
 * The "map" is an arrangement of horizontal latitude lines (no continent
 * artwork) — keeps the dashboard crisp at any resolution and avoids the
 * tropes of leaflet/mapbox dashboards.
 */

type Dot = { lat: number; lng: number; tone: "ok" | "warn" | "crit" };

const FLEET: Dot[] = [
  { lat: 37, lng: -122, tone: "ok" }, { lat: 40, lng: -74,  tone: "ok" },
  { lat: 51, lng: -0.1, tone: "ok" }, { lat: 48, lng: 2,    tone: "warn" },
  { lat: 52, lng: 13,   tone: "ok" }, { lat: 55, lng: 37,   tone: "ok" },
  { lat: 35, lng: 139,  tone: "warn" }, { lat: 22, lng: 114, tone: "crit" },
  { lat: 1,  lng: 103,  tone: "ok" }, { lat: -33, lng: 151, tone: "ok" },
  { lat: -23, lng: -46, tone: "ok" }, { lat: 19, lng: -99,  tone: "ok" },
];

export function FleetMap() {
  const W = 800, H = 320;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <defs>
        <radialGradient id="fm-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="rgb(var(--ember))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="rgb(var(--ember))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* latitude rails */}
      {Array.from({ length: 9 }).map((_, i) => (
        <line
          key={i}
          x1="0"
          x2={W}
          y1={(H / 9) * (i + 0.5)}
          y2={(H / 9) * (i + 0.5)}
          stroke="rgb(var(--hairline))"
          strokeOpacity={i === 4 ? 0.16 : 0.06}
          strokeDasharray={i === 4 ? "" : "1 7"}
        />
      ))}
      {/* equator label */}
      <text x="6" y={H / 2 - 4} fontFamily="var(--font-mono)" fontSize="9" fill="rgb(var(--bone-dim))" letterSpacing="0.18em">
        EQUATOR · 0.00°
      </text>

      {/* dots */}
      {FLEET.map((d, i) => {
        const x = ((d.lng + 180) / 360) * W;
        const y = ((90 - d.lat) / 180) * H;
        const color =
          d.tone === "ok" ? "rgb(var(--mint))" :
          d.tone === "warn" ? "rgb(var(--ember))" : "rgb(var(--flame))";
        return (
          <g key={i}>
            {d.tone !== "ok" && (
              <circle cx={x} cy={y} r="14" fill={d.tone === "warn" ? "url(#fm-glow)" : color} opacity="0.18" />
            )}
            <circle cx={x} cy={y} r="2" fill={color}>
              <animate attributeName="r" values="2;3;2" dur={d.tone === "ok" ? "3s" : "1.4s"} repeatCount="indefinite" />
            </circle>
            <circle cx={x} cy={y} r="6" fill="none" stroke={color} strokeOpacity="0.4">
              <animate attributeName="r" values="2;10" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.5;0" dur="2.4s" repeatCount="indefinite" />
            </circle>
          </g>
        );
      })}

      {/* trace lines (animated dashed arcs between two pairs) */}
      <path d={`M ${(W * 60) / 360 + W / 2} ${(H * 90) / 180} Q ${W / 2} 30 ${(W * (114 + 180)) / 360} ${(H * (90 - 22)) / 180}`}
            stroke="rgb(var(--ember))" strokeOpacity="0.5" fill="none" strokeDasharray="3 5">
        <animate attributeName="stroke-dashoffset" values="0;-32" dur="3s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}
