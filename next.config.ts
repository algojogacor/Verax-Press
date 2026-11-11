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
  async headers() {
    const noindexNofollow = [
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    const noindexFollow = [
      { key: "X-Robots-Tag", value: "noindex, follow" },
    ];
    return [
      { source: "/studio", headers: noindexNofollow },
      { source: "/studio/:path*", headers: noindexNofollow },
      { source: "/cms", headers: noindexNofollow },
      { source: "/kontributor/login", headers: noindexNofollow },
      { source: "/kontributor/aktivasi/:path*", headers: noindexNofollow },
      { source: "/kontributor/portal", headers: noindexNofollow },
      { source: "/kontributor/portal/:path*", headers: noindexNofollow },
      { source: "/kontributor/daftar", headers: noindexFollow },
      { source: "/api/:path*", headers: noindexNofollow },
      { source: "/openapi.json", headers: noindexNofollow },
      { source: "/llms.txt", headers: noindexNofollow },
      { source: "/llms-full.txt", headers: noindexNofollow },
      { source: "/.well-known/:path*", headers: noindexNofollow },
    ];
  },
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
