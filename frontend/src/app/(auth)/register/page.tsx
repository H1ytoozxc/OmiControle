"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Github, Mail, ArrowRight, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/primitives";
import { useT } from "@/lib/i18n";
import { api, ApiError } from "@/lib/api/client";

type Step = "account" | "org" | "done";

interface FormState {
  displayName: string;
  email: string;
  password: string;
  tenantId: string;
}

export default function RegisterPage() {
  const [step, setStep] = React.useState<Step>("account");
  const [showPw, setShowPw] = React.useState(false);
  const [form, setForm] = React.useState<FormState>({
    displayName: "", email: "", password: "", tenantId: "",
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const t = useT().register;
  const router = useRouter();

  async function submitRegistration() {
    setSubmitting(true);
    setError(null);
    try {
      await api("/v1/auth/register", {
        method: "POST",
        body: {
          tenant_id: form.tenantId,
          email: form.email,
          password: form.password,
          display_name: form.displayName,
        },
      });
      router.push("/pending-approval");
    } catch (err) {
      const msg = err instanceof ApiError
        ? (err.code === "conflict" ? "This email is already registered." : err.message)
        : "Registration failed. Try again.";
      setError(msg);
      setStep("account");
    } finally {
      setSubmitting(false);
    }
  }

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

          {error && (
            <div className="mb-4 p-3 rounded-sm border border-flame/30 bg-flame/[0.06] text-[12.5px] text-flame">
              {error}
            </div>
          )}

          {step === "account" && (
            <AccountStep
              t={t}
              form={form}
              setForm={setForm}
              showPw={showPw}
              setShowPw={setShowPw}
              onNext={() => setStep("org")}
            />
          )}
          {step === "org" && (
            <OrgStep
              t={t}
              form={form}
              setForm={setForm}
              submitting={submitting}
              onNext={submitRegistration}
              onBack={() => setStep("account")}
            />
          )}
          {step === "done" && <DoneStep t={t} />}
        </div>
      </main>
    </div>
  );
}

type Tr = ReturnType<typeof useT>["register"];

function AccountStep({
  t, form, setForm, showPw, setShowPw, onNext,
}: {
  t: Tr;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  showPw: boolean;
  setShowPw: (v: boolean) => void;
  onNext: () => void;
}) {
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
        <Button variant="plate" size="lg" className="w-full justify-between" type="button">
          <span className="flex items-center gap-2.5"><Github className="w-4 h-4" strokeWidth={1.6} />{t.continueGitHub}</span>
          <ArrowRight className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
        </Button>
        <Button variant="plate" size="lg" className="w-full justify-between" type="button">
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
          <input
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            required
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            className="field-input"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">{t.workEmail}</span>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="field-input"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">{t.passwordLabel}</span>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder={t.passwordHint}
              required
              minLength={12}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="field-input pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bone-dim hover:text-bone-muted transition-colors"
              aria-label={showPw ? "Hide" : "Show"}
            >
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

function OrgStep({
  t, form, setForm, submitting, onNext, onBack,
}: {
  t: Tr;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  submitting: boolean;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[24px] font-semibold text-bone tracking-tight">{t.orgTitle}</h2>
        <p className="text-[13px] text-bone-muted mt-1">{t.orgSubtitle}</p>
      </div>

      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onNext(); }}>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Tenant ID</span>
          <input
            type="text"
            placeholder="01HX… (ULID of your organisation)"
            required
            value={form.tenantId}
            onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
            className="field-input font-mono"
          />
          <span className="text-[10.5px] font-mono text-bone-dim">
            Ask your Sequoia administrator for the tenant ID.
          </span>
        </label>

        <div className="flex gap-2 mt-1">
          <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onBack}>{t.back}</Button>
          <Button type="submit" variant="ember" size="lg" className="flex-1" disabled={submitting}>
            {submitting ? "Submitting…" : t.createOrg}
            {!submitting && <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />}
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
    </div>
  );
}
