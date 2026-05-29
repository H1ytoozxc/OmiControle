"use client";

import { Bell } from "lucide-react";
import { useT } from "@/lib/i18n";

export function ActivityFeed() {
  const t = useT().common;
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-10 h-10 rounded-full bg-ink-100 border border-white/[0.08] grid place-items-center mb-3">
        <Bell className="w-4 h-4 text-bone-dim" strokeWidth={1.4} />
      </div>
      <p className="text-[13px] text-bone mb-1">{t.noActivity}</p>
      <p className="text-[12px] text-bone-muted max-w-[280px] leading-relaxed">{t.noActivityNote}</p>
    </div>
  );
}
