/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "motion", "@radix-ui/react-dialog"],
  },
  // Tauri build: `next build && next export` is replaced by `output: "export"`
  // when SEQUOIA_DESKTOP=1 is set.
  ...(process.env.SEQUOIA_DESKTOP === "1"
    ? { output: "export", images: { unoptimized: true } }
    : {}),
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
      ],
    },
  ],
};

export default nextConfig;
