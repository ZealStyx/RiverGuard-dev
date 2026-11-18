/**
 * GET /api/audit?actor=&action=&outcome=&from=&to=&limit=50
 *
 * The local audit trail (`lib/audit-store.ts`). Filtering happens on the server
 * so the screen cannot show one thing while the store holds another.
 */

import { NextResponse } from "next/server";

import { isAuditAction, isAuditOutcome, type AuditFilters } from "@/lib/audit";
import { listAuditEvents } from "@/lib/audit-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawAction = url.searchParams.get("action");
  const rawOutcome = url.searchParams.get("outcome");

  if (rawAction && rawAction !== "all" && !isAuditAction(rawAction)) {
    return NextResponse.json(
      { error: "Unknown action filter." },
      { status: 400 },
    );
  }
  if (rawOutcome && rawOutcome !== "all" && !isAuditOutcome(rawOutcome)) {
    return NextResponse.json(
      { error: "Unknown outcome filter." },
      { status: 400 },
    );
  }

  const requestedLimit = Number(url.searchParams.get("limit") ?? 50);
  const filters: AuditFilters = {
    actor: url.searchParams.get("actor") ?? undefined,
    action: (rawAction as AuditFilters["action"]) ?? "all",
    outcome: (rawOutcome as AuditFilters["outcome"]) ?? "all",
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    limit: Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 50,
  };

  try {
    const events = await listAuditEvents(filters);
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      {
        error: "The audit store could not be read.",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
