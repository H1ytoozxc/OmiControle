"use client";

import * as React from "react";
import { Bot, Cpu, Workflow, ShieldAlert, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export function ActivityFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-10 h-10 rounded-full bg-ink-100 border border-white/[0.08] grid place-items-center mb-3">
        <Bell className="w-4 h-4 text-bone-dim" strokeWidth={1.4} />
      </div>
      <p className="text-[13px] text-bone mb-1">No activity yet</p>
      <p className="text-[12px] text-bone-muted max-w-[280px] leading-relaxed">
        Events from your devices, workflows, and agents will stream here in real time.
      </p>
    </div>
  );
}
