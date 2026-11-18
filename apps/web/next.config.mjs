/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type errors fail the build (no ignoreBuildErrors).
  images: {
    // Explicit allow-list only. Add hosts here when the API settles on a logo CDN.
    remotePatterns: [{ protocol: "https", hostname: "assets.coinbase.com" }],
  },
  async redirects() {
    // v1 routes -> v2
    return [
      { source: "/home", destination: "/", permanent: false },
      { source: "/discover", destination: "/", permanent: false },
      { source: "/discover/:id", destination: "/", permanent: false },
      { source: "/orders", destination: "/portfolio", permanent: false },
      { source: "/auth", destination: "/", permanent: false },
      { source: "/onboarding", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
