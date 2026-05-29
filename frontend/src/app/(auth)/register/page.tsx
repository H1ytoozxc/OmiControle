"use client";

import * as React from "react";
import Link from "next/link";
import { Github, Mail, ArrowRight, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/primitives";
import { useT } from "@/lib/i18n";

type Step = "account" | "org" | "done";

export default function RegisterPage() {
  const [step, setStep] = React.useState<Step>("account");
  const [showPw, setShowPw] = React.useState(false);
  const t = useT().register;

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-ink">
      {/* left: brand */}
      <aside className="hidden lg:flex flex-col justify-between px-14 py-12 border-r border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-[20px] font-semibold text-bone tracking-tight">Sequoia</span>
          <span className="eyebrow mt-0.5">v0.1</span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-[48px] font-semibold leading-[1.05] text-bone tracking-tight max-w-[400px]">
              {t.headline}
            </h1>
            <p className="text-[14px] text-bone-muted mt-4 max-w-[360px] leading-relaxed">
              {t.subline}
            </p>
          </div>

          <ul className="space-y-3">
            {t.features.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[13px] text-bone-muted">
                <span className="w-4 h-4 rounded-full bg-mint/20 border border-mint/40 grid place-items-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 text-mint" strokeWidth={2.5} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] font-mono text-bone-dim">Sequoia Platform · Apache-2.0</p>
      </aside>

      {/* right: multi-step form */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px] fade-up">
          {/* mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <span className="text-[18px] font-semibold text-bone">Sequoia</span>
          </div>

          {/* step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {(["account", "org", "done"] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 text-[11px] font-mono transition-colors ${step === s ? "text-ember" : (["account", "org", "done"].indexOf(step) > i ? "text-mint" : "text-bone-dim")}`}>
                  <span className={`w-5 h-5 rounded-full border grid place-items-center text-[10px] transition-colors ${step === s ? "border-ember text-ember" : (["account", "org", "done"].indexOf(step) > i ? "border-mint text-mint bg-mint/10" : "border-white/[0.12] text-bone-dim")}`}>
                    {["account", "org", "done"].indexOf(step) > i ? <Check className="w-2.5 h-2.5" strokeWidth={2.5} /> : i + 1}
                  </span>
                  <span className="hidden sm:inline capitalize">{s}</span>
                </div>
                {i < 2 && <span className="flex-1 h-px bg-white/[0.06]" />}
              </React.Fragment>
            ))}
          </div>

          {step === "account" && <AccountStep t={t} onNext={() => setStep("org")} showPw={showPw} setShowPw={setShowPw} />}
          {step === "org"     && <OrgStep     t={t} onNext={() => setStep("done")} onBack={() => setStep("account")} />}
          {step === "done"    && <DoneStep    t={t} />}
        </div>
      </main>
    </div>
  );
}

type Tr = ReturnType<typeof useT>["register"];

function AccountStep({ t, onNext, showPw, setShowPw }: { t: Tr; onNext: () => void; showPw: boolean; setShowPw: (v: boolean) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[24px] font-semibold text-bone tracking-tight">{t.title}</h2>
        <p className="text-[13px] text-bone-muted mt-1">
          {t.alreadyHave}{" "}
          <Link href="/login" className="text-ember hover:text-ember-50 transition-colors">{t.signIn}</Link>
        </p>
      </div>

      <div className="space-y-2">
        <Button variant="plate" size="lg" className="w-full justify-between">
          <span className="flex items-center gap-2.5"><Github className="w-4 h-4" strokeWidth={1.6} />{t.continueGitHub}</span>
          <ArrowRight className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
        </Button>
        <Button variant="plate" size="lg" className="w-full justify-between">
          <span className="flex items-center gap-2.5"><Mail className="w-4 h-4" strokeWidth={1.6} />{t.continueGoogle}</span>
          <ArrowRight className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <span className="flex-1 h-px bg-white/[0.06]" />
        <span className="eyebrow">or</span>
        <span className="flex-1 h-px bg-white/[0.06]" />
      </div>

      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onNext(); }}>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">{t.fullName}</span>
          <input type="text" autoComplete="name" placeholder="Jane Smith" required
            className="h-9 px-3 rounded-sm bg-ink-50/60 border border-white/[0.08] focus:border-ember/40 outline-none text-[13px] text-bone placeholder:text-bone-dim transition-colors" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">{t.workEmail}</span>
          <input type="email" autoComplete="email" placeholder="you@company.com" required
            className="h-9 px-3 rounded-sm bg-ink-50/60 border border-white/[0.08] focus:border-ember/40 outline-none text-[13px] text-bone placeholder:text-bone-dim transition-colors" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">{t.passwordLabel}</span>
          <div className="relative">
            <input type={showPw ? "text" : "password"} autoComplete="new-password" placeholder={t.passwordHint} required minLength={12}
              className="w-full h-9 px-3 pr-9 rounded-sm bg-ink-50/60 border border-white/[0.08] focus:border-ember/40 outline-none text-[13px] text-bone placeholder:text-bone-dim transition-colors" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bone-dim hover:text-bone-muted transition-colors"
              aria-label={showPw ? "Hide" : "Show"}>
              {showPw ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.6} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.6} />}
            </button>
          </div>
        </label>

        <Button type="submit" variant="ember" size="lg" className="w-full mt-1">
          {t.continueBtn}
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
        </Button>
      </form>

      <p className="text-[11px] font-mono text-bone-dim text-center leading-relaxed">
        {t.terms}{" "}
        <Link href="#" className="text-bone-muted hover:text-bone transition-colors">{t.termsLink}</Link>
        {" "}{t.and}{" "}
        <Link href="#" className="text-bone-muted hover:text-bone transition-colors">{t.privacyLink}</Link>.
      </p>
    </div>
  );
}

function OrgStep({ t, onNext, onBack }: { t: Tr; onNext: () => void; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[24px] font-semibold text-bone tracking-tight">{t.orgTitle}</h2>
        <p className="text-[13px] text-bone-muted mt-1">{t.orgSubtitle}</p>
      </div>

      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onNext(); }}>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">{t.orgName}</span>
          <input type="text" placeholder="Acme Corp" required
            className="h-9 px-3 rounded-sm bg-ink-50/60 border border-white/[0.08] focus:border-ember/40 outline-none text-[13px] text-bone placeholder:text-bone-dim transition-colors" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">{t.tenantSlug}</span>
          <div className="flex items-center h-9 rounded-sm bg-ink-50/60 border border-white/[0.08] focus-within:border-ember/40 transition-colors overflow-hidden">
            <span className="px-3 text-[12px] font-mono text-bone-dim border-r border-white/[0.06] h-full flex items-center bg-ink-100/40">
              sequoia.io/
            </span>
            <input type="text" placeholder="acme" required pattern="[a-z0-9-]+"
              className="flex-1 px-3 bg-transparent outline-none text-[13px] text-bone placeholder:text-bone-dim font-mono" />
          </div>
          <span className="text-[10.5px] font-mono text-bone-dim">{t.slugHint}</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">{t.region}</span>
          <select required
            className="h-9 px-3 rounded-sm bg-ink-50/60 border border-white/[0.08] focus:border-ember/40 outline-none text-[13px] text-bone transition-colors appearance-none cursor-pointer">
            <option value="">{t.regionPlaceholder}</option>
            <option value="us-west-2">US West (Oregon)</option>
            <option value="us-east-1">US East (Virginia)</option>
            <option value="eu-west-1">EU West (Ireland)</option>
            <option value="eu-central-1">EU Central (Frankfurt)</option>
            <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
          </select>
        </label>

        <div className="flex gap-2 mt-1">
          <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onBack}>{t.back}</Button>
          <Button type="submit" variant="ember" size="lg" className="flex-1">
            {t.createOrg}
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
          </Button>
        </div>
      </form>
    </div>
  );
}

function DoneStep({ t }: { t: Tr }) {
  return (
    <div className="space-y-5 text-center">
      <div className="w-14 h-14 rounded-full bg-mint/15 border border-mint/40 grid place-items-center mx-auto">
        <Check className="w-6 h-6 text-mint" strokeWidth={2} />
      </div>
      <div>
        <h2 className="text-[24px] font-semibold text-bone tracking-tight">{t.doneTitle}</h2>
        <p className="text-[13px] text-bone-muted mt-1 max-w-[280px] mx-auto leading-relaxed">{t.doneSubtitle}</p>
      </div>
      <Button variant="ember" size="lg" className="w-full" asChild>
        <Link href="/onboarding">
          {t.connectDevice}
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
        </Link>
      </Button>
    </div>
  );
}
