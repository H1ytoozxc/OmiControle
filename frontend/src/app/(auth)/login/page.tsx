"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fingerprint, Github, Mail, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/primitives";
import { useT, useLang } from "@/lib/i18n";
import { api, ApiError } from "@/lib/api/client";
import { useSession } from "@/lib/auth/session";

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  access_ttl_s: number;
  refresh_ttl_s: number;
}

export default function LoginPage() {
  const [showPw, setShowPw] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [tenantId, setTenantId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const t = useT().login;
  const { lang, toggle } = useLang();
  const router = useRouter();
  const setSession = useSession((s) => s.setSession);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await api<LoginResponse>("/v1/auth/login", {
        method: "POST",
        body: { tenant_id: tenantId, email, password },
      });
      setSession({
        accessToken: resp.access_token,
        refreshToken: resp.refresh_token,
        tenantId,
      });
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Sign-in failed. Try again.";
      setError(msg);
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

        <div>
          <h1 className="text-[52px] font-semibold leading-[1.05] text-bone tracking-tight max-w-[420px]">
            {t.headline}
          </h1>
          <p className="text-[14px] text-bone-muted mt-4 max-w-[380px] leading-relaxed">
            {t.subline}
          </p>
        </div>

        <p className="text-[11px] font-mono text-bone-dim">
          Sequoia Platform · Apache-2.0
        </p>
      </aside>

      {/* right: form */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px] space-y-6 fade-up">
          {/* mobile logo + lang toggle */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[18px] font-semibold text-bone lg:hidden">Sequoia</span>
            <button
              onClick={toggle}
              className="ml-auto h-6 px-2 rounded-sm border border-white/[0.08] text-[10px] font-mono text-bone-dim hover:text-bone hover:border-white/[0.20] transition-colors"
            >
              {lang === "en" ? "RU" : "EN"}
            </button>
          </div>

          <div>
            <h2 className="text-[24px] font-semibold text-bone tracking-tight">{t.title}</h2>
            <p className="text-[13px] text-bone-muted mt-1">
              {t.newHere}{" "}
              <Link href="/register" className="text-ember hover:text-ember-50 transition-colors">
                {t.createAccount}
              </Link>
            </p>
          </div>

          {/* SSO */}
          <div className="space-y-2">
            <Button variant="plate" size="lg" className="w-full justify-between">
              <span className="flex items-center gap-2.5">
                <Github className="w-4 h-4" strokeWidth={1.6} />
                {t.continueGitHub}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
            </Button>
            <Button variant="plate" size="lg" className="w-full justify-between">
              <span className="flex items-center gap-2.5">
                <Mail className="w-4 h-4" strokeWidth={1.6} />
                {t.continueGoogle}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
            </Button>
            <Button variant="outline" size="lg" className="w-full justify-between">
              <span className="flex items-center gap-2.5">
                <Fingerprint className="w-4 h-4" strokeWidth={1.6} />
                {t.usePasskey}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex-1 h-px bg-white/[0.06]" />
            <span className="eyebrow">or</span>
            <span className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* email/password */}
          <form className="space-y-3" onSubmit={submit}>
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">Tenant ID</span>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="01HX..."
                required
                className="field-input font-mono"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">{t.email}</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">{t.password}</span>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bone-dim hover:text-bone-muted transition-colors"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.6} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.6} />}
                </button>
              </div>
            </label>

            {error && (
              <p className="text-[12px] text-flame leading-relaxed">{error}</p>
            )}

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-[11.5px] font-mono text-bone-dim hover:text-bone-muted transition-colors">
                {t.forgotPassword}
              </Link>
            </div>

            <Button type="submit" variant="ember" size="lg" className="w-full mt-1" disabled={submitting}>
              {submitting ? "…" : t.signIn}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
