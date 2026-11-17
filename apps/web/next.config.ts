import { execFileSync } from "node:child_process";

import type { NextConfig } from "next";

/**
 * Commit + build time, baked into the bundle.
 *
 * It exists so "the site still says X" is answerable: the stamp is rendered in
 * the risk panel and the dashboard header, and printed once at startup. If the
 * page shows an older stamp than this process, the page is stale — a tab that
 * has not reloaded, or a different checkout — and nothing in the source can be
 * the cause.
 */
function buildStamp(): string {
  const provided = process.env.NEXT_PUBLIC_APP_BUILD?.trim();
  if (provided) return provided;

  let commit = "unknown";
  try {
    commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: __dirname,
      encoding: "utf8",
    }).trim();
  } catch {
    // Not a git checkout — the timestamp below still identifies the build.
  }
  const time = new Date().toISOString().slice(0, 16).replace("T", " ");
  return `${commit} · ${time}Z`;
}

const BUILD_STAMP = buildStamp();
console.log(`[riverguard] build ${BUILD_STAMP}`);

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_BUILD: BUILD_STAMP },
  allowedDevOrigins: [
    "127.0.0.1",
    "atlas-unadorned-pediatric.ngrok-free.dev",
    "localhost",
    "*.e2b.app",
  ],
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
