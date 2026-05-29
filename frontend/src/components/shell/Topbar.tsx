"use client";

import * as React from "react";
import { Search, Sparkles, Bell, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button, Kbd } from "@/components/primitives";
import { useCommandPalette } from "./CommandPalette";

/**
 * Topbar — instrument-panel breadcrumb + global controls.
 *
 * Includes the always-visible time-stamped breadcrumb, an "Ask Sequoia"
 * AI palette trigger (natural-language commands), search, and the user pill.
 *
 * Height: 56px. Sticky. Hairline-only bottom edge.
 */
export function Topbar() {
  const path = usePathname();
  const segments = path.split("/").filter(Boolean);
  const cmd = useCommandPalette();
  const [now, setNow] = React.useState<string>("");

  React.useEffect(() => {
    const tick = () => setNow(new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="sticky top-0 z-20 h-14 bg-ink/70 backdrop-blur-md border-b border-white/[0.06]"
    >
      <div className="h-full px-6 flex items-center gap-4">
        {/* breadcrumb */}
        <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-[12px] text-bone-muted font-mono min-w-0">
          <span className="text-bone-dim">/</span>
          {segments.map((seg, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-bone-dim" />}
              <span className={i === segments.length - 1 ? "text-bone" : "text-bone-muted"}>{seg}</span>
            </React.Fragment>
          ))}
        </nav>

        {/* time chip */}
        <div className="ml-auto eyebrow text-[10px] tabular-nums">{now}</div>

        {/* search */}
        <button
          onClick={() => cmd.open()}
          className="group h-8 w-[280px] px-2.5 flex items-center gap-2 bg-ink-100/50 hover:bg-ink-100 border border-white/[0.06] rounded-sm text-left transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-bone-dim group-hover:text-bone-muted" strokeWidth={1.6} />
          <span className="text-[12.5px] text-bone-dim">Search · ask · command…</span>
          <span className="ml-auto flex items-center gap-0.5"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
        </button>

        {/* AI quick-ask */}
        <Button size="sm" variant="ember" onClick={() => cmd.open("ai")}>
          <Sparkles className="w-3.5 h-3.5" strokeWidth={1.8} />
          Ask Sequoia
        </Button>

        {/* notifications */}
        <Button size="icon" variant="ghost" aria-label="notifications">
          <Bell className="w-3.5 h-3.5" strokeWidth={1.6} />
        </Button>

        {/* user */}
        <button className="h-8 flex items-center gap-2 pl-1 pr-2 hover:bg-ink-100 rounded-sm transition-colors">
          <span className="w-6 h-6 rounded-full bg-ink-200 border border-white/[0.10] grid place-items-center text-[10.5px] font-semibold text-bone-muted">U</span>
        </button>
      </div>
    </header>
  );
}
