/**
 * GET /api/version
 *
 * The build the *server* is running. The bundle carries the same string, so a
 * tab can compare the two and say "this page is older than the server" instead
 * of leaving the browser's hydration warning as the only clue.
 *
 * `startedAt` is informational: it shows when this process booted, which is what
 * makes a stale dev server obvious.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const startedAt = new Date().toISOString();

export async function GET() {
  return NextResponse.json(
    {
      build: process.env.NEXT_PUBLIC_APP_BUILD?.trim() || null,
      startedAt,
      node: process.version,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
