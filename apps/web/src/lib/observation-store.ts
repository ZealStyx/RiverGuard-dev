/**
 * Store for the observed days a real weather run brought back.
 *
 * Why it exists: `data/daily_observations.csv` is a generated snapshot that ends
 * on a fixed date, so the history chart froze there while every forecast run was
 * already fetching a live ~31-day window from Open-Meteo. Those rows were thrown
 * away with the HTTP response. This module keeps them, so the chart can carry on
 * past the dataset's last row with data that a run actually retrieved.
 *
 * Two backends, one call, chosen exactly like run persistence
 * (`lib/forecast-persistence.ts`):
 *
 *   - **Convex** (`observedWeather` table) when `NEXT_PUBLIC_CONVEX_URL` is set —
 *     the shared deployment, so days survive this machine and every client sees
 *     them. Written through `observations:recordWindow`.
 *   - **A local JSON file** (`.data/observations.json`) when no deployment is
 *     configured, so the chart still works on a machine with none.
 *
 * The deployment wins when it exists: nothing is written to the file once Convex
 * is configured, so there is one source of truth at a time. Both keep one record
 * per (location, date) and a later run upserts that key rather than appending a
 * duplicate. File writes are serialised and atomic (temp file + rename), and a
 * corrupt file is treated as empty and reported, never thrown at a forecast.
 *
 * What is deliberately absent: no fixture rows (an illustrative run must not
 * become history), no forecast days (those belong to the run that produced them,
 * in the run store), and no GloFAS discharge (context only, never stored). No
 * water level either: the proxy is derived at read time from the dataset's own
 * formula, so what is stored stays exactly what the provider reported.
 *
 * Server-only: `node:fs` and the Convex HTTP client are imported here and
 * nowhere in the browser bundle.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { ConvexHttpClient } from "convex/browser";

import {
  convexErrorHint,
  convexFunctions,
  convexUrl,
  type RemoteObservationRow,
} from "./convex-functions";
import type { WeatherBundle } from "./weather/types";

const STORE_VERSION = 1;
/** Days kept per city. 120 covers a season without turning the file into a dataset. */
const MAX_DAYS_PER_LOCATION = 120;
/** Hard ceiling across all four cities. */
const MAX_DAYS = 480;

export interface StoredObservationDay {
  locationCode: string;
  locationName: string;
  /** Calendar date in the location's timezone, ISO `YYYY-MM-DD`. */
  date: string;
  rainfallMm: number;
  tmaxC: number;
  tminC: number;
  et0Mm: number | null;
  soilMoisturePercent: number | null;
  soilMoistureSource: "open-meteo" | "water-balance-bucket";
  /** `gauge` only when a local gauge file replaced this day's rainfall. */
  rainfallSource: "provider" | "gauge";
  /** Which provider the numbers came from, e.g. `open-meteo`. */
  provider: string;
  /** When the provider was queried, ISO 8601. */
  retrievedAt: string;
  /** When this record was written, epoch milliseconds. */
  recordedAt: number;
}

interface StoreFile {
  version: number;
  days: StoredObservationDay[];
}

/** Where observed days are written: the deployment, or this machine. */
export type ObservationBackend = "convex" | "file";

export interface ObservationStoreStatus {
  /** False when no run has written anything yet; that is a supported state. */
  configured: boolean;
  backend: ObservationBackend;
  /**
   * Human label for where the rows live — `Convex deployment · table
   * observedWeather`, or the JSON file's path. Shown in provider configuration.
   */
  store: string;
  days: number;
  /** Why the store could not be read, when it exists but is unusable. */
  error: string | null;
}

const CONVEX_STORE_LABEL = "Convex deployment · table observedWeather";

/** The deployment when one is configured, otherwise this machine's file. */
export function observationBackend(): ObservationBackend {
  return convexUrl ? "convex" : "file";
}

/**
 * `<repo>/.data/observations.json`.
 *
 * `next dev` runs with `apps/web` as its working directory, so the store walks
 * back up to the repository root. `OBSERVATION_STORE_PATH` overrides it.
 */
