import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server already trusts localhost and the hostname it was started
  // with. Arena's sandbox previews the app at https://{port}-{sandbox}.e2b.app,
  // and Next blocks cross-origin dev resources (/_next/static/*, HMR) unless
  // that host is listed -- without this the preview loads unstyled HTML and no
  // client JavaScript at all. Only dev asset loading is affected; production
  // builds ignore this option.
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.e2b.app"],
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
