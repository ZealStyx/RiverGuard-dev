/**
 * Stored observed weather: the past the history chart draws on.
 *
 * `/api/historical` reads the days already in this table and asks Open-Meteo
 * only for the gaps and for today/yesterday, then writes those back here. A
 * second visit therefore costs no provider calls, and a day that has been
 * recorded once keeps its values even if the provider later revises them.
 *
 * The row shape is the deployment's existing one (see `schema.ts`), so the days
 * written by the earlier `observations:recordWindow` pipeline are readable here
 * rather than orphaned — `date` is the key, and `landfall`-style fields that
 * pipeline stored (soil moisture, `rainfallSource`) are left untouched by an
 * upsert that only patches rainfall and temperature.
 *
 * Only provider values are written. Water level is not: the dataset's level is a
 * rainfall-derived proxy, so extending it to live days would invent a gauge
 * reading rather than report one.
 */

import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { assertIngestAuthorized } from "./ingest";

/** The shape a caller writes; `observedAt` is derived from `date` here. */
const observedDayValidator = v.object({
  date: v.string(),
  rainfallMm: v.number(),
  tmaxC: v.optional(v.number()),
  tminC: v.optional(v.number()),
  et0Mm: v.optional(v.number()),
  provider: v.string(),
  rainfallSource: v.optional(v.string()),
  sourceLabel: v.optional(v.string()),
  retrievedAt: v.number(),
});

/** Asia/Manila is UTC+8 all year — no DST to account for. */
function observedAtFor(date: string): number {
  return Date.parse(`${date}T00:00:00+08:00`);
}

export const listRange = query({
  args: {
    locationCode: v.string(),
    start: v.string(),
    end: v.string(),
  },
  handler: async (ctx, { locationCode, start, end }) => {
    const rows = await ctx.db
      .query("observedWeather")
      .withIndex("by_location_date", (index) =>
        index
          .eq("locationCode", locationCode)
          .gte("date", start)
          .lte("date", end),
      )
      .collect();

    return rows
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((row) => ({
        date: row.date,
        observedAt: row.observedAt,
        rainfallMm: row.rainfallMm,
        tmaxC: row.tmaxC,
        tminC: row.tminC,
        et0Mm: row.et0Mm,
        soilMoisturePercent: row.soilMoisturePercent,
        provider: row.provider,
        rainfallSource: row.rainfallSource,
        sourceLabel: row.sourceLabel,
        retrievedAt: row.retrievedAt,
        recordedAt: row.recordedAt,
      }));
  },
});

export const upsertDays = mutation({
  args: {
    locationCode: v.string(),
    locationName: v.string(),
    days: v.array(observedDayValidator),
    /**
     * Server-to-server proof. `/api/historical` reads it from
     * `RIVERGUARD_INGEST_SECRET`; a signed-in administrator may omit it.
     */
    secret: v.optional(v.string()),
  },
  handler: async (ctx, { locationCode, locationName, days, secret }) => {
    await assertIngestAuthorized(ctx, secret);

    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    for (const day of days) {
      const existing = await ctx.db
        .query("observedWeather")
        .withIndex("by_location_date", (index) =>
          index.eq("locationCode", locationCode).eq("date", day.date),
        )
        .first();

      // `patch` merges, so a row written by the older pipeline keeps its soil
      // moisture and gauge provenance while its rainfall is refreshed.
      const fields = {
        ...day,
        observedAt: observedAtFor(day.date),
        locationName,
        recordedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, fields);
        updated += 1;
      } else {
        await ctx.db.insert("observedWeather", { locationCode, ...fields });
        inserted += 1;
      }
    }

    return { inserted, updated };
  },
});