function storePath(): string {
  const override = process.env.OBSERVATION_STORE_PATH?.trim();
  if (override) return path.resolve(override);

  const cwd = process.cwd();
  const repoRoot =
    path.basename(cwd) === "web" && path.basename(path.dirname(cwd)) === "apps"
      ? path.resolve(cwd, "..", "..")
      : cwd;
  return path.join(repoRoot, ".data", "observations.json");
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

function isRecord(value: unknown): value is StoredObservationDay {
  if (typeof value !== "object" || value === null) return false;
  const day = value as Record<string, unknown>;
  return (
    typeof day.locationCode === "string" &&
    typeof day.date === "string" &&
    typeof day.rainfallMm === "number" &&
    typeof day.recordedAt === "number"
  );
}

async function readStore(): Promise<{
  store: StoreFile;
  error: string | null;
}> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (!parsed || !Array.isArray(parsed.days)) {
      throw new Error("missing days array");
    }
    const days = parsed.days.filter(isRecord);
    const dropped = parsed.days.length - days.length;
    return {
      store: { version: STORE_VERSION, days },
      // A row missing its keys is ignored, not fatal, but silently shrinking the
      // store would hide a bad writer, so the count is surfaced.
      error:
        dropped > 0
          ? `${dropped} stored observation row${dropped === 1 ? "" : "s"} were unreadable and ignored.`
          : null,
    };
  } catch (error) {
    if (isMissingFile(error)) {
      return { store: { version: STORE_VERSION, days: [] }, error: null };
    }
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn(
      `[observation-store] ignoring unreadable ${storePath()}: ${message}`,
    );
    return {
      store: { version: STORE_VERSION, days: [] },
      error: `The observation store could not be read (${message}).`,
    };
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  const target = storePath();
  await mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(temp, target);
}

// One writer at a time: two concurrent forecasts must not clobber each other.
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(work, work);
  writeQueue = next.catch(() => undefined);
  return next;
}

function capPerLocation(days: StoredObservationDay[]): StoredObservationDay[] {
  const byCode = new Map<string, StoredObservationDay[]>();
  for (const day of days) {
    const bucket = byCode.get(day.locationCode) ?? [];
    bucket.push(day);
    byCode.set(day.locationCode, bucket);
  }

  const kept: StoredObservationDay[] = [];
  for (const bucket of byCode.values()) {
    bucket.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    kept.push(...bucket.slice(0, MAX_DAYS_PER_LOCATION));
  }
  kept.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return kept.slice(0, MAX_DAYS);
}

export interface RecordObservationsResult {
  written: number;
  /** Set when the run was not stored on purpose. */
  skipped: "degraded" | "no-history" | null;
  error: string | null;
  /** Which store answered; `null` only when the run was skipped on purpose. */
  backend: ObservationBackend | null;
}

/**
 * Upsert one run's observed window.
 *
 * A degraded (offline fixture) bundle is refused: those numbers are illustrative
 * and would make the chart look live. The caller reports the skip rather than
 * hiding it.
 */
export async function recordObservations(
  bundle: WeatherBundle,
): Promise<RecordObservationsResult> {
  if (bundle.degraded || bundle.provider === "fixture") {
    return { written: 0, skipped: "degraded", error: null, backend: null };
  }
  if (bundle.history.length === 0) {
    return { written: 0, skipped: "no-history", error: null, backend: null };
  }

  const retrievedAt = Date.parse(bundle.retrievedAt);
  const retrievedAtMs = Number.isFinite(retrievedAt) ? retrievedAt : Date.now();

  // A configured deployment is the source of truth: write there and nowhere
  // else, so the chart never has to choose between two copies of the same day.
  if (convexUrl) {
    try {
      const client = new ConvexHttpClient(convexUrl);
      const result = await client.mutation(
        convexFunctions.recordObservationWindow,
        {
          locationCode: bundle.location.code,
          locationName: bundle.location.name,
          provider: bundle.provider,
          degraded: bundle.degraded,
          retrievedAt: retrievedAtMs,
          days: bundle.history.map((day) => ({
            date: day.date,
            rainfallMm: day.rainfallMm,
            tmaxC: day.tmaxC ?? undefined,
            tminC: day.tminC ?? undefined,
            et0Mm: day.et0Mm ?? undefined,
            soilMoisturePercent: day.soilMoisturePercent ?? undefined,
            soilMoistureSource: bundle.observed.soilMoistureSource,
            rainfallSource:
              day.rainfallSource === "gauge" ? "gauge" : "provider",
          })),
        },
      );
      return {
        written: result.written,
        skipped: null,
        error: null,
        backend: "convex",
      };
    } catch (error) {
      return {
        written: 0,
        skipped: null,
        error: `The observed window was not written to the deployment (${
          error instanceof Error ? convexErrorHint(error) : "unknown error"
        }).`,
        backend: "convex",
      };
    }
  }

  const recordedAt = Date.now();
  const fresh: StoredObservationDay[] = bundle.history.map((day) => ({
    locationCode: bundle.location.code,
    locationName: bundle.location.name,
    date: day.date,
    rainfallMm: day.rainfallMm,
    tmaxC: day.tmaxC,
    tminC: day.tminC,
    et0Mm: day.et0Mm,
    soilMoisturePercent: day.soilMoisturePercent ?? null,
    soilMoistureSource: bundle.observed.soilMoistureSource,
    rainfallSource: day.rainfallSource === "gauge" ? "gauge" : "provider",
    provider: bundle.provider,
    retrievedAt: bundle.retrievedAt,
    recordedAt,
  }));

  try {
    const written = await enqueue(async () => {
      const { store } = await readStore();
      const key = (day: StoredObservationDay) =>
        `${day.locationCode}:${day.date}`;
      const replacement = new Map(fresh.map((day) => [key(day), day]));
      const kept = store.days.filter((day) => !replacement.has(key(day)));
      const next = capPerLocation([...replacement.values(), ...kept]);
      await writeStore({ version: STORE_VERSION, days: next });
      return fresh.length;
    });
    return { written, skipped: null, error: null, backend: "file" };
  } catch (error) {
    return {
      written: 0,
      skipped: null,
      error:
        error instanceof Error
          ? `The observation store could not be written (${error.message}).`
          : "The observation store could not be written.",
      backend: "file",
    };
  }
}

