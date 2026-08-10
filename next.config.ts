import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 80, 85],
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  async redirects() {
    return [
      { source: "/story", destination: "/studio#story", permanent: true },
      { source: "/values", destination: "/studio#values", permanent: true },
      { source: "/identity", destination: "/studio#identity", permanent: true },
      { source: "/who-we-build-for", destination: "/clients", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
