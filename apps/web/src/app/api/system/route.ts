/**
 * GET /api/system
 *
 * What this running service is actually configured to do. The administrator
 * screens used to print fixed strings — "Convex deployment — Not connected",
 * "Weather provider — Configuration pending" — which stayed on screen whatever
 * the environment said. Every value here is read from the running process or
 * from a store, so the panel can only claim what it can prove.
 *
 * No secrets are exposed: the weather provider name and whether the offline
 * fixture is permitted, never the variables behind them.
 */

import { NextResponse } from "next/server";

import { convexUrl } from "@/lib/convex-functions";
import { gaugeStatus } from "@/lib/gauge";
import { countAuditEvents } from "@/lib/audit-store";
import { countReviews } from "@/lib/review-store";
import { countLocalRuns } from "@/lib/run-store";
import { providerConfig } from "@/lib/weather";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = providerConfig();

  const [runs, reviews, auditEvents, riverGauge] = await Promise.all([
    countLocalRuns().catch(() => null),
    countReviews().catch(() => null),
    countAuditEvents().catch(() => null),
    gaugeStatus().catch(() => ({
      configured: false,
      file: "",
      rows: 0,
      error: "The gauge file status could not be read.",
    })),
  ]);

  return NextResponse.json(
    {
      weather: {
        provider: config.provider,
        fixtureAllowed: config.allowFixture,
      },
      convex: { configured: Boolean(convexUrl) },
      storage: {
        runs,
        reviews,
        auditEvents,
      },
      riverGauge,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
