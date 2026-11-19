import { execFileSync } from "node:child_process";

import type { NextConfig } from "next";

/**
 * Which build this is: short commit + that commit's time.
 *
 * It exists so "the site still says X" is answerable — the stamp renders in the
 * risk panel and under the dashboard provenance line, and is printed once at
 * startup. An on-screen stamp older than the checkout you expect means a stale
 * tab or a different server, not a source defect.
 *
 * It must be *deterministic*: Turbopack evaluates this config more than once
 * (server and client bundles), so any value read from the clock produces two
 * different strings and a hydration mismatch. Commit metadata cannot drift.
 */
function buildStamp(): string {
  const provided = process.env.NEXT_PUBLIC_APP_BUILD?.trim();
  if (provided) return provided;

  try {
    const [commit, committedAt] = execFileSync(
      "git",
      ["log", "-1", "--format=%h|%cI"],
      { cwd: __dirname, encoding: "utf8" },
    )
      .trim()
      .split("|");
    const time = (committedAt ?? "").slice(0, 16).replace("T", " ");
    return time ? `${commit} · ${time}` : commit;
  } catch {
    return "unknown";
  }
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
};

export default nextConfig;
