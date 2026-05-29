"use client";

import * as React from "react";
import Link from "next/link";
import { Terminal, Copy, Check, ArrowRight, Monitor } from "lucide-react";
import { Button } from "@/components/primitives";

const INSTALL_COMMANDS: Record<string, string> = {
  linux:   "curl -fsSL https://get.sequoia.io/agent | sudo bash",
  macos:   "brew install sequoia-agent && sudo sequoia-agent start",
  windows: "winget install Sequoia.Agent",
};

export default function OnboardingPage() {
  const [os, setOs] = React.useState<"linux" | "macos" | "windows">("linux");
  const [copied, setCopied] = React.useState(false);
  const [waiting, setWaiting] = React.useState(false);

  function copy() {
    navigator.clipboard.writeText(INSTALL_COMMANDS[os]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function startWaiting() {
    setWaiting(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-6 py-12">
      <div className="w-full max-w-[480px] space-y-8 fade-up">
        {/* header */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <span className="text-[18px] font-semibold text-bone">Sequoia</span>
            <span className="eyebrow mt-0.5">v0.1</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className="w-8 h-8 rounded-full bg-ember/15 border border-ember/40 grid place-items-center text-[13px] font-semibold text-ember">1</span>
            <p className="eyebrow">Connect your first device</p>
          </div>
          <h1 className="text-[28px] font-semibold text-bone tracking-tight leading-tight">
            Install the Sequoia agent
          </h1>
          <p className="text-[13px] text-bone-muted mt-2 leading-relaxed">
            Run this command on the machine you want to monitor. The agent enrolls automatically using your tenant token.
          </p>
        </div>

        {/* os tabs */}
        <div className="space-y-4">
          <div className="flex gap-1 p-1 bg-ink-100 border border-white/[0.06] rounded-md w-fit">
            {(["linux", "macos", "windows"] as const).map((o) => (
              <button
                key={o}
                onClick={() => setOs(o)}
                className={`px-3 h-7 rounded-sm text-[12px] font-mono transition-colors ${
                  os === o
                    ? "bg-ink-200 text-bone border border-white/[0.10]"
                    : "text-bone-dim hover:text-bone-muted"
                }`}
              >
                {o}
              </button>
            ))}
          </div>

          {/* command block */}
          <div className="relative group">
            <div className="flex items-center gap-2 px-4 py-3 bg-ink-100 border border-white/[0.08] rounded-md font-mono text-[13px] text-bone-muted pr-12 overflow-x-auto">
              <Terminal className="w-3.5 h-3.5 text-bone-dim shrink-0" strokeWidth={1.6} />
              <span className="text-bone">{INSTALL_COMMANDS[os]}</span>
            </div>
            <button
              onClick={copy}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-sm grid place-items-center text-bone-dim hover:text-bone transition-colors"
              aria-label="Copy command"
            >
              {copied
                ? <Check className="w-3.5 h-3.5 text-mint" strokeWidth={2} />
                : <Copy className="w-3.5 h-3.5" strokeWidth={1.6} />
              }
            </button>
          </div>
        </div>

        {/* waiting state */}
        {!waiting ? (
          <div className="space-y-3">
            <Button variant="ember" size="lg" className="w-full" onClick={startWaiting}>
              <Monitor className="w-4 h-4" strokeWidth={1.6} />
              I ran the command — waiting for device
            </Button>
            <Link
              href="/dashboard"
              className="block text-center text-[12px] font-mono text-bone-dim hover:text-bone-muted transition-colors"
            >
              Skip for now, I&apos;ll do this later
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-ink-100 border border-white/[0.08] rounded-md">
              <span className="w-2 h-2 rounded-full bg-ember animate-pulse shrink-0" />
              <div>
                <p className="text-[13px] text-bone">Waiting for device to connect…</p>
                <p className="text-[11px] font-mono text-bone-dim mt-0.5">
                  The agent will appear here automatically once enrolled.
                </p>
              </div>
            </div>
            <Button variant="outline" size="lg" className="w-full" asChild>
              <Link href="/dashboard">
                Go to dashboard
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.6} />
              </Link>
            </Button>
          </div>
        )}

        {/* steps indicator */}
        <div className="flex items-center gap-2 pt-2">
          {[
            { n: 1, label: "Account",      done: true  },
            { n: 2, label: "Organization", done: true  },
            { n: 3, label: "Connect",      done: false },
          ].map((s, i) => (
            <React.Fragment key={s.n}>
              <div className={`flex items-center gap-1.5 text-[11px] font-mono ${s.done ? "text-mint" : "text-ember"}`}>
                <span className={`w-5 h-5 rounded-full border grid place-items-center text-[10px] ${s.done ? "border-mint bg-mint/10 text-mint" : "border-ember text-ember"}`}>
                  {s.done ? <Check className="w-2.5 h-2.5" strokeWidth={2.5} /> : s.n}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < 2 && <span className="flex-1 h-px bg-white/[0.06]" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
