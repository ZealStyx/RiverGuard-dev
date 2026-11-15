import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/researcher/data-sources",
        destination: "/admin/data-sources?view=research",
        permanent: false,
      },
      {
        source: "/researcher/data-sources/:path*",
        destination: "/admin/data-sources/:path*?view=research",
        permanent: false,
      },
      {
        source: "/researcher/models",
        destination: "/admin/models?view=research",
        permanent: false,
      },
      {
        source: "/researcher/models/:path*",
        destination: "/admin/models/:path*?view=research",
        permanent: false,
      },
      {
        source: "/researcher/locations",
        destination: "/admin/locations?view=research",
        permanent: false,
      },
      {
        source: "/researcher/locations/:path*",
        destination: "/admin/locations/:path*?view=research",
        permanent: false,
      },
      {
        source: "/researcher",
        destination: "/admin/research",
        permanent: false,
      },
      {
        source: "/researcher/:path*",
        destination: "/admin/research/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
