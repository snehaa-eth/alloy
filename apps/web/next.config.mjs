import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// Monorepo root: lets Turbopack resolve `@alloy/sdk` (packages/sdk/src, aliased in tsconfig.json),
// which lives outside apps/web. Both roots must match or Next warns.
const monorepoRoot = path.join(here, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type errors fail the build (no ignoreBuildErrors).
  turbopack: { root: monorepoRoot },
  outputFileTracingRoot: monorepoRoot,
  images: {
    // Explicit allow-list only. metadata.coinbase.com serves the tokenized-stock icon_url logos.
    remotePatterns: [
      { protocol: "https", hostname: "assets.coinbase.com" },
      { protocol: "https", hostname: "metadata.coinbase.com" },
    ],
  },
  async redirects() {
    // v1 routes -> v2
    return [
      { source: "/home", destination: "/", permanent: false },
      { source: "/discover", destination: "/explore", permanent: false },
      { source: "/discover/:id", destination: "/explore", permanent: false },
      { source: "/orders", destination: "/portfolio", permanent: false },
      { source: "/auth", destination: "/", permanent: false },
      { source: "/onboarding", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
