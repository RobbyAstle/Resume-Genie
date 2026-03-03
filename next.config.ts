import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Puppeteer and its Chromium bindings must run in Node.js, not in the
  // Edge runtime. Listing them here prevents Next.js from trying to bundle
  // them for the browser / Edge.
  serverExternalPackages: ["puppeteer", "puppeteer-core"],
};

export default nextConfig;
