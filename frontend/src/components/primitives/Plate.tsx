"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Plate — the canonical "card" of Sequoia OS.
 *
 * Not a glassmorphism puff. A plate has:
 *   - a hairline edge
 *   - an eyebrow row at the top (label · live-dot · timestamp)
 *   - an optional reticle corner treatment
 *   - flat inset depth, no glow unless interactive
 *
 * Composition is explicit (Header / Body / Footer) so layouts compose
 * predictably and we never end up with the "div soup" that wrecks dashboards.
 */

type PlateProps = React.HTMLAttributes<HTMLDivElement> & {
  reticle?: boolean;
  raised?: boolean;
};

export function Plate({ className, reticle, raised, children, ...rest }: PlateProps) {
  return (
    <div
      data-plate
      className={cn(
        "relative bg-ink-50/60 border border-white/[0.06]",
        "rounded-md overflow-hidden",
        raised && "shadow-plate",
        reticle && "reticle",
        className
      )}
      {...rest}
    >
      {children}
      {reticle && <>
        <span className="reticle-tr" />
        <span className="reticle-br" />
      </>}
    </div>
  );
}

export function PlateHeader({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 h-10 border-b border-white/[0.06]",
        "bg-gradient-to-b from-ink-100/60 to-transparent",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function PlateTitle({
  label,
  subtle,
  live,
  ts,
  className,
}: { label: React.ReactNode; subtle?: React.ReactNode; live?: boolean; ts?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
      <span className="eyebrow whitespace-nowrap">{label}</span>
      {subtle && <span className="text-[11px] text-bone-dim truncate font-mono">{subtle}</span>}
      {live && <span className="live-dot ml-0.5" aria-hidden />}
      {ts && <span className="ml-auto text-[10.5px] tracking-wider text-bone-dim font-mono uppercase">{ts}</span>}
    </div>
  );
}

export function PlateBody({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...rest}>{children}</div>;
}

export function PlateFooter({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 h-9 border-t border-white/[0.06]",
        "bg-ink-100/40 text-[11px] text-bone-dim font-mono",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
