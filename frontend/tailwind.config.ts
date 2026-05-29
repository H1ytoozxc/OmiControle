import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

/**
 * Sequoia OS — Tailwind theme.
 *
 * Philosophy: tokens are the source of truth, defined as CSS variables in
 * `src/styles/tokens.css`. Tailwind just exposes them via these aliases so we
 * can switch themes (or expose tenants their own palette) without rebuilding.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", "2xl": "2rem" },
      screens: { "2xl": "1600px" },
    },
    extend: {
      fontFamily: {
        // editorial italic serif — for hero moments only
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        // primary UI sans
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        // tabular / data / telemetry / ids
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Surfaces — layered onyx
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          50: "rgb(var(--ink-50) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          200: "rgb(var(--ink-200) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
        },
        bone: {
          DEFAULT: "rgb(var(--bone) / <alpha-value>)",
          muted: "rgb(var(--bone-muted) / <alpha-value>)",
          dim: "rgb(var(--bone-dim) / <alpha-value>)",
        },
        // Signal accents (NOT the cliché cyan/purple)
        ember: {
          DEFAULT: "rgb(var(--ember) / <alpha-value>)",   // #FFB347 warm amber
          50: "rgb(var(--ember-50) / <alpha-value>)",
          glow: "rgb(var(--ember-glow) / <alpha-value>)",
        },
        mint: {
          DEFAULT: "rgb(var(--mint) / <alpha-value>)",     // #7BE0AD healthy
          dim: "rgb(var(--mint-dim) / <alpha-value>)",
        },
        flame: {
          DEFAULT: "rgb(var(--flame) / <alpha-value>)",   // #FF5F3D critical
          dim: "rgb(var(--flame-dim) / <alpha-value>)",
        },
        steel: {
          DEFAULT: "rgb(var(--steel) / <alpha-value>)",   // #6B8AA8 info / link
          dim: "rgb(var(--steel-dim) / <alpha-value>)",
        },
      },
      borderColor: {
        DEFAULT: "rgb(var(--hairline) / <alpha-value>)",
      },
      borderRadius: {
        // Tighter than default — instrument-panel feel.
        none: "0",
        xs: "2px",
        sm: "3px",
        DEFAULT: "5px",
        md: "6px",
        lg: "9px",
        xl: "14px",
      },
      boxShadow: {
        // Soft long shadows + subtle inner depth.
        sink: "inset 0 1px 0 rgb(var(--bone) / 0.04), 0 1px 0 rgb(0 0 0 / 0.5)",
        plate: "0 0 0 1px rgb(var(--hairline) / 0.6), 0 1px 0 rgb(255 255 255 / 0.02), 0 24px 60px -30px rgb(0 0 0 / 0.7)",
        ember: "0 0 0 1px rgb(var(--ember) / 0.4), 0 0 32px -8px rgb(var(--ember) / 0.45)",
        glow: "0 0 60px -12px rgb(var(--ember) / 0.35)",
      },
      backgroundImage: {
        "grid-fine": "linear-gradient(rgb(var(--hairline) / 0.5) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--hairline) / 0.5) 1px, transparent 1px)",
        "radial-ember": "radial-gradient(60% 60% at 50% 0%, rgb(var(--ember) / 0.18), transparent 70%)",
        "noise": "url('/noise.svg')",
        "scanline": "repeating-linear-gradient(0deg, rgb(var(--bone) / 0.03) 0 1px, transparent 1px 3px)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "0.9" },
          "50%":      { opacity: "0.45" },
        },
        "scan": {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "ticker": {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "ember-flicker": {
          "0%, 100%": { opacity: "1" },
          "47%":      { opacity: "0.88" },
          "48%":      { opacity: "0.62" },
          "49%":      { opacity: "0.94" },
        },
      },
      animation: {
        "pulse-soft":     "pulse-soft 2.6s ease-in-out infinite",
        "scan":           "scan 3.6s linear infinite",
        "fade-up":        "fade-up 600ms cubic-bezier(0.16,1,0.3,1) both",
        "ticker":         "ticker 40s linear infinite",
        "ember-flicker":  "ember-flicker 5s steps(20, end) infinite",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-expo":  "cubic-bezier(0.7, 0, 0.84, 0)",
      },
    },
  },
  plugins: [animate, typography],
};

export default config;
