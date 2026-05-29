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

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard",     label: "Overview",    icon: LayoutGrid },
      { href: "/devices",       label: "Devices",     icon: Cpu },
      { href: "/ai",            label: "AI Control",  icon: Bot },
      { href: "/workflows",     label: "Workflows",   icon: Workflow },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/users",         label: "Identity",      icon: Users },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings",  label: "Settings", icon: SlidersHorizontal },
    ],
  },
];

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
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
        <span className="text-[20px] font-semibold text-bone tracking-tight">Sequoia</span>
        <span className="ml-auto eyebrow">v0.1</span>
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
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* bottom strip — connection status only */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 text-[11px] font-mono text-bone-dim">
          <SignalDot state="ok" />
          <span>Connected</span>
        </div>
      </div>
    </aside>
  );
}
