"use client";

import * as React from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        minHeight: "100vh",
        background: "#08090C",
        color: "#E8E3D8",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}>
        <div style={{ maxWidth: 420, width: "100%" }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>
            Critical error
          </h2>
          <p style={{ fontSize: 13, color: "#9A938A", marginTop: 6, lineHeight: 1.5 }}>
            {error.message || "The application failed to render. This is a root-level error."}
          </p>
          {error.digest && (
            <p style={{ fontSize: 11, color: "#615C56", fontFamily: "monospace", marginTop: 12, wordBreak: "break-all" }}>
              digest: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "8px 16px",
              fontSize: 13,
              background: "#D17A3D",
              color: "#08090C",
              border: 0,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Reload app
          </button>
        </div>
      </body>
    </html>
  );
}
