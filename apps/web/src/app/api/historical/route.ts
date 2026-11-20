/**
 * GET /api/historical
 *
 * Observed daily rows for a window. Two sources, one response:
 *
 *   - **Live.** Open-Meteo is asked for the requested window, and whatever it
 *     returns is written to Convex (`convex/observedWeather.ts`) before being
 *     served. Days already in the store are not fetched again, so a revisit is
 *     free. This is what keeps the history chart current — the bundled dataset
 *     stops at its last row and could never do that on its own.
 *   - **Dataset.** `data/daily_observations.csv`, read through `@/lib/dataset`,
 *     remains the fallback when there is no deployment or the provider is
 *     unreachable, and it is still the only source of water level: that column
 *     is a rainfall-derived proxy, so live days carry rainfall only. Nothing
 *     here invents a gauge reading.
 *
 *   ?location=Marikina   city name or slug (required)
 *   ?start=2026-11-01    inclusive ISO date (optional, defaults to the window end
 *                        minus `limit` days)
 *   ?end=2026-11-14      inclusive ISO date (optional, defaults to today)
 *   ?limit=14            max rows, default 30, max 3650
 *   ?mode=daily|monthly  aggregate view (default daily; monthly is dataset-only)
 */

import { NextResponse } from "next/server";

import { authorizeApiRequest } from "@/lib/api-auth";

import {
  DATASET_LABEL,
  DatasetUnavailableError,
  loadDataset,
  monthlySeries,
  seriesFor,
  type Dataset,
} from "@/lib/dataset";
import { LOCATIONS, type LocationConfig } from "@/lib/locations";
import {
  observationStoreEnabled,
  readStoredObservedDays,
  saveObservedDays,
  storedToObservedDay,
} from "@/lib/observation-store";
import type { HistoricalReading } from "@/types";
import {
  addDays,
  daysBetween,
  fetchObservedRange,
  type ObservedDay,
} from "@/lib/weather/observed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Longest window a single request will try to build, in days. */
const MAX_WINDOW_DAYS = 3650;

function resolveLocation(raw: string): LocationConfig | null {
  const slug = raw.trim().toLowerCase().replace(/\s+/g, "-");
  return (
    Object.values(LOCATIONS).find(
      (entry) =>
        entry.code === slug ||
        entry.name.toLowerCase() === raw.trim().toLowerCase(),
    ) ?? null
  );
}

function friendlyName(location: string): string | null {
  return resolveLocation(location)?.name ?? null;
}

/** Today's date where the data lives, not where the server happens to run. */
function todayInManila(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dateLabel(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(`${isoDate}T00:00:00+08:00`));
}

function eachDate(start: string, end: string): string[] {
  const dates: string[] = [];
  const span = daysBetween(start, end);
  if (span < 0) return dates;
  for (let offset = 0; offset <= span; offset += 1) {
    dates.push(addDays(start, offset));
  }
  return dates;
}

function rollingSum(
  days: ObservedDay[],
  index: number,
  window: number,
): number | null {
  const from = Math.max(0, index - window + 1);
  const slice = days.slice(from, index + 1);
  if (slice.length < window) return null;
  const total = slice.reduce((sum, day) => sum + day.rainfallMm, 0);
  return Math.round(total * 10) / 10;
}

interface LiveWindow {
  readings: HistoricalReading[];
  /** Days in the window the provider has not published yet. */
  pending: string[];
  /** True when some rows carry rainfall but no water level. */
  partialLevels: boolean;
  stored: number;
  storeError?: string;
  providerError?: string;
}

/**
 * Build the window from the store, filling anything missing from Open-Meteo
 * first. Returns `null` only when there is no store to talk to; otherwise the
 * result says what happened, including an empty window with the reason, so the
 * caller can fall back to the dataset and say why.
 */
