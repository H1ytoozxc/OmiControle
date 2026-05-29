"use client";

import Link from "next/link";
import { Clock, Mail } from "lucide-react";
import { Button } from "@/components/primitives";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6">
      <div className="w-full max-w-[400px] text-center space-y-6 fade-up">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-ember/10 border border-ember/30 grid place-items-center mx-auto">
          <Clock className="w-7 h-7 text-ember" strokeWidth={1.4} />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-[28px] font-semibold text-bone tracking-tight leading-tight">
            Registration submitted
          </h1>
          <p className="text-[13.5px] text-bone-muted leading-relaxed max-w-[320px] mx-auto">
            Your account is pending administrator approval. You&apos;ll be able to sign in once
            an admin reviews and approves your request.
          </p>
        </div>

        {/* Info box */}
        <div className="p-4 rounded-sm border border-white/[0.08] bg-ink-50/40 text-left space-y-3">
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-bone-muted shrink-0 mt-0.5" strokeWidth={1.6} />
            <p className="text-[12.5px] text-bone-muted leading-relaxed">
              You&apos;ll receive a notification once your account is approved.
              In the meantime, reach out to your organisation&apos;s administrator directly.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="text-left space-y-2.5">
          {[
            { n: "1", text: "Registration submitted", done: true },
            { n: "2", text: "Admin reviews your request", done: false },
            { n: "3", text: "Account activated — you can sign in", done: false },
          ].map((step) => (
            <div key={step.n} className="flex items-center gap-3">
              <span className={`w-5 h-5 rounded-full border grid place-items-center text-[10px] font-mono shrink-0 transition-colors ${
                step.done
                  ? "border-mint/60 bg-mint/10 text-mint"
                  : "border-white/[0.12] text-bone-dim"
              }`}>
                {step.n}
              </span>
              <span className={`text-[12.5px] ${step.done ? "text-bone" : "text-bone-dim"}`}>
                {step.text}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-2 flex flex-col items-center gap-3">
          <Button variant="outline" size="md" asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
          <p className="text-[11px] font-mono text-bone-dim">
            Sequoia Platform · access is by invitation only
          </p>
        </div>
      </div>
    </div>
  );
}
