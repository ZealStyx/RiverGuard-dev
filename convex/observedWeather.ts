/**
 * Stored daily observations.
 *
 * `/api/historical` fetches any day it does not already have from Open-Meteo,
 * writes it here, then serves the merged range. Reads are keyed by city and
 * date so a second visit costs no network calls at all.
 *
 * Only provider values are stored. Water level is not written: the dataset's
 * level is a rainfall-derived proxy, so extending it to live days would be
 * inventing a gauge reading rather than reporting one.
 */

import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const observedDayValidator = v.object({
  isoDate: v.string(),
  rainfallMm: v.number(),
  tmaxC: v.optional(v.number()),
  tminC: v.optional(v.number()),
  et0Mm: v.optional(v.number()),
  source: v.string(),
});

export const listRange = query({
  args: { cityCode: v.string(), end: v.string(), start: v.string() },
  handler: async (ctx, { cityCode, start, end }) => {
    const rows = await ctx.db
      .query("observedWeather")
      .withIndex("by_city_date", (index) =>
        index
          .eq("cityCode", cityCode)
          .gte("isoDate", start)
          .lte("isoDate", end),
      )
      .collect();

    return rows
      .sort((left, right) => left.isoDate.localeCompare(right.isoDate))
      .map((row) => ({
        isoDate: row.isoDate,
        rainfallMm: row.rainfallMm,
        tmaxC: row.tmaxC,
        tminC: row.tminC,
        et0Mm: row.et0Mm,
        source: row.source,
        fetchedAt: row.fetchedAt,
      }));
  },
});

export const upsertDays = mutation({
  args: { cityCode: v.string(), days: v.array(observedDayValidator) },
  handler: async (ctx, { cityCode, days }) => {
    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    for (const day of days) {
      const existing = await ctx.db
        .query("observedWeather")
        .withIndex("by_city_date", (index) =>
          index.eq("cityCode", cityCode).eq("isoDate", day.isoDate),
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, { ...day, fetchedAt: now });
        updated += 1;
      } else {
        await ctx.db.insert("observedWeather", {
          cityCode,
          ...day,
          fetchedAt: now,
        });
        inserted += 1;
      }
    }

    return { inserted, updated };
  },
});
