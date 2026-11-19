/**
 * GET /api/historical
 *
 * Observed daily rows straight out of `data/daily_observations.csv`. Read the
 * dataset through `@/lib/dataset`, which is the only module that parses the CSV.
 *
 *   ?location=Marikina   city name or slug (required)
 *   ?start=2026-11-01    inclusive ISO date (optional)
 *   ?end=2026-11-14      inclusive ISO date (optional)
 *   ?limit=14            max rows, most recent first (default 30, max 3650)
 *   ?mode=daily|monthly  aggregate view (default daily)
 */

import { NextResponse } from "next/server";

import {
  DATASET_LABEL,
  DatasetUnavailableError,
  loadDataset,
  monthlySeries,
  seriesFor,
} from "@/lib/dataset";
import { LOCATIONS } from "@/lib/locations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function friendlyName(location: string): string | null {
  const slug = location.trim().toLowerCase().replace(/\s+/g, "-");
  const match = Object.values(LOCATIONS).find(
    (entry) =>
      entry.code === slug ||
      entry.name.toLowerCase() === location.trim().toLowerCase(),
  );
  return match?.name ?? null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLocation = (url.searchParams.get("location") ?? "").trim();
  if (!rawLocation) {
    return NextResponse.json(
      {
        error: "A `location` query parameter is required.",
        supported: Object.values(LOCATIONS).map((entry) => entry.name),
      },
      { status: 400 },
    );
  }

  const mode = url.searchParams.get("mode") === "monthly" ? "monthly" : "daily";
  const start = url.searchParams.get("start") ?? undefined;
  const end = url.searchParams.get("end") ?? undefined;
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 30) || 30, 1),
    3650,
  );

  try {
    const dataset = await loadDataset();
    const locationName = friendlyName(rawLocation) ?? rawLocation;

    if (mode === "monthly") {
      const monthly = monthlySeries(dataset, locationName);
      if (monthly.length === 0) {
        return NextResponse.json(
          { error: `No monthly records are available for ${locationName}.` },
          { status: 404 },
        );
      }
      const months = Math.min(limit, monthly.length);
      return NextResponse.json({
        dataset: DATASET_LABEL,
        datasetMeta: dataset.meta,
        location: locationName,
        mode: "monthly",
        months,
        series: monthly.slice(-months),
      });
    }

    const series = seriesFor(dataset, locationName);
    if (series.length === 0) {
      return NextResponse.json(
        { error: `No records are available for ${locationName}.` },
        { status: 404 },
      );
    }

    const filtered = series
      .filter(
        (row) => (!start || row.date >= start) && (!end || row.date <= end),
      )
      .slice(-limit);

    if (filtered.length === 0) {
      return NextResponse.json(
        {
          error: `No records for ${locationName} between ${start ?? "the first row"} and ${end ?? "the last row"}.`,
          available: {
            dateMin: series[0].date,
            dateMax: series[series.length - 1].date,
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      dataset: DATASET_LABEL,
      datasetMeta: dataset.meta,
      location: locationName,
      mode: "daily",
      dateMin: filtered[0].date,
      dateMax: filtered[filtered.length - 1].date,
      readings: filtered.map((row) => ({
        isoDate: row.date,
        date: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "Asia/Manila",
        }).format(new Date(`${row.date}T00:00:00+08:00`)),
        rainfall: row.rainfallMm,
        waterLevel: row.waterLevelM,
        waterLevelChange24h: row.waterLevelChange24hM,
        soilMoisture: row.soilMoisturePct,
        antecedent3d: row.antecedentRain3dMm,
        antecedent7d: row.antecedentRain7dMm,
        antecedent30d: row.antecedentRain30dMm,
        floodOccurrence: row.floodOccurrence,
        riskLevel: row.riskLevel,
        rainSource: row.rainSource,
        qualityStatus: row.qualityStatus,
        split: row.split,
        stationId: row.stationId,
      })),
    });
  } catch (error) {
    if (error instanceof DatasetUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json(
      {
        error: "The historical dataset could not be read.",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
