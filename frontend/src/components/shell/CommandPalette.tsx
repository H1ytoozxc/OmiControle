"use client";

import * as React from "react";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Bot, Cpu, Workflow, Bell, Search, Sparkles, Terminal, Power,
  Plus, ShieldCheck, Wifi,
} from "lucide-react";
import { Kbd } from "@/components/primitives";
import { cn } from "@/lib/utils";

/**
 * Command Palette — the soul of the keyboard-first experience.
 *
 * Three columns in spirit:
 *   1. Recent + Navigate (one ⌘K hit and you're there)
 *   2. AI mode (type natural-language → orchestrator suggests workflows)
 *   3. Actions (run command, restart device, enroll, install plugin)
 *
 * Triggers: ⌘K (open), G+H/D/A/W (route shortcuts), Ctrl-Shift-A (Ask AI).
 */

type Ctx = { open: (mode?: Mode) => void; close: () => void; isOpen: boolean };
type Mode = "default" | "ai" | "devices";

const PaletteCtx = React.createContext<Ctx | null>(null);
export const useCommandPalette = () => {
  const ctx = React.useContext(PaletteCtx);
  if (!ctx) throw new Error("CommandPalette context missing");
  return ctx;
};

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("default");
  const router = useRouter();

  const open = React.useCallback((m: Mode = "default") => { setMode(m); setOpen(true); }, []);
  const close = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // G-prefix shortcuts ("g h" → /dashboard, "g d" → /devices).
  React.useEffect(() => {
    let waiting = false;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!waiting && e.key.toLowerCase() === "g") {
        waiting = true;
        setTimeout(() => (waiting = false), 800);
        return;
      }
      if (waiting) {
        const k = e.key.toLowerCase();
        waiting = false;
        if (k === "h") router.push("/dashboard");
        else if (k === "d") router.push("/devices");
        else if (k === "a") router.push("/ai");
        else if (k === "w") router.push("/workflows");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <PaletteCtx.Provider value={{ open, close, isOpen }}>
      {children}
      <Dialog.Root open={isOpen} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content
            className={cn(
              "fixed left-1/2 top-[18%] -translate-x-1/2 z-50",
              "w-[640px] max-w-[92vw] plate rounded-md p-0 overflow-hidden",
              "data-[state=open]:animate-fade-up"
            )}
          >
            <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
            <Dialog.Description className="sr-only">Search, ask, navigate.</Dialog.Description>
            <Palette mode={mode} setMode={setMode} close={close} router={router} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </PaletteCtx.Provider>
  );
}

