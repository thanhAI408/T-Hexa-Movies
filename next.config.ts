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
      { protocol: "https", hostname: "img.ophimimg.com" },
      { protocol: "https", hostname: "phim.nguonc.com" },
      { protocol: "https", hostname: "phimimg.com" },
      { protocol: "https", hostname: "*.phimimg.com" },
    ],
  },
};

export default nextConfig;
