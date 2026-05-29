"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/primitives";
import { useT } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const t = useT().forgotPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-6">
      <div className="w-full max-w-[360px] fade-up space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[18px] font-semibold text-bone">Sequoia</span>
        </div>

        {!sent ? (
          <>
            <div>
              <h2 className="text-[24px] font-semibold text-bone tracking-tight">{t.title}</h2>
              <p className="text-[13px] text-bone-muted mt-1">{t.subtitle}</p>
            </div>

            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">{t.email}</span>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 px-3 rounded-sm bg-ink-50/60 border border-white/[0.08] focus:border-ember/40 outline-none text-[13px] text-bone placeholder:text-bone-dim transition-colors"
                />
              </label>
              <Button type="submit" variant="ember" size="lg" className="w-full">{t.send}</Button>
            </form>
          </>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-md bg-mint/10 border border-mint/30 grid place-items-center">
              <Mail className="w-5 h-5 text-mint" strokeWidth={1.6} />
            </div>
            <div>
              <h2 className="text-[22px] font-semibold text-bone tracking-tight">{t.sentTitle}</h2>
              <p className="text-[13px] text-bone-muted mt-1.5 leading-relaxed">
                {t.sentSubtitle} <span className="text-bone">{email}</span>. {t.sentNote}
              </p>
            </div>
            <p className="text-[12px] font-mono text-bone-dim">
              <button onClick={() => setSent(false)} className="text-ember hover:text-ember-50 transition-colors">
                {t.tryAnother}
              </button>
            </p>
          </div>
        )}

        <Link href="/login" className="flex items-center gap-1.5 text-[12px] font-mono text-bone-dim hover:text-bone-muted transition-colors">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.6} />
          {t.backToSignIn}
        </Link>
      </div>
    </div>
  );
}
