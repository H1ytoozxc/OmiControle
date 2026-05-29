"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Sparkles, Bell, ChevronRight, User, SlidersHorizontal, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Kbd } from "@/components/primitives";
import { useCommandPalette } from "./CommandPalette";
import { useLang, useT } from "@/lib/i18n";

export function Topbar() {
  const path = usePathname();
  const segments = path.split("/").filter(Boolean);
  const cmd = useCommandPalette();
  const router = useRouter();
  const [now, setNow] = React.useState<string>("");
  const { lang, toggle } = useLang();
  const t = useT();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const tick = () => setNow(new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Close on outside click
  React.useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  function signOut() {
    setMenuOpen(false);
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-20 h-14 bg-ink/70 backdrop-blur-md border-b border-white/[0.06]">
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

        {/* language toggle */}
        <button
          onClick={toggle}
          className="h-6 px-2 rounded-sm border border-white/[0.08] text-[10px] font-mono text-bone-dim hover:text-bone hover:border-white/[0.20] transition-colors"
          aria-label="Toggle language"
        >
          {lang === "en" ? "RU" : "EN"}
        </button>

        {/* search */}
        <button
          onClick={() => cmd.open()}
          className="group h-8 w-[280px] px-2.5 flex items-center gap-2 bg-ink-100/50 hover:bg-ink-100 border border-white/[0.06] rounded-sm text-left transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-bone-dim group-hover:text-bone-muted" strokeWidth={1.6} />
          <span className="text-[12.5px] text-bone-dim">{t.topbar.search}</span>
          <span className="ml-auto flex items-center gap-0.5"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
        </button>

        {/* AI quick-ask */}
        <Button size="sm" variant="ember" onClick={() => cmd.open("ai")}>
          <Sparkles className="w-3.5 h-3.5" strokeWidth={1.8} />
          {t.topbar.askSequoia}
        </Button>

        {/* notifications */}
        <Button size="icon" variant="ghost" aria-label="notifications">
          <Bell className="w-3.5 h-3.5" strokeWidth={1.6} />
        </Button>

        {/* user dropdown */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`h-8 flex items-center gap-2 pl-1 pr-2 rounded-sm transition-colors ${menuOpen ? "bg-ink-200" : "hover:bg-ink-100"}`}
            aria-label="User menu"
          >
            <span className="w-6 h-6 rounded-full bg-ink-200 border border-white/[0.10] grid place-items-center text-[10.5px] font-semibold text-bone-muted">
              U
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] w-[220px] rounded-md border border-white/[0.10] bg-ink-50/95 backdrop-blur-md shadow-xl z-50 overflow-hidden">
              {/* user info */}
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-ink-200 border border-white/[0.10] grid place-items-center text-[12px] font-semibold text-bone-muted flex-shrink-0">
                    U
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-bone truncate">{t.topbar.guest}</p>
                    <p className="text-[11px] font-mono text-bone-dim truncate">v0.1 · local</p>
                  </div>
                </div>
              </div>

              {/* menu items */}
              <div className="py-1">
                <MenuItem
                  icon={User}
                  label={t.topbar.profile}
                  onClick={() => { setMenuOpen(false); router.push("/settings"); }}
                />
                <MenuItem
                  icon={SlidersHorizontal}
                  label={t.topbar.settings}
                  onClick={() => { setMenuOpen(false); router.push("/settings"); }}
                />
              </div>

              <div className="border-t border-white/[0.06] py-1">
                <MenuItem
                  icon={LogOut}
                  label={t.topbar.signOut}
                  onClick={signOut}
                  danger
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] transition-colors text-left
        ${danger
          ? "text-flame hover:bg-flame/[0.08]"
          : "text-bone-muted hover:bg-white/[0.04] hover:text-bone"
        }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.6} />
      {label}
    </button>
  );
}
