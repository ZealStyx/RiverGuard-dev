/**
 * GET /api/runs?limit=25
 *
 * Stored forecast runs from the local fallback store (`lib/run-store.ts`). The
 * browser only calls this when no Convex deployment is configured; when one is,
 * the run screens read `forecasts:recentRuns` instead.
 */

import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/api-auth";

import { listLocalRuns } from "@/lib/run-store";
import { summaryFromStoredRun } from "@/lib/runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Stored runs are operational data: signed-in accounts only.
  const denied = await requireApiAuth(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const requested = Number(url.searchParams.get("limit") ?? 25);
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(Math.trunc(requested), 1), 100)
    : 25;

  try {
    const runs = await listLocalRuns(limit);
    return NextResponse.json({
      source: "local",
      runs: runs.map(summaryFromStoredRun),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "The local run store could not be read.",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
