/**
 * GET /api/runs/[id]
 *
 * One stored run from the local fallback store, with its days. 404 is a real
 * answer here: the run screens must be able to say "no such run" instead of
 * rendering an invented one.
 */

import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/api-auth";

import { getLocalRun } from "@/lib/run-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;

  const { id } = await context.params;

  try {
    const run = await getLocalRun(decodeURIComponent(id));
    if (!run) {
      return NextResponse.json(
        { error: "No stored run with that identifier.", runId: id },
        { status: 404 },
      );
    }
    return NextResponse.json({ source: "local", run });
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
