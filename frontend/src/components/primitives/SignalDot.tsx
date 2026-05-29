import { cn } from "@/lib/utils";

const colors = {
  ok:       "bg-mint  shadow-[0_0_10px_rgb(var(--mint)/0.6)]",
  warn:     "bg-ember shadow-[0_0_10px_rgb(var(--ember)/0.6)]",
  crit:     "bg-flame shadow-[0_0_10px_rgb(var(--flame)/0.6)]",
  offline:  "bg-bone-dim",
} as const;

/** Tiny 6px status pip used in lists. */
export function SignalDot({ state, pulse, className }: { state: keyof typeof colors; pulse?: boolean; className?: string }) {
  return (
    <span className={cn("relative inline-block w-1.5 h-1.5 rounded-full", colors[state], className)}>
      {pulse && state !== "offline" && (
        <span className={cn(
          "absolute inset-[-3px] rounded-full opacity-50 animate-pulse-soft",
          state === "ok" && "bg-mint/30",
          state === "warn" && "bg-ember/30",
          state === "crit" && "bg-flame/30",
        )} />
      )}
    </span>
  );
}
