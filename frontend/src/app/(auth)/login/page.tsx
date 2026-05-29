"use client";

import * as React from "react";
import Link from "next/link";
import { Fingerprint, Github, Mail, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/primitives";

export default function LoginPage() {
  const [showPw, setShowPw] = React.useState(false);

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
            One control plane for your entire fleet.
          </h1>
          <p className="text-[14px] text-bone-muted mt-4 max-w-[380px] leading-relaxed">
            Devices, AI agents, workflows, and telemetry — all in one place. Enroll your first device in minutes.
          </p>
        </div>

        <p className="text-[11px] font-mono text-bone-dim">
          Sequoia Platform · Apache-2.0
        </p>
      </aside>

      {/* right: form */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px] space-y-6 fade-up">
          {/* mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <span className="text-[18px] font-semibold text-bone">Sequoia</span>
          </div>

          <div>
            <h2 className="text-[24px] font-semibold text-bone tracking-tight">Sign in</h2>
            <p className="text-[13px] text-bone-muted mt-1">
              New here?{" "}
              <Link href="/register" className="text-ember hover:text-ember-50 transition-colors">
                Create an account
              </Link>
            </p>
          </div>

          {/* SSO */}
          <div className="space-y-2">
            <Button variant="plate" size="lg" className="w-full justify-between">
              <span className="flex items-center gap-2.5">
                <Github className="w-4 h-4" strokeWidth={1.6} />
                Continue with GitHub
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
            </Button>
            <Button variant="plate" size="lg" className="w-full justify-between">
              <span className="flex items-center gap-2.5">
                <Mail className="w-4 h-4" strokeWidth={1.6} />
                Continue with Google
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
            </Button>
            <Button variant="outline" size="lg" className="w-full justify-between">
              <span className="flex items-center gap-2.5">
                <Fingerprint className="w-4 h-4" strokeWidth={1.6} />
                Use a passkey
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
          <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">Email</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                className="h-9 px-3 rounded-sm bg-ink-50/60 border border-white/[0.08] focus:border-ember/40 outline-none text-[13px] text-bone placeholder:text-bone-dim transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">Password</span>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  className="w-full h-9 px-3 pr-9 rounded-sm bg-ink-50/60 border border-white/[0.08] focus:border-ember/40 outline-none text-[13px] text-bone placeholder:text-bone-dim transition-colors"
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

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-[11.5px] font-mono text-bone-dim hover:text-bone-muted transition-colors">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="ember" size="lg" className="w-full mt-1">
              Sign in
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
