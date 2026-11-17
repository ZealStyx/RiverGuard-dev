/**
 * GET /api/gis/layers/[id]
 *
 * Streams one verified layer's GeoJSON from `data/gis`, re-checking its sha256
 * against the verification artifact on the way out. A file that changed after
 * review answers 409 instead of being drawn, and an id that was never verified
 * answers 404.
 */

import { NextResponse } from "next/server";

import { GisLayerError, readGisLayer } from "@/lib/gis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const { body, layer } = await readGisLayer(decodeURIComponent(id));
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "application/geo+json; charset=utf-8",
        "cache-control": "no-store",
        "x-gis-layer": layer.id,
        "x-gis-sha256": layer.sha256,
        "x-gis-source": layer.source.publisher,
        "x-gis-license": layer.source.license,
      },
    });
  } catch (error) {
    if (error instanceof GisLayerError) {
      return NextResponse.json(
        { error: error.message, layerId: id },
        { status: error.status },
      );
    }
    return NextResponse.json(
      {
        error: "The verified GIS layer could not be read.",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
