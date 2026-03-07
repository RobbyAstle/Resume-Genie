import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server in .next/standalone/ for distribution
  output: "standalone",
  // Puppeteer and its Chromium bindings must run in Node.js, not in the
  // Edge runtime. Listing them here prevents Next.js from trying to bundle
  // them for the browser / Edge.
  serverExternalPackages: ["puppeteer-core"],
};

export default nextConfig;
