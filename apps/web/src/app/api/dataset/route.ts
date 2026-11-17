/**
 * GET /api/dataset
 *
 * Identity and coverage of the dataset the app is actually reading, so every
 * provenance line in the UI can be derived instead of typed by hand.
 */

import { NextResponse } from "next/server";

import { DatasetUnavailableError, loadDataset } from "@/lib/dataset";
import { LOCATIONS } from "@/lib/locations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dataset = await loadDataset();
    return NextResponse.json({
      ...dataset.meta,
      supported: Object.values(LOCATIONS).map((location) => ({
        code: location.code,
        name: location.name,
        river: location.river,
        alarmLevelsM: location.alarmLevelsM,
        alarmsVerified: location.alarmsVerified,
        rows: dataset.byLocation.get(location.name)?.length ?? 0,
      })),
    });
  } catch (error) {
    if (error instanceof DatasetUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json(
      {
        error: "The dataset could not be read.",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