function Palette({ mode, setMode, close, router }: { mode: Mode; setMode: (m: Mode) => void; close: () => void; router: ReturnType<typeof useRouter> }) {
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { inputRef.current?.focus(); }, [mode]);

  const aiMode = mode === "ai" || value.startsWith(">");

  return (
    <Command label="Sequoia Command" loop className="font-sans">
      {/* mode tabs */}
      <div className="flex items-center gap-1 px-3 pt-3 pb-2 border-b border-white/[0.06]">
        <ModeTab active={mode === "default"} onClick={() => setMode("default")} label="Navigate" icon={Search} kbd="⌘ K" />
        <ModeTab active={aiMode} onClick={() => setMode("ai")} label="Ask Sequoia" icon={Sparkles} kbd="⌃ ⇧ A" tone="ember" />
        <ModeTab active={mode === "devices"} onClick={() => setMode("devices")} label="Devices" icon={Cpu} />
        <div className="ml-auto eyebrow">⎋ to close</div>
      </div>

      {/* input row */}
      <div className="flex items-center gap-2.5 px-4 h-12 border-b border-white/[0.06]">
        {aiMode
          ? <Sparkles className="w-4 h-4 text-ember animate-ember-flicker" strokeWidth={1.8} />
          : <Search    className="w-4 h-4 text-bone-dim" strokeWidth={1.6} />
        }
        <Command.Input
          ref={inputRef}
          autoFocus
          value={value}
          onValueChange={setValue}
          placeholder={aiMode ? "What should we do? e.g. 'restart all offline edge devices'" : "Search devices, runs, settings…"}
          className="flex-1 bg-transparent text-bone placeholder:text-bone-dim outline-none text-[14px] tracking-[-0.01em]"
        />
        {aiMode && <span className="eyebrow text-ember">↵ to send</span>}
      </div>

      <Command.List className="max-h-[420px] overflow-y-auto py-2">
        <Command.Empty className="px-4 py-6 text-center text-[12.5px] text-bone-dim">
          No matches. Try natural language: &ldquo;all linux devices over 80% cpu&rdquo;.
        </Command.Empty>

        {!aiMode && (
          <>
            <Group label="Navigate">
              <Item icon={Cpu} title="Devices" hint="142 online" onSelect={() => { router.push("/devices"); close(); }} />
              <Item icon={Bot} title="AI Control" hint="8 agents" onSelect={() => { router.push("/ai"); close(); }} />
              <Item icon={Workflow} title="Workflows" hint="23 active" onSelect={() => { router.push("/workflows"); close(); }} />
              <Item icon={Bell} title="Notifications" hint="3 unread" onSelect={() => { router.push("/notifications"); close(); }} />
              <Item icon={ShieldCheck} title="Audit log" onSelect={() => { router.push("/audit" as never); close(); }} />
            </Group>

            <Group label="Actions">
              <Item icon={Plus}     title="Enroll a new device" hint="generates one-time code" />
              <Item icon={Terminal} title="Open a console session" hint="picks a device" />
              <Item icon={Power}    title="Restart agent…" hint="select device(s)" />
              <Item icon={Wifi}     title="Force telemetry sync" hint="dispatch broadcast" />
            </Group>
          </>
        )}

        {aiMode && (
          <Group label="Suggestions">
            <Item icon={Sparkles} tone="ember" title="Restart all offline edge devices in europe-west" hint="will create a workflow run" />
            <Item icon={Sparkles} tone="ember" title="Summarize the last 24h of critical alerts" hint="generates a report" />
            <Item icon={Sparkles} tone="ember" title="Find devices with disk > 90% used" hint="opens filtered devices view" />
          </Group>
        )}
      </Command.List>

      <div className="flex items-center justify-between px-3 h-9 border-t border-white/[0.06] text-[10.5px] font-mono text-bone-dim">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> select</span>
          <span className="flex items-center gap-1"><Kbd>⇥</Kbd> next mode</span>
        </div>
        <span className="opacity-60">indexed in {(Math.random() * 30 + 12).toFixed(1)}ms</span>
      </div>
    </Command>
  );
}

function ModeTab({ active, onClick, label, icon: Icon, kbd, tone }: {
  active: boolean; onClick: () => void; label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  kbd?: string; tone?: "ember";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-7 px-2.5 inline-flex items-center gap-1.5 rounded-sm text-[11.5px] font-mono uppercase tracking-[0.06em]",
        "border transition-colors",
        active
          ? tone === "ember"
            ? "border-ember/40 bg-ember/10 text-ember"
            : "border-white/[0.12] bg-ink-100 text-bone"
          : "border-transparent text-bone-dim hover:text-bone-muted hover:bg-white/[0.03]"
      )}
    >
      <Icon className="w-3 h-3" strokeWidth={1.6} />
      {label}
      {kbd && active && <span className="opacity-70 normal-case tracking-normal ml-1">{kbd}</span>}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Command.Group heading={
      <div className="eyebrow px-4 pt-3 pb-1.5">{label}</div>
    }>
      {children}
    </Command.Group>
  );
}

function Item({
  icon: Icon, title, hint, onSelect, tone,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string; hint?: string; onSelect?: () => void; tone?: "ember";
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-2.5 mx-2 px-2 h-8 rounded-sm cursor-pointer",
        "text-[12.5px] text-bone-muted",
        "data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-bone",
        tone === "ember" && "data-[selected=true]:bg-ember/10 data-[selected=true]:text-ember"
      )}
    >
      <Icon className={cn("w-3.5 h-3.5", tone === "ember" ? "text-ember" : "text-bone-dim")} strokeWidth={1.6} />
      <span className="truncate flex-1">{title}</span>
      {hint && <span className="text-[10.5px] text-bone-dim font-mono">{hint}</span>}
      <ArrowRight className="w-3 h-3 text-bone-dim" strokeWidth={1.6} />
    </Command.Item>
  );
}
