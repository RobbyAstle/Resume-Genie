import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server in .next/standalone/ for distribution
  output: "standalone",
  // Puppeteer must run in Node.js, not Edge. Mark it as external so Next.js
  // doesn't try to bundle it, and use outputFileTracingIncludes to ensure the
  // entire dependency tree gets copied into the standalone output.
  serverExternalPackages: ["puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/pdf/*": [
      // pnpm stores each package and its deps in isolated directories under
      // .pnpm/. A single puppeteer-core glob won't capture transitive deps
      // like @puppeteer/browsers, progress, ws, etc. Include everything under
      // .pnpm/ so the entire dependency tree is available at runtime.
      "./node_modules/.pnpm/**/*",
    ],
  },
};

export default nextConfig;
