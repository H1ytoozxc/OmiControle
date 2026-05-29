"use client";

import * as React from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/primitives";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-6">
      <div className="w-full max-w-[420px] space-y-6 fade-up">
        <div className="w-12 h-12 rounded-md bg-flame/10 border border-flame/30 grid place-items-center">
          <AlertTriangle className="w-5 h-5 text-flame" strokeWidth={1.6} />
        </div>
        <div>
          <h2 className="text-[22px] font-semibold text-bone tracking-tight">Something went wrong</h2>
          <p className="text-[13px] text-bone-muted mt-1.5 leading-relaxed">
            {error.message || "An unexpected error occurred while rendering this page."}
          </p>
          {error.digest && (
            <p className="mt-3 text-[11px] font-mono text-bone-dim break-all">
              digest: {error.digest}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ember" size="md" onClick={reset}>
            <RotateCw className="w-3.5 h-3.5" strokeWidth={1.8} />
            Try again
          </Button>
          <Button variant="outline" size="md" onClick={() => window.location.href = "/dashboard"}>
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
