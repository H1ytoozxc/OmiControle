import type { Metadata, Viewport } from "next";
import { displayFont, sansFont, monoFont } from "@/styles/fonts";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sequoia OS", template: "%s · Sequoia" },
  description: "Control plane for distributed devices, AI agents, and automation.",
  applicationName: "Sequoia",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08090C",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-ink text-bone selection:bg-ember/20">
        {/* Atmosphere — sits behind everything. Fixed, GPU-cheap. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-radial-ember opacity-50" />
          <div className="absolute inset-0 bg-grid-fine bg-[length:64px_64px] opacity-[0.08] [mask-image:radial-gradient(80%_60%_at_50%_30%,#000,transparent_85%)]" />
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
