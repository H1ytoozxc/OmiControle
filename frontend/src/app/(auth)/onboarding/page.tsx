"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Button, Badge } from "@/components/primitives";
import { useT } from "@/lib/i18n";

export default function OnboardingPage() {
  const t = useT().onboarding;
  const [explainOpen, setExplainOpen] = React.useState(false);

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
            <span className="w-8 h-8 rounded-full bg-ink-100 border border-white/[0.12] grid place-items-center text-[13px] font-semibold text-bone-dim">3</span>
            <p className="eyebrow">{t.stepLabel}</p>
          </div>
          <h1 className="text-[28px] font-semibold text-bone tracking-tight leading-tight">
            {t.title}
          </h1>
          <p className="text-[13px] text-bone-muted mt-2 leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        {/* not-ready notice */}
        <div className="rounded-md border border-white/[0.10] bg-ink-100/60 overflow-hidden">
          <div className="flex items-start gap-3 px-4 py-4">
            <div className="w-8 h-8 rounded-sm bg-ink-200 border border-white/[0.08] grid place-items-center flex-shrink-0 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[13px] font-medium text-bone">{t.notReadyTitle}</p>
                <Badge size="xs" tone="bone">{t.notReadyBadge}</Badge>
              </div>
              <p className="text-[12.5px] text-bone-muted leading-relaxed">{t.notReadyDesc}</p>
            </div>
          </div>

          {/* future command — shown as preview only */}
          <div className="border-t border-white/[0.06] px-4 py-3 space-y-2">
            <p className="text-[10.5px] font-mono text-bone-dim">{t.futureNote}</p>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-ink-50/50 border border-white/[0.06] rounded-sm font-mono text-[12.5px] text-bone-dim overflow-x-auto opacity-50 select-none">
              <span>{t.futureCommand}</span>
            </div>
          </div>

          {/* explanation accordion */}
          <div className="border-t border-white/[0.06]">
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
              <div className="border-t border-white/[0.06] px-4 py-4 space-y-4 bg-ink-50/30">
                <p className="text-[12.5px] text-bone-muted leading-relaxed">{t.explainIntro}</p>

                <div className="space-y-1.5">
                  <code className="block text-[11.5px] font-mono text-ember bg-ink-100 px-2.5 py-1.5 rounded-sm">
                    {t.curlLabel}
                  </code>
                  <p className="text-[12px] text-bone-dim leading-relaxed">{t.curlDesc}</p>
                </div>

                <div className="space-y-1.5">
                  <code className="block text-[11.5px] font-mono text-ember bg-ink-100 px-2.5 py-1.5 rounded-sm">
                    {t.pipeLabel}
                  </code>
                  <p className="text-[12px] text-bone-dim leading-relaxed">{t.pipeDesc}</p>
                </div>

                <div className="space-y-1.5">
                  <p className="eyebrow">{t.installsLabel}</p>
                  <ul className="space-y-1">
                    {t.installItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-bone-dim">
                        <span className="mt-0.5">·</span>
                        <code className="font-mono leading-relaxed">{item}</code>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1">
                  <p className="eyebrow">{t.afterLabel}</p>
                  <p className="text-[12px] text-bone-dim leading-relaxed">{t.afterDesc}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* primary CTA */}
        <div className="space-y-3">
          <Button variant="ember" size="lg" className="w-full" asChild>
            <Link href="/dashboard">
              {t.goToDashboard}
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
            </Link>
          </Button>
        </div>

        {/* steps indicator */}
        <div className="flex items-center gap-2 pt-2">
          {[
            { n: 1, label: t.stepAccount, done: true  },
            { n: 2, label: t.stepOrg,     done: true  },
            { n: 3, label: t.stepConnect, done: false },
          ].map((s, i) => (
            <React.Fragment key={s.n}>
              <div className={`flex items-center gap-1.5 text-[11px] font-mono ${s.done ? "text-mint" : "text-bone-dim"}`}>
                <span className={`w-5 h-5 rounded-full border grid place-items-center text-[10px] ${s.done ? "border-mint bg-mint/10 text-mint" : "border-white/[0.14] text-bone-dim"}`}>
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
