import type { NextConfig } from "next";

const config: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
    ];
  },
  // Required by PostHog's reverse-proxy setup — without this, Next's
  // automatic trailing-slash redirect can break the /ingest/decide POST.
  skipTrailingSlashRedirect: true,
};

export default config;
