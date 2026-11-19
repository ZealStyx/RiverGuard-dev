/**
 * Stored observations, read and written from the server.
 *
 * Convex is the store (see `convex/observedWeather.ts`). Everything here is
 * best-effort: the history route falls back to the bundled dataset when the
 * deployment is absent or unhappy, so a storage problem degrades the chart
 * instead of failing it.
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

export function observationStoreEnabled(): boolean {
  return Boolean(convexUrl);
}

function client(): ConvexHttpClient {
  if (!convexUrl) throw new Error("Convex is not configured");
  return new ConvexHttpClient(convexUrl);
}

/** Stored days for the window, or `null` when the store could not be read. */
export async function readStoredObservedDays(
  cityCode: string,
  start: string,
  end: string,
): Promise<StoredObservedDay[] | null> {
  if (!convexUrl) return null;
  try {
    return await client().query(convexFunctions.observedRange, {
      cityCode,
      start,
      end,
    });
  } catch {
    return null;
  }
}

export interface StoreWriteResult {
  stored: number;
  error?: string;
}

/**
 * Write days the store does not already have. Returns the number written, which
 * is also the number the caller may now treat as persisted.
 */
export async function saveObservedDays(
  cityCode: string,
  days: ObservedDay[],
): Promise<StoreWriteResult> {
  if (!convexUrl || days.length === 0) return { stored: 0 };
  let stored = 0;
  try {
    const deployment = client();
    for (let index = 0; index < days.length; index += WRITE_BATCH) {
      const batch = days.slice(index, index + WRITE_BATCH);
      await deployment.mutation(convexFunctions.saveObservedDays, {
        cityCode,
        days: batch,
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

/** Which of `dates` the stored rows do not cover. */
export function missingDates(
  dates: string[],
  stored: StoredObservedDay[] | null,
): string[] {
  if (!stored) return [];
  const have = new Set(stored.map((row) => row.isoDate));
  return dates.filter((date) => !have.has(date));
}
