"use client";

import * as React from "react";

/**
 * AmbientPulse — a slow, decorative wave painted as SVG.
 * Used on the dashboard hero plate as ambient "system breath". Pure CSS
 * animation, no JS frame loop, no canvas — keeps the dashboard 60fps even
 * on integrated GPUs.
 */
export function AmbientPulse({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 200"
      preserveAspectRatio="none"
      className={className}
    >
      <defs>
        <linearGradient id="ap-grad" x1="0" x2="1">
          <stop offset="0%"  stopColor="rgb(var(--ember))" stopOpacity="0" />
          <stop offset="50%" stopColor="rgb(var(--ember))" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rgb(var(--ember))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d="M 0 100 C 200 60, 280 140, 400 100 S 600 60, 800 100"
          fill="none"
          stroke="url(#ap-grad)"
          strokeWidth={1}
          style={{
            transformOrigin: "center",
            animation: `wave-${i} ${8 + i * 2}s ease-in-out infinite`,
            opacity: 0.55 - i * 0.18,
          }}
        />
      ))}
      <style>{`
        @keyframes wave-0 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes wave-1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(10px)} }
        @keyframes wave-2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      `}</style>
    </svg>
  );
}