async function buildLiveWindow({
  allowWrites,
  dataset,
  end,
  location,
  start,
  today,
}: {
  /**
   * Whether this request may store what it fetched. Reads are open — the chart
   * is public information — but writes are not, so an unauthenticated GET gets
   * served and changes nothing.
   */
  allowWrites: boolean;
  dataset: Dataset | null;
  end: string;
  location: LocationConfig;
  start: string;
  today: string;
}): Promise<LiveWindow | null> {
  if (!observationStoreEnabled()) return null;

  const stored = await readStoredObservedDays(location.code, start, end);
  let storeError: string | undefined =
    stored === null
      ? "the Convex store could not be read (check NEXT_PUBLIC_CONVEX_URL and that `npx convex deploy` has pushed the current convex/ directory)"
      : undefined;

  // The past comes from the store: every day already recorded is drawn as it was
  // recorded, and is not asked for again.
  const days = new Map<string, ObservedDay>();
  // Soil moisture has no home on the route's day shape; keep the stored values so
  // a day past the dataset's last row can still show what was recorded for it.
  const storedSoilMoisture = new Map<string, number>();
  for (const row of stored ?? []) {
    days.set(row.date, storedToObservedDay(row));
    if (typeof row.soilMoisturePercent === "number") {
      storedSoilMoisture.set(row.date, row.soilMoisturePercent);
    }
  }
  const storedDays = days.size;

  let providerError: string | undefined;

  // Nothing has been observed in the future; asking for it wastes a round trip.
  const wanted = eachDate(start, end > today ? today : end);
  const missing = wanted.filter((date) => !days.has(date));
  const settled = new Set([...days.keys()]);

  // Today's total is still accumulating and yesterday's can be revised, so both
  // are re-read even when the store already has them. Everything older is kept:
  // re-fetching a settled day would only spend a round trip.
  const stale = [today, addDays(today, -1)].filter(
    (date) => date >= start && date <= (end > today ? today : end),
  );

  const revised = new Set(stale);
  const toFetch = [...new Set([...missing, ...stale])].sort();

  if (toFetch.length > 0) {
    try {
      const fetched = await fetchObservedRange({
        end: toFetch[toFetch.length - 1],
        latitude: location.latitude,
        longitude: location.longitude,
        start: toFetch[0],
        today,
      });
      // The present: the provider fills the gaps and refreshes today and
      // yesterday, which are still accumulating or still open to revision. A
      // settled day the store already has keeps its stored value — the provider
      // answers for the whole range it was asked about, and taking its version
      // of an older day would quietly overwrite what was recorded at the time.
      const accepted = fetched.filter(
        (day) => !settled.has(day.isoDate) || revised.has(day.isoDate),
      );
      for (const day of accepted) days.set(day.isoDate, day);
      if (accepted.length > 0) {
        if (allowWrites) {
          const write = await saveObservedDays(
            location.code,
            location.name,
            accepted,
          );
          storeError = write.error ?? storeError;
        } else {
          // Say it rather than pretend: a caller that is not signed in gets the
          // days for this response and no persistence.
          storeError =
            "this request was not authenticated, so the fetched days were served but not stored";
        }
      }
    } catch (error) {
      providerError =
        error instanceof Error ? error.message : "Open-Meteo is unavailable";
    }
  }

  if (days.size === 0) {
    return {
      readings: [],
      pending: [],
      partialLevels: false,
      stored: storedDays,
      storeError,
      providerError,
    };
  }

  const datasetRows = dataset
    ? new Map(seriesFor(dataset, location.name).map((row) => [row.date, row]))
    : new Map<string, ReturnType<typeof seriesFor>[number]>();

  const ordered = [...days.values()].sort((left, right) =>
    left.isoDate.localeCompare(right.isoDate),
  );

  let partialLevels = false;

  const readings = ordered.map((day, index) => {
    // Water level and antecedent sums stay with the dataset while it covers the
    // date. Beyond its last row the level is left null rather than extrapolated;
    // antecedent rainfall is a straight sum of observed days, so it survives.
    const known = datasetRows.get(day.isoDate);
    if (!known) partialLevels = true;
    return {
      isoDate: day.isoDate,
      date: dateLabel(day.isoDate),
      rainfall: day.rainfallMm,
      waterLevel: known?.waterLevelM ?? null,
      waterLevelChange24h: known?.waterLevelChange24hM ?? null,
      soilMoisture:
        known?.soilMoisturePct ?? storedSoilMoisture.get(day.isoDate) ?? null,
      antecedent3d: known?.antecedentRain3dMm ?? rollingSum(ordered, index, 3),
      antecedent7d: known?.antecedentRain7dMm ?? rollingSum(ordered, index, 7),
      antecedent30d:
        known?.antecedentRain30dMm ?? rollingSum(ordered, index, 30),
      floodOccurrence: known?.floodOccurrence ?? null,
      riskLevel: known?.riskLevel ?? undefined,
      rainSource: day.source,
      qualityStatus: known ? "observed" : "observed-live",
      split: known?.split ?? undefined,
      stationId: known?.stationId ?? undefined,
    } satisfies HistoricalReading;
  });

  const pending = eachDate(
    addDays(ordered[ordered.length - 1].isoDate, 1),
    end > today ? today : end,
  );

  return {
    readings,
    pending,
    partialLevels,
    stored: stored?.length ?? 0,
    storeError,
    providerError,
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
    MAX_WINDOW_DAYS,
  );

  const resolved = resolveLocation(rawLocation);
  const locationName =
    resolved?.name ?? friendlyName(rawLocation) ?? rawLocation;
  const today = todayInManila();

  let dataset: Dataset | null = null;
  let datasetError: unknown = null;
  try {
    dataset = await loadDataset();
  } catch (error) {
    datasetError = error;
  }

  if (mode === "monthly") {
    if (!dataset) {
      return NextResponse.json(
        {
          error:
            datasetError instanceof DatasetUnavailableError
              ? datasetError.message
              : "The historical dataset could not be read.",
        },
        { status: 503 },
      );
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

  // The live window: the requested range, or the last `limit` days up to today.
  const windowEnd = end ?? today;
  const windowStart = start ?? addDays(windowEnd, -(limit - 1));

  // Reads are public; the write that `buildLiveWindow` performs is not.
  const auth = await authorizeApiRequest(request);

  let live: LiveWindow | null = null;
  if (resolved && daysBetween(windowStart, windowEnd) >= 0) {
    live = await buildLiveWindow({
      allowWrites: auth.authorized,
      dataset,
      end: windowEnd,
      location: resolved,
      start: windowStart,
      today,
    });

    if (live && live.readings.length > 0) {
      const oldest = live.readings[0].isoDate;
      const newest = live.readings[live.readings.length - 1].isoDate;
      const notes: string[] = [];
      if (live.pending.length > 0) {
        notes.push(
          `${live.pending.length} day${live.pending.length === 1 ? "" : "s"} after ${newest} ${
            live.pending.length === 1 ? "is" : "are"
          } not published by Open-Meteo yet.`,
        );
      }
      if (live.partialLevels) {
        notes.push(
          "Days after the dataset's last row carry observed rainfall only — water level is a rainfall-derived proxy and is not extrapolated.",
        );
      }
      if (live.providerError) {
        notes.push(`Open-Meteo could not be reached: ${live.providerError}`);
      }
      if (live.storeError) {
        notes.push(`These days were not stored: ${live.storeError}`);
      }

      return NextResponse.json({
        dataset: "Open-Meteo observed",
        datasetMeta: dataset?.meta ?? null,
        location: locationName,
        mode: "daily",
        source: "live",
        storedDays: live.stored,
        dateMin: oldest,
        dateMax: newest,
        notes,
        readings: live.readings,
      });
    }
  }

  // Fallback: the bundled dataset. If a store was configured but nothing could be
  // refreshed, say so rather than silently serving rows that stop at the dataset's
  // last date — the exact failure the live window exists to fix.
  const fallbackNotes: string[] = [];
  if (resolved && observationStoreEnabled()) {
    const reason =
      live?.providerError ??
      live?.storeError ??
      "the store returned no days for this window";
    fallbackNotes.push(
      `Showing the bundled dataset, which stops at its last row: ${reason}.`,
    );
  }

  if (!dataset) {
    if (datasetError instanceof DatasetUnavailableError) {
      return NextResponse.json(
        { error: datasetError.message },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: "The historical dataset could not be read.",
        detail:
          datasetError instanceof Error
            ? datasetError.message
            : "unknown error",
      },
      { status: 500 },
    );
  }

  const series = seriesFor(dataset, locationName);
  if (series.length === 0) {
    return NextResponse.json(
      { error: `No records are available for ${locationName}.` },
      { status: 404 },
    );
  }

  const filtered = series
    .filter((row) => (!start || row.date >= start) && (!end || row.date <= end))
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
    source: "dataset",
    dateMin: filtered[0].date,
    dateMax: filtered[filtered.length - 1].date,
    notes: fallbackNotes,
    readings: filtered.map((row) => ({
      isoDate: row.date,
      date: dateLabel(row.date),
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
}
