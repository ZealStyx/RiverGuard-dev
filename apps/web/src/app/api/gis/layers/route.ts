/**
 * GET /api/gis/layers
 *
 * The layers this build may draw, straight from the generated verification
 * artifact. `layers` is empty in a clean checkout — that is the honest answer,
 * and it is what makes the map say "overlays are hidden until verified local
 * GIS data is added" rather than drawing something invented.
 *
 * `rejected` carries the layers a human declared but the verifier refused, with
 * the reasons, so the layer panel can show *why* a file is not on the map
 * instead of silently ignoring it.
 */

import { NextResponse } from "next/server";

import { loadGisLayers } from "@/lib/gis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const response = await loadGisLayers();
  return NextResponse.json(response, {
    headers: { "cache-control": "no-store" },
  });
}
