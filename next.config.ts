import type { NextConfig } from "next";

import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb"
    }
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders]
      }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com"
      }
    ]
  }
};

export default nextConfig;
