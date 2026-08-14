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
      // /studio became /about when the team went on it: the page describes
      // the people as well as the practice now, and "Studio" named only half
      // of that. The older anchors pointed at /studio, so they move too.
      { source: "/studio", destination: "/about", permanent: true },
      { source: "/story", destination: "/about#story", permanent: true },
      { source: "/values", destination: "/about#values", permanent: true },
      { source: "/identity", destination: "/about#identity", permanent: true },
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
