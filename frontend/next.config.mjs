/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "motion", "@radix-ui/react-dialog"],
  },
  // Tauri desktop build exports static files.
  // Production server build uses standalone mode for Docker.
  // Dev mode uses neither (default Next.js server).
  ...(process.env.SEQUOIA_DESKTOP === "1"
    ? { output: "export", images: { unoptimized: true } }
    : process.env.NODE_ENV === "production"
      ? { output: "standalone" }
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
