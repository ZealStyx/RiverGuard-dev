/**
 * Single read path for `data/daily_observations.csv` (RiverGuard NCR Dataset v2).
 *
 * This is the only module that knows the CSV's column names. Everything the UI
 * shows as an observation — rainfall, water level, antecedent sums, soil
 * moisture, provenance, quality flags — comes through here or through the route
 * handlers that call it. No component may hold its own sample numbers.
 *
 * The file is 3.6 MB and is parsed once per server process, then cached by
 * mtime so a regenerated dataset is picked up without a restart.
 *
 * Column semantics are documented in `data/README.md`. Two matter for honesty:
 *   - `WaterLevel_m` is a rainfall-driven *derived proxy*, never a gauge reading.
 *   - `Rainfall_mm` switches provenance at 2025-11-15 (synthetic → real ERA5),
 *     and each row says which via `RainSource`.
 */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { LOCATION_CODES, type LocationCode } from "./locations";

export const DATASET_LABEL = "RiverGuard NCR Dataset v2";
export const DATASET_FILE = "data/daily_observations.csv";

/** One parsed row, typed and narrowed. */
export interface ObservationRow {
  date: string;
  location: string;
  locationCode: LocationCode | null;
  stationId: string;
  latitude: number | null;
  longitude: number | null;
  elevationM: number | null;
  rainfallMm: number | null;
  tmaxC: number | null;
  tminC: number | null;
  et0Mm: number | null;
  soilMoisturePct: number | null;
  antecedentRain3dMm: number | null;
  antecedentRain7dMm: number | null;
  antecedentRain30dMm: number | null;
  waterLevelM: number | null;
  waterLevelChange24hM: number | null;
  floodOccurrence: number | null;
  riskLevel: string;
  rainSource: string;
  split: string;
  dataSource: string;
  qualityStatus: string;
  notes: string;
}

export interface DatasetMeta {
  label: string;
  file: string;
  rows: number;
  locations: string[];
  dateMin: string;
  dateMax: string;
  /** Real ERA5 reanalysis rain begins here; everything earlier is synthetic. */
  realRainFrom: string | null;
  rainSources: string[];
}

interface Dataset {
  meta: DatasetMeta;
  rows: ObservationRow[];
  /** Rows grouped by location name, ascending by date. */
  byLocation: Map<string, ObservationRow[]>;
  /** Monthly rainfall totals per location, ascending. */
  monthly: Map<
    string,
    Array<{ month: string; rainfallMm: number; floodDays: number }>
  >;
}

const CSV_PATH_CANDIDATES = [
  path.join(process.cwd(), "data", "daily_observations.csv"),
  path.join(process.cwd(), "..", "..", "data", "daily_observations.csv"),
  path.join(process.cwd(), "..", "data", "daily_observations.csv"),
];

let cache: { dataset: Dataset; stamp: number; file: string } | null = null;

function num(value: string | undefined): number | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** RFC 4180 parser: handles quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.length > 0));
}

function normaliseLocation(value: string): LocationCode | null {
  const slug = value.trim().toLowerCase().replace(/\s+/g, "-");
  return (LOCATION_CODES as string[]).includes(slug)
    ? (slug as LocationCode)
    : null;
}

function toRow(header: string[], cells: string[]): ObservationRow {
  const get = (name: string) => {
    const position = header.indexOf(name);
    return position === -1 ? undefined : cells[position];
  };
  const location = (get("Location") ?? "").trim();
  return {
    date: (get("Date") ?? "").trim(),
    location,
    locationCode: normaliseLocation(location),
    stationId: (get("Station_ID") ?? "").trim(),
    latitude: num(get("Latitude")),
    longitude: num(get("Longitude")),
    elevationM: num(get("Elevation_m")),
    rainfallMm: num(get("Rainfall_mm")),
    tmaxC: num(get("Tmax_C")),
    tminC: num(get("Tmin_C")),
    et0Mm: num(get("ET0_mm")),
    soilMoisturePct: num(get("SoilMoisture_pct")),
    antecedentRain3dMm: num(get("AntecedentRain_3d_mm")),
    antecedentRain7dMm: num(get("AntecedentRain_7d_mm")),
    antecedentRain30dMm: num(get("AntecedentRain_30d_mm")),
    waterLevelM: num(get("WaterLevel_m")),
    waterLevelChange24hM: num(get("WaterLevel_Change_24h_m")),
    floodOccurrence: num(get("FloodOccurrence")),
    riskLevel: (get("RiskLevel") ?? "").trim(),
    rainSource: (get("RainSource") ?? "").trim(),
    split: (get("Split") ?? "").trim(),
    dataSource: (get("DataSource") ?? "").trim(),
    qualityStatus: (get("QualityStatus") ?? "").trim(),
    notes: (get("Notes") ?? "").trim(),
  };
}

