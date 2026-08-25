import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86_400,
    remotePatterns: [
      { protocol: "https", hostname: "vsmov.com" },
      { protocol: "https", hostname: "nguon.vsphim.com" },
      { protocol: "https", hostname: "*.vsphim.com" },
      { protocol: "https", hostname: "img.ophimimg.com" },
      { protocol: "https", hostname: "*.ophimimg.com" },
      { protocol: "https", hostname: "ophim1.com" },
      { protocol: "https", hostname: "phim.nguonc.com" },
      { protocol: "https", hostname: "*.nguonc.com" },
      { protocol: "https", hostname: "phimimg.com" },
      { protocol: "https", hostname: "*.phimimg.com" },
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
  },
};

export default nextConfig;
