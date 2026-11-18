/**
 * GET /api/historical
 *
 * Observed daily rows for one city, from two sources in a fixed order:
 *
 *   1. `data/daily_observations.csv` — the generated dataset (read through
 *      `@/lib/dataset`, the only module that parses the CSV);
 *   2. the observation store (`.data/observations.json`) — the days real
 *      forecast runs retrieved from Open-Meteo, appended **only** for dates the
 *      dataset does not cover.
 *
 * That order is the whole honesty story: the dataset is curated and wins any
 * date it holds; the store only extends the series past the dataset's last row.
 * Every live reading carries `origin: "live"`, its own `rainSource`, and a
 * `qualityStatus` that separates "derived level available" from "rain only".
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
  type ObservationRow,
} from "@/lib/dataset";
import { deriveObservationDays } from "@/lib/observed-history";
import { listObservations } from "@/lib/observation-store";
import { LOCATIONS, type LocationConfig } from "@/lib/locations";
import type { HistoricalReading } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The city the request names, or `null` when it is not one of the four. */
function resolveLocation(location: string): LocationConfig | null {
  const slug = location.trim().toLowerCase().replace(/\s+/g, "-");
  const trimmed = location.trim().toLowerCase();
  return (
    Object.values(LOCATIONS).find(
      (entry) =>
        entry.code === slug ||
        entry.name.toLowerCase() === trimmed ||
        entry.code === trimmed,
    ) ?? null
  );
}

function label(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(`${isoDate}T00:00:00+08:00`));
}

function readingFromRow(row: ObservationRow): HistoricalReading {
  return {
    isoDate: row.date,
    date: label(row.date),
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
    origin: "dataset",
  };
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

  const city = resolveLocation(rawLocation);
  const locationName = city?.name ?? rawLocation;

  let dataset: Awaited<ReturnType<typeof loadDataset>> | null = null;
  let datasetError: string | null = null;
  try {
    dataset = await loadDataset();
  } catch (error) {
    if (!(error instanceof DatasetUnavailableError)) {
      return NextResponse.json(
        {
          error: "The historical dataset could not be read.",
          detail: error instanceof Error ? error.message : "unknown error",
        },
        { status: 500 },
      );
    }
    datasetError = error.message;
  }

  if (mode === "monthly") {
    if (!dataset) {
      return NextResponse.json({ error: datasetError }, { status: 503 });
    }
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

  const series = dataset ? seriesFor(dataset, locationName) : [];
  const datasetMax = series.length ? series[series.length - 1].date : null;

  // Only days the dataset does not cover: a curated row always wins its date.
  const stored = city
    ? await listObservations(city.code, {
        limit: 90,
        since: datasetMax ?? undefined,
      })
    : [];
  const live = datasetMax
    ? stored.filter((day) => day.date > datasetMax)
    : stored;

  const derivation = city
    ? deriveObservationDays(series, live, city.alarmLevelsM)
    : { days: [], waterLevelDatumM: null, calibrationRows: 0 };

  const liveReadings: HistoricalReading[] = derivation.days.map((day) => ({
    isoDate: day.date,
    date: label(day.date),
    rainfall: day.rainfallMm,
    waterLevel: day.waterLevelM,
    waterLevelChange24h: day.waterLevelChange24hM,
    soilMoisture: day.soilMoisturePercent,
    antecedent3d: day.antecedentRain3dMm,
    antecedent7d: day.antecedentRain7dMm,
    antecedent30d: day.antecedentRain30dMm,
    riskLevel: "Unrated",
    // Per-day provenance: a gauge day says so rather than crediting Open-Meteo.
    rainSource: day.rainfallSource === "gauge" ? "local-gauge" : day.provider,
    qualityStatus:
      day.waterLevelM === null
        ? "observed-rain/wl-unavailable"
        : "observed-rain/derived-wl",
    split: "live",
    origin: "live",
  }));

  const all = [...series.map(readingFromRow), ...liveReadings];
  const filtered = all
    .filter(
      (row) => (!start || row.isoDate >= start) && (!end || row.isoDate <= end),
    )
    .slice(-limit);

  if (filtered.length === 0) {
    return NextResponse.json(
      {
        error: `No records for ${locationName} between ${start ?? "the first row"} and ${end ?? "the last row"}.`,
        available:
          all.length > 0
            ? { dateMin: all[0].isoDate, dateMax: all[all.length - 1].isoDate }
            : null,
        datasetUnavailable: datasetError,
      },
      { status: 404 },
    );
  }

  const liveInWindow = filtered.filter((row) => row.origin === "live");
  const note = liveInWindow.length
    ? `${liveInWindow.length} day${liveInWindow.length === 1 ? "" : "s"} after ${datasetMax} come from stored Open-Meteo runs, not from the dataset; the water-level proxy there is the dataset's own formula, calibrated on its history.`
    : null;

  return NextResponse.json({
    dataset: dataset ? DATASET_LABEL : "Open-Meteo stored observations",
    datasetMeta: dataset?.meta ?? null,
    datasetUnavailable: datasetError,
    location: locationName,
    mode: "daily",
    dateMin: filtered[0].isoDate,
    dateMax: filtered[filtered.length - 1].isoDate,
    datasetDateMax: datasetMax,
    liveDays: liveInWindow.length,
    liveRange: liveInWindow.length
      ? {
          min: liveInWindow[0].isoDate,
          max: liveInWindow[liveInWindow.length - 1].isoDate,
        }
      : null,
    waterLevelDatumM: derivation.waterLevelDatumM,
    note,
    readings: filtered,
  });
}
