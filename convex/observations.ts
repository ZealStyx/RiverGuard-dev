/**
 * Observed days a real forecast run retrieved, kept in the deployment.
 *
 * `data/daily_observations.csv` is a generated snapshot with a fixed end date,
 * so the history chart needs somewhere to keep the live ~31-day window every
 * forecast run fetches. This module is that store in the database: one row per
 * (location, day), upserted by the run that retrieved it, read back by
 * `GET /api/historical` and extended by the dataset generator's own derivation.
 *
 * Deliberately narrow:
 *   - only observed days, never forecast days (those belong to `forecasts`);
 *   - never the offline fixture (illustrative numbers must not become history);
 *   - no water level is written here. The proxy is derived at read time from the
 *     dataset's formula, so this table stays a faithful copy of what the
 *     provider reported.
 */

import {
  mutationGeneric as mutation,
  queryGeneric as query,
} from "convex/server";
import { v } from "convex/values";

/** One provider day, as the web route sends it. */
const observedDayValidator = v.object({
  date: v.string(),
  rainfallMm: v.number(),
  tmaxC: v.optional(v.number()),
  tminC: v.optional(v.number()),
  et0Mm: v.optional(v.number()),
  soilMoisturePercent: v.optional(v.number()),
  soilMoistureSource: v.optional(v.string()),
  /** `provider` or `gauge`. */
  rainfallSource: v.optional(v.string()),
});

/** Calendar day at Asia/Manila midnight, the same instant `sensorReadings` uses. */
function toObservedAt(date: string) {
  const observedAt = Date.parse(`${date}T00:00:00+08:00`);
  if (!Number.isFinite(observedAt)) {
    throw new Error(`Invalid observation date: ${date}`);
  }
  return observedAt;
}

/**
 * Upsert one run's observed window.
 *
 * Re-sending a date updates that row instead of inserting a duplicate, so the
 * table grows by at most one row per location per day no matter how often
 * forecasts run. The window cap matches the web store's: a provider window is
 * about a month, and 120 days is already generous.
 */
export const recordWindow = mutation({
  args: {
    locationCode: v.string(),
    locationName: v.string(),
    provider: v.string(),
    /** Refused when true: degraded numbers are illustrative, not observed. */
    degraded: v.boolean(),
    retrievedAt: v.number(),
    days: v.array(observedDayValidator),
  },
  returns: v.object({
    written: v.number(),
    created: v.number(),
    updated: v.number(),
  }),
  handler: async (ctx, args) => {
    if (args.degraded || args.provider === "fixture") {
      throw new Error(
        "Degraded or fixture weather cannot be stored as observed history",
      );
    }
    if (args.days.length === 0 || args.days.length > 120) {
      throw new Error("Observed windows must contain 1 to 120 days");
    }

    const now = Date.now();
    const retrievedAt = Number.isFinite(args.retrievedAt)
      ? args.retrievedAt
      : now;
    let created = 0;
    let updated = 0;

    for (const day of args.days) {
      const existing = await ctx.db
        .query("observedWeather")
        .withIndex("by_location_date", (index) =>
          // queryGeneric keeps this runnable before Convex generates
          // schema-specific server types on the first `convex dev` run.
          (index as any)
            .eq("locationCode", args.locationCode)
            .eq("date", day.date),
        )
        .unique();

      const payload = {
        locationCode: args.locationCode,
        locationName: args.locationName,
        date: day.date,
        observedAt: toObservedAt(day.date),
        rainfallMm: day.rainfallMm,
        tmaxC: day.tmaxC,
        tminC: day.tminC,
        et0Mm: day.et0Mm,
        soilMoisturePercent: day.soilMoisturePercent,
        soilMoistureSource: day.soilMoistureSource,
        rainfallSource: day.rainfallSource,
        provider: args.provider,
        retrievedAt,
        recordedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
        updated += 1;
      } else {
        await ctx.db.insert("observedWeather", payload);
        created += 1;
      }
    }

    return { written: args.days.length, created, updated };
  },
});

/**
 * Days for one city, oldest first.
 *
 * `fromDate` is how the route asks for "only what the dataset does not already
 * cover"; `limit` bounds the read because a deployment keeps every day it has
 * ever been given, while the chart shows a window.
 */
export const listWindow = query({
  args: {
    locationCode: v.string(),
    fromDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.trunc(args.limit ?? 90), 1), 365);
    return await ctx.db
      .query("observedWeather")
      .withIndex("by_location_date", (index) => {
        const range = (index as any).eq("locationCode", args.locationCode);
        return args.fromDate ? range.gte("date", args.fromDate) : range;
      })
      .order("asc")
      .take(limit);
  },
});

/** What the deployment holds, for `/api/system` and the provider screen. */
export const status = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    // Bounded read: one row per location per day, so this covers years of runs.
    const rows = await ctx.db.query("observedWeather").take(600);
    if (rows.length === 0) {
      return { days: 0, dateMin: null, dateMax: null, truncated: false };
    }
    const dates = rows.map((row) => row.date).sort();
    return {
      days: rows.length,
      dateMin: dates[0],
      dateMax: dates[dates.length - 1],
      truncated: rows.length >= 600,
    };
  },
});
