"use client";

import * as React from "react";
import Link from "next/link";
import { Fingerprint, Github, Mail, ArrowRight } from "lucide-react";
import { Button, Kbd } from "@/components/primitives";

/**
 * Login — the "front door".
 *
 * Visual move: split left-right.
 *   - Left half: a soft ember-radial gradient and an oversize editorial
 *     italic headline. Lets the brand "sing" before the user is in.
 *   - Right half: the form, instrument-grade and unfussy.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-ink relative overflow-hidden">
      {/* atmospheric backdrop */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-radial-ember opacity-60" />
        <div className="absolute inset-0 bg-grid-fine bg-[length:64px_64px] opacity-[0.08] [mask-image:radial-gradient(80%_60%_at_50%_30%,#000,transparent_85%)]" />
        <div className="absolute inset-0 bg-scanline opacity-[0.05]" />
      </div>

      {/* left: editorial */}
      <aside className="relative z-10 px-12 pt-16 lg:pt-24 pb-12 flex flex-col">
        <div className="flex items-center gap-2">
          <span className="display-italic text-[28px] leading-none text-bone">Sequoia</span>
          <span className="eyebrow">OS · v0.1</span>
        </div>

        <div className="mt-auto max-w-[560px]">
          <div className="eyebrow mb-4">Operator login · 14:08 UTC</div>
          <h1 className="display-italic text-[88px] leading-[0.92] text-bone tracking-tight">
            One <span className="text-ember">instrument</span>
            <br />for the entire fleet.
          </h1>
          <p className="text-[14px] text-bone-muted mt-5 max-w-[440px] leading-relaxed">
            Devices, AI agents, workflows, telemetry — every signal converges
            here. Authenticate to open the bridge.
          </p>
        </div>

        <footer className="mt-12 flex items-center gap-4 text-[10.5px] font-mono text-bone-dim">
          <span>tenant: anthropic · production</span>
          <span>region: us-west-2</span>
          <span>build: a4c94e4</span>
          <span className="ml-auto flex items-center gap-1">supported: <Kbd>⌘</Kbd><Kbd>K</Kbd></span>
        </footer>
      </aside>

      {/* right: form */}
      <main className="relative z-10 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-[400px] plate p-8 rounded-md fade-up">
          <div className="eyebrow mb-2">Enter</div>
          <h2 className="text-[22px] tracking-tight text-bone">Sign in to your tenant</h2>
          <p className="text-[12.5px] text-bone-muted mt-1">SSO recommended · password fallback available.</p>

          <div className="mt-6 flex flex-col gap-2.5">
            <Button variant="plate" size="lg" className="w-full justify-between">
              <span className="flex items-center gap-2"><Github className="w-4 h-4" strokeWidth={1.6} />Continue with GitHub</span>
              <ArrowRight className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
            </Button>
            <Button variant="plate" size="lg" className="w-full justify-between">
              <span className="flex items-center gap-2"><Mail className="w-4 h-4" strokeWidth={1.6} />Continue with Google</span>
              <ArrowRight className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
            </Button>
            <Button variant="outline" size="lg" className="w-full justify-between">
              <span className="flex items-center gap-2"><Fingerprint className="w-4 h-4" strokeWidth={1.6} />Use a passkey</span>
              <ArrowRight className="w-3.5 h-3.5 text-bone-dim" strokeWidth={1.6} />
            </Button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <span className="flex-1 h-px bg-white/[0.06]" />
            <span className="eyebrow">OR · PASSWORD</span>
            <span className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <form className="flex flex-col gap-2.5">
            <Field label="email">
              <input
                type="email"
                placeholder="you@tenant.io"
                className="bg-ink-50/60 border border-white/[0.08] focus:border-ember/40 outline-none rounded-sm h-9 px-3 text-[13px] text-bone placeholder:text-bone-dim"
              />
            </Field>
            <Field label="password">
              <input
                type="password"
                placeholder="••••••••••"
                className="bg-ink-50/60 border border-white/[0.08] focus:border-ember/40 outline-none rounded-sm h-9 px-3 text-[13px] text-bone placeholder:text-bone-dim"
              />
            </Field>
            <Button variant="ember" size="lg" className="mt-1 w-full">Sign in</Button>
          </form>

          <Link href="/dashboard" className="mt-4 block text-center text-[11px] text-bone-dim font-mono hover:text-bone-muted">
            Forgot password? · contact your operator
          </Link>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      {children}
    </label>
  );
}
