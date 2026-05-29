"use client";

import * as React from "react";
import Link from "next/link";
import { Terminal, Copy, Check, ArrowRight, Monitor, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/primitives";
import { useT } from "@/lib/i18n";

const INSTALL_COMMANDS: Record<string, string> = {
  linux:   "curl -fsSL https://get.sequoia.io/agent | sudo bash",
  macos:   "brew install sequoia-agent && sudo sequoia-agent start",
  windows: "winget install Sequoia.Agent",
};

export default function OnboardingPage() {
  const t = useT().onboarding;
  const [os, setOs] = React.useState<"linux" | "macos" | "windows">("linux");
  const [copied, setCopied] = React.useState(false);
  const [waiting, setWaiting] = React.useState(false);
  const [explainOpen, setExplainOpen] = React.useState(false);

  function copy() {
    navigator.clipboard.writeText(INSTALL_COMMANDS[os]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-6 py-12">
      <div className="w-full max-w-[520px] space-y-8 fade-up">
        {/* header */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <span className="text-[18px] font-semibold text-bone">Sequoia</span>
            <span className="eyebrow mt-0.5">v0.1</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className="w-8 h-8 rounded-full bg-ember/15 border border-ember/40 grid place-items-center text-[13px] font-semibold text-ember">1</span>
            <p className="eyebrow">{t.stepLabel}</p>
          </div>
          <h1 className="text-[28px] font-semibold text-bone tracking-tight leading-tight">
            {t.title}
          </h1>
          <p className="text-[13px] text-bone-muted mt-2 leading-relaxed">
            {t.subtitle}
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

          {/* explanation — only for linux (curl command) */}
          {os === "linux" && (
            <div className="border border-white/[0.06] rounded-md overflow-hidden">
              <button
                onClick={() => setExplainOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-[12px] text-bone-muted">{t.whatLabel}</span>
                {explainOpen
                  ? <ChevronUp className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
                  : <ChevronDown className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
                }
              </button>

              {explainOpen && (
                <div className="border-t border-white/[0.06] px-4 py-4 space-y-4 bg-ink-50/40">
                  <p className="text-[12.5px] text-bone-muted leading-relaxed">{t.explainIntro}</p>

                  {/* Part 1 */}
                  <div className="space-y-1.5">
                    <code className="block text-[11.5px] font-mono text-ember bg-ink-100 px-2.5 py-1.5 rounded-sm">
                      {t.curlLabel}
                    </code>
                    <p className="text-[12px] text-bone-dim leading-relaxed">{t.curlDesc}</p>
                  </div>

                  {/* Part 2 */}
                  <div className="space-y-1.5">
                    <code className="block text-[11.5px] font-mono text-ember bg-ink-100 px-2.5 py-1.5 rounded-sm">
                      {t.pipeLabel}
                    </code>
                    <p className="text-[12px] text-bone-dim leading-relaxed">{t.pipeDesc}</p>
                  </div>

                  {/* What gets installed */}
                  <div className="space-y-1.5">
                    <p className="eyebrow">{t.installsLabel}</p>
                    <ul className="space-y-1">
                      {t.installItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] text-bone-dim">
                          <span className="text-bone-dim mt-0.5">·</span>
                          <code className="font-mono leading-relaxed">{item}</code>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* After install */}
                  <div className="space-y-1">
                    <p className="eyebrow">{t.afterLabel}</p>
                    <p className="text-[12px] text-bone-dim leading-relaxed">{t.afterDesc}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* waiting state */}
        {!waiting ? (
          <div className="space-y-3">
            <Button variant="ember" size="lg" className="w-full" onClick={() => setWaiting(true)}>
              <Monitor className="w-4 h-4" strokeWidth={1.6} />
              {t.iRanIt}
            </Button>
            <Link
              href="/dashboard"
              className="block text-center text-[12px] font-mono text-bone-dim hover:text-bone-muted transition-colors"
            >
              {t.skip}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-ink-100 border border-white/[0.08] rounded-md">
              <span className="w-2 h-2 rounded-full bg-ember animate-pulse shrink-0" />
              <div>
                <p className="text-[13px] text-bone">{t.waiting}</p>
                <p className="text-[11px] font-mono text-bone-dim mt-0.5">{t.waitingNote}</p>
              </div>
            </div>
            <Button variant="outline" size="lg" className="w-full" asChild>
              <Link href="/dashboard">
                {t.goToDashboard}
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.6} />
              </Link>
            </Button>
          </div>
        )}

        {/* steps indicator */}
        <div className="flex items-center gap-2 pt-2">
          {[
            { n: 1, label: t.stepAccount, done: true  },
            { n: 2, label: t.stepOrg,     done: true  },
            { n: 3, label: t.stepConnect, done: false },
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
