import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server in .next/standalone/ for distribution
  output: "standalone",
  // Puppeteer must run in Node.js, not Edge. Mark it as external so Next.js
  // doesn't try to bundle it, and use outputFileTracingIncludes to ensure the
  // entire dependency tree gets copied into the standalone output.
  serverExternalPackages: ["puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/pdf/*": ["./node_modules/puppeteer-core/**/*"],
  },
};

export default nextConfig;