function buildDataset(rows: ObservationRow[], file: string): Dataset {
  const byLocation = new Map<string, ObservationRow[]>();
  for (const row of rows) {
    const bucket = byLocation.get(row.location);
    if (bucket) bucket.push(row);
    else byLocation.set(row.location, [row]);
  }
  for (const bucket of byLocation.values()) {
    bucket.sort((left, right) => left.date.localeCompare(right.date));
  }

  const monthly = new Map<
    string,
    Array<{ month: string; rainfallMm: number; floodDays: number }>
  >();
  for (const [location, bucket] of byLocation) {
    const totals = new Map<string, { rainfallMm: number; floodDays: number }>();
    for (const row of bucket) {
      const month = row.date.slice(0, 7);
      const entry = totals.get(month) ?? { rainfallMm: 0, floodDays: 0 };
      entry.rainfallMm += row.rainfallMm ?? 0;
      if ((row.floodOccurrence ?? 0) >= 1) entry.floodDays += 1;
      totals.set(month, entry);
    }
    monthly.set(
      location,
      [...totals.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([month, entry]) => ({
          month,
          rainfallMm: Math.round(entry.rainfallMm * 10) / 10,
          floodDays: entry.floodDays,
        })),
    );
  }

  const dates = rows.map((row) => row.date).sort();
  const sources = [...new Set(rows.map((row) => row.rainSource))].filter(
    Boolean,
  );
  const era5 = rows
    // Continuous real reanalysis only. `ERA5-anchor` marks two isolated rows
    // inside the synthetic era (the 2020 Ulysses event), so including it here
    // would date the provenance switch to 2020 and mislabel ten years of data.
    .filter((row) => row.rainSource === "ERA5-reanalysis")
    .map((row) => row.date)
    .sort();

  return {
    meta: {
      label: DATASET_LABEL,
      file,
      rows: rows.length,
      locations: [...byLocation.keys()].sort(),
      dateMin: dates[0] ?? "",
      dateMax: dates[dates.length - 1] ?? "",
      realRainFrom: era5[0] ?? null,
      rainSources: sources.sort(),
    },
    rows,
    byLocation,
    monthly,
  };
}

async function resolvePath(): Promise<string | null> {
  for (const candidate of CSV_PATH_CANDIDATES) {
    try {
      const info = await stat(/*turbopackIgnore: true*/ candidate);
      if (info.isFile()) return candidate;
    } catch {
      // Try the next layout.
    }
  }
  return null;
}

/**
 * Load and memoise the dataset. Throws `DatasetUnavailableError` when the CSV is
 * missing, which route handlers translate into a 503 rather than empty charts.
 */
export async function loadDataset(): Promise<Dataset> {
  const file = await resolvePath();
  if (!file) {
    throw new DatasetUnavailableError(
      `No ${DATASET_FILE} found. Run the repository from its root or regenerate it with data/generate_dataset.py.`,
    );
  }
  const info = await stat(/*turbopackIgnore: true*/ file);
  if (cache && cache.file === file && cache.stamp === info.mtimeMs) {
    return cache.dataset;
  }
  // Runtime input, not a bundle asset: exclude it from static tracing.
  const text = await readFile(/*turbopackIgnore: true*/ file, "utf8");
  const [header, ...body] = parseCsv(text);
  if (!header || body.length === 0) {
    throw new DatasetUnavailableError(
      `${DATASET_FILE} is empty or missing a header.`,
    );
  }
  // Report the repository-relative path, never the absolute one: this value is
  // rendered in the UI and should not leak the deployment's filesystem layout.
  const dataset = buildDataset(
    body.map((cells) => toRow(header, cells)),
    DATASET_FILE,
  );
  cache = { dataset, stamp: info.mtimeMs, file };
  return dataset;
}

export class DatasetUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatasetUnavailableError";
  }
}

/** Look up a location's series by city label ("Marikina") or slug ("marikina"). */
export function seriesFor(
  dataset: Dataset,
  location: string,
): ObservationRow[] {
  if (dataset.byLocation.has(location)) {
    return dataset.byLocation.get(location) ?? [];
  }
  const code = normaliseLocation(location);
  if (code) {
    const name = LOCATION_CODES.includes(code)
      ? code.replace(/(^|-)([a-z])/g, (_, sep, char) =>
          sep ? ` ${char.toUpperCase()}` : char.toUpperCase(),
        )
      : "";
    for (const [key, bucket] of dataset.byLocation) {
      if (key.toLowerCase().replace(/\s+/g, "-") === code) return bucket;
    }
    if (name && dataset.byLocation.has(name))
      return dataset.byLocation.get(name) ?? [];
  }
  return [];
}

/** The most recent row for a location, or null when nothing matches. */
export function latestObservation(
  dataset: Dataset,
  location: string,
): ObservationRow | null {
  const series = seriesFor(dataset, location);
  return series.length ? series[series.length - 1] : null;
}

export function monthlySeries(
  dataset: Dataset,
  location: string,
): Array<{ month: string; rainfallMm: number; floodDays: number }> {
  const series = seriesFor(dataset, location);
  if (!series.length) return [];
  const key = series[0].location;
  return dataset.monthly.get(key) ?? [];
}

/**
 * Daily climatology per calendar month, from the real historical rows.
 * Used only as an explicitly labelled baseline when no live forecast exists —
 * never presented as a weather forecast.
 */
export function monthlyClimatology(
  dataset: Dataset,
  location: string,
): Array<{
  month: number;
  meanDailyRainfallMm: number;
  wetDayProbability: number;
}> {
  const series = seriesFor(dataset, location);
  const buckets = new Map<
    number,
    { total: number; wet: number; days: number }
  >();
  for (const row of series) {
    const month = Number(row.date.slice(5, 7));
    if (!Number.isFinite(month) || row.rainfallMm === null) continue;
    const entry = buckets.get(month) ?? { total: 0, wet: 0, days: 0 };
    entry.total += row.rainfallMm;
    entry.days += 1;
    if (row.rainfallMm >= 1) entry.wet += 1;
    buckets.set(month, entry);
  }
  return [...buckets.entries()]
    .sort(([left], [right]) => left - right)
    .map(([month, entry]) => ({
      month,
      meanDailyRainfallMm: Math.round((entry.total / entry.days) * 100) / 100,
      wetDayProbability: Math.round((entry.wet / entry.days) * 1000) / 1000,
    }));
}

export type { Dataset };