/**
 * Stored days for one city, oldest first.
 *
 * `since` bounds the read (inclusive) so a chart asking for a fortnight does not
 * pull a season's worth of rows through the derivation.
 */
export async function listObservations(
  locationCode: string,
  options?: { limit?: number; since?: string },
): Promise<StoredObservationDay[]> {
  if (convexUrl) {
    try {
      const client = new ConvexHttpClient(convexUrl);
      const rows = await client.query(convexFunctions.listObservationWindow, {
        locationCode,
        fromDate: options?.since,
        limit: options?.limit ?? 90,
      });
      return rows.map(toStoredDay);
    } catch (error) {
      // A read failure must not take the chart down with it: the dataset rows
      // still render, and the caller notices there are no stored days.
      console.warn(
        `[observation-store] could not read observed days from the deployment: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
      return [];
    }
  }

  const { store } = await readStore();
  const rows = store.days
    .filter((day) => day.locationCode === locationCode)
    .filter((day) => !options?.since || day.date >= options.since)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const limit = options?.limit;
  return typeof limit === "number" ? rows.slice(-Math.max(limit, 1)) : rows;
}

/** One deployment row in the shape the rest of the app reads. */
function toStoredDay(row: RemoteObservationRow): StoredObservationDay {
  return {
    locationCode: row.locationCode,
    locationName: row.locationName,
    date: row.date,
    rainfallMm: row.rainfallMm,
    tmaxC: row.tmaxC ?? 0,
    tminC: row.tminC ?? 0,
    et0Mm: row.et0Mm ?? null,
    soilMoisturePercent: row.soilMoisturePercent ?? null,
    soilMoistureSource:
      row.soilMoistureSource === "water-balance-bucket"
        ? "water-balance-bucket"
        : "open-meteo",
    rainfallSource: row.rainfallSource === "gauge" ? "gauge" : "provider",
    provider: row.provider,
    retrievedAt: new Date(row.retrievedAt).toISOString(),
    recordedAt: row.recordedAt,
  };
}

export async function observationStoreStatus(): Promise<ObservationStoreStatus> {
  if (convexUrl) {
    try {
      const client = new ConvexHttpClient(convexUrl);
      const remote = await client.query(convexFunctions.observationStatus, {});
      return {
        configured: remote.days > 0,
        backend: "convex",
        store: CONVEX_STORE_LABEL,
        days: remote.days,
        error: null,
      };
    } catch (error) {
      return {
        configured: false,
        backend: "convex",
        store: CONVEX_STORE_LABEL,
        days: 0,
        error: `The deployment could not be read (${
          error instanceof Error ? convexErrorHint(error) : "unknown error"
        }).`,
      };
    }
  }

  const { store, error } = await readStore();
  return {
    configured: store.days.length > 0,
    backend: "file",
    store: storePath(),
    days: store.days.length,
    error,
  };
}
