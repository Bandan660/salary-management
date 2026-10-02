import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  /**
   * The browser only ever talks to this app's origin; /api/* is proxied to the
   * Express backend. Same-origin means the httpOnly session cookie works without
   * cross-site cookie settings (which browsers increasingly block).
   */
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
