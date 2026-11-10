import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  // Indikator dev overlay (tombol "N" melayang) disembunyikan — bukan bagian
  // dari antarmuka publik; hanya relevan saat development.
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/cms/:path*",
        destination: "/api/studio/:path*",
      },
    ];
  },
};

export default nextConfig;
