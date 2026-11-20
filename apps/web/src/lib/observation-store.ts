/**
 * Stored observations, read and written from the server.
 *
 * Convex is the store (see `convex/observedWeather.ts`). Everything here is
 * best-effort: the history route falls back to the bundled dataset when the
 * deployment is absent or unhappy, so a storage problem degrades the chart
 * instead of failing it.
 *
 * The table's shape is the deployment's, not ours — `locationCode`/`date`/`provider`
 * rather than the shorter names the route thinks in — so the translation lives
 * here, in one place, and the route never sees a field name it does not use.
 *
 * The deployment caps a single mutation around 8 MB, so writes are batched by
 * day count rather than sent as one range.
 */

import { ConvexHttpClient } from "convex/browser";

import {
  convexErrorHint,
  convexFunctions,
  convexUrl,
  type StoredObservedDay,
} from "./convex-functions";
import type { ObservedDay } from "./weather/observed";

/** Days per mutation. A day row is a few hundred bytes, so this stays well clear. */
const WRITE_BATCH = 400;

/** Which provider row `convex/observedWeather.ts` should record. */
const PROVIDER_CODE = "open-meteo";
const RAINFALL_SOURCE = "provider";

/**
 * The shared secret the deployment expects on the ingest mutation.
 *
 * Server-side only: `RIVERGUARD_INGEST_SECRET` is deliberately not a
 * `NEXT_PUBLIC_` value, so it never reaches the browser bundle. Unset means the
 * deployment cannot be written to — the read path still works, because the
 * history route treats storage as best effort.
 */
function ingestSecret(): string | undefined {
  const value = process.env.RIVERGUARD_INGEST_SECRET;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function observationStoreEnabled(): boolean {
  return Boolean(convexUrl);
}

/** True when writes are possible: a deployment and the ingest secret. */
export function observationStoreWritable(): boolean {
  return Boolean(convexUrl) && ingestSecret() !== undefined;
}

function client(): ConvexHttpClient {
  if (!convexUrl) throw new Error("Convex is not configured");
  return new ConvexHttpClient(convexUrl);
}

/** Stored days for the window, or `null` when the store could not be read. */
export async function readStoredObservedDays(
  locationCode: string,
  start: string,
  end: string,
): Promise<StoredObservedDay[] | null> {
  if (!convexUrl) return null;
  try {
    return await client().query(convexFunctions.observedRange, {
      locationCode,
      start,
      end,
    });
  } catch {
    return null;
  }
}

/**
 * A stored row in the shape the rest of the app uses. The label falls back to
 * the provider code for rows the older pipeline wrote, which predate
 * `sourceLabel`.
 */
export function storedToObservedDay(row: StoredObservedDay): ObservedDay {
  return {
    isoDate: row.date,
    rainfallMm: row.rainfallMm,
    tmaxC: row.tmaxC,
    tminC: row.tminC,
    et0Mm: row.et0Mm,
    source: row.sourceLabel ?? row.provider,
  };
}

export interface StoreWriteResult {
  stored: number;
  error?: string;
}

/**
 * Write days to the store. Returns the number written, which is also the number
 * the caller may now treat as persisted.
 */
export async function saveObservedDays(
  locationCode: string,
  locationName: string,
  days: ObservedDay[],
): Promise<StoreWriteResult> {
  if (!convexUrl || days.length === 0) return { stored: 0 };

  const secret = ingestSecret();
  if (secret === undefined) {
    // Fail closed, and say so: the deployment refuses unauthenticated writes,
    // so the caller must not report these days as persisted.
    return {
      stored: 0,
      error:
        "RIVERGUARD_INGEST_SECRET is not set in this server environment, so observations were not stored.",
    };
  }
  const retrievedAt = Date.now();
  let stored = 0;
  try {
    const deployment = client();
    for (let index = 0; index < days.length; index += WRITE_BATCH) {
      const batch = days.slice(index, index + WRITE_BATCH).map((day) => ({
        date: day.isoDate,
        rainfallMm: day.rainfallMm,
        tmaxC: day.tmaxC,
        tminC: day.tminC,
        et0Mm: day.et0Mm,
        provider: PROVIDER_CODE,
        rainfallSource: RAINFALL_SOURCE,
        sourceLabel: day.source,
        retrievedAt,
      }));
      await deployment.mutation(convexFunctions.saveObservedDays, {
        locationCode,
        locationName,
        days: batch,
        secret,
      });
      stored += batch.length;
    }
    return { stored };
  } catch (error) {
    return {
      stored,
      error:
        error instanceof Error
          ? convexErrorHint(error)
          : "unknown Convex error",
    };
  }
}
