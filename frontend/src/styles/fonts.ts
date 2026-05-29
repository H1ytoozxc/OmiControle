// Fonts are loaded via CSS @import in globals.css (Google Fonts CDN, runtime).
// This avoids next/font/google's build-time network fetch, which fails in
// offline/CI environments. CSS variables are declared in tokens.css :root.
// These shims keep the layout.tsx className interpolations intact.
export const displayFont = { variable: "", className: "" };
export const sansFont    = { variable: "", className: "" };
export const monoFont    = { variable: "", className: "" };
