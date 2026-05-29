"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, Cpu, Bot, Workflow, Bell, Users, SlidersHorizontal,
  Terminal, ShieldCheck, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignalDot } from "@/components/primitives";

/**
 * Sidebar — the navigation rail.
 *
 * Aesthetic notes:
 *   - Fixed 220 px wide, hairline divider, no shadow.
 *   - Top: wordmark ("Sequoia" in italic serif) + tenant chip.
 *   - Middle: nav groups with monospace eyebrows.
 *   - Bottom: system status strip — live region from the realtime store.
 */

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard",     label: "Overview",    icon: LayoutGrid,  kbd: "G H" },
      { href: "/devices",       label: "Devices",     icon: Cpu,         kbd: "G D" },
      { href: "/ai",            label: "AI Control",  icon: Bot,         kbd: "G A" },
      { href: "/workflows",     label: "Workflows",   icon: Workflow,    kbd: "G W" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell,      badge: 3 },
      { href: "/users",         label: "Identity",      icon: Users },
      { href: "/audit",         label: "Audit",         icon: ShieldCheck },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/observability", label: "Observability", icon: Activity },
      { href: "/console",       label: "Console",       icon: Terminal },
      { href: "/settings",      label: "Settings",      icon: SlidersHorizontal },
    ],
  },
];

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: number;
  kbd?: string;
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 w-[220px] z-30",
        "bg-ink-50/85 backdrop-blur-md",
        "border-r border-white/[0.06]",
        "flex flex-col"
      )}
    >
      {/* wordmark */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-2">
        <span className="display-italic text-[26px] leading-none text-bone">Sequoia</span>
        <span className="ml-auto eyebrow">v0.1</span>
      </div>

      {/* tenant chip */}
      <div className="mx-3 mb-4 px-3 py-2 border border-white/[0.08] rounded-md bg-ink-100/50 hover:bg-ink-100 transition-colors cursor-pointer">
        <div className="eyebrow text-[9.5px] mb-0.5">Tenant</div>
        <div className="flex items-center gap-2 text-[13px]">
          <span className="w-1.5 h-1.5 rounded-full bg-ember" />
          <span className="text-bone truncate">Anthropic · Production</span>
        </div>
      </div>

      {/* nav groups */}
      <nav className="flex-1 px-3 pb-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="eyebrow px-2 mb-1.5">{group.label}</div>
            <ul className="flex flex-col gap-px">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href as never}
                      className={cn(
                        "group relative flex items-center gap-2.5 px-2 h-8 rounded-sm",
                        "text-[12.5px] tracking-[-0.01em] text-bone-muted",
                        "hover:bg-white/[0.04] hover:text-bone transition-colors",
                        active && "bg-white/[0.04] text-bone"
                      )}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1.5 bottom-1.5 w-px bg-ember shadow-[0_0_8px_rgb(var(--ember)/0.7)]"
                        />
                      )}
                      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="ml-auto text-[10px] font-mono text-ember tabular-nums">
                          {item.badge}
                        </span>
                      ) : item.kbd ? (
                        <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[9.5px] font-mono text-bone-dim tracking-[0.1em]">
                          {item.kbd}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* system status */}
      <SystemStrip />
    </aside>
  );
}

function SystemStrip() {
  // Wire to realtime store in a real app; mocked here.
  return (
    <div className="px-3 py-3 border-t border-white/[0.06] flex flex-col gap-1.5">
      <Row label="Realtime"  state="ok"   value="WS · 12 ms" />
      <Row label="API"       state="ok"   value="142 ms p99" />
      <Row label="Workers"   state="warn" value="3 reclaim" />
    </div>
  );
}

function Row({ label, state, value }: { label: string; state: "ok" | "warn" | "crit"; value: string }) {
  return (
    <div className="flex items-center justify-between text-[10.5px] font-mono uppercase tracking-[0.08em]">
      <span className="flex items-center gap-1.5 text-bone-dim">
        <SignalDot state={state} pulse />
        {label}
      </span>
      <span className="text-bone-muted normal-case tracking-normal">{value}</span>
    </div>
  );
}
