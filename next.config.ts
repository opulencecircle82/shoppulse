import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // The developer console lives at /devside; people keep typing it with an "s".
    return [
      { source: "/devsides", destination: "/devside", permanent: false },
      { source: "/devsides/:path*", destination: "/devside/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
