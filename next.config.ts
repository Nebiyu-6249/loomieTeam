import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
};

export default nextConfig;
