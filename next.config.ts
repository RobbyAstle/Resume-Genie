import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Puppeteer must run in Node.js, not Edge. Mark it as external so Next.js
  // doesn't try to bundle it (it has native bindings).
  serverExternalPackages: ["puppeteer-core"],
};

export default nextConfig;
