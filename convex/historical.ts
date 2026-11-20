import {
  mutationGeneric as mutation,
  queryGeneric as query,
} from "convex/server";
import { v } from "convex/values";

import { assertIngestAuthorized } from "./ingest";

const historicalRecordValidator = v.object({
  date: v.string(),
  locationCode: v.string(),
  locationName: v.string(),
  stationCode: v.string(),
  stationName: v.string(),
  riverName: v.optional(v.string()),
  latitude: v.number(),
  longitude: v.number(),
  elevationM: v.number(),
  rainfallMm: v.optional(v.number()),
  waterLevelM: v.optional(v.number()),
  soilMoisturePercent: v.optional(v.number()),
  antecedentRain3dMm: v.optional(v.number()),
  antecedentRain7dMm: v.optional(v.number()),
  antecedentRain30dMm: v.optional(v.number()),
  floodOccurrence: v.optional(v.boolean()),
  riskLabel: v.optional(v.string()),
  rainSource: v.optional(v.string()),
  split: v.optional(v.string()),
  dataSource: v.string(),
  qualityStatus: v.union(
    v.literal("verified"),
    v.literal("provisional"),
    v.literal("unverified"),
    v.literal("missing"),
  ),
  notes: v.optional(v.string()),
});

const floodEventValidator = v.object({
  eventDate: v.string(),
  name: v.string(),
  area: v.string(),
  rainfallMm: v.optional(v.number()),
  duration: v.optional(v.string()),
  marikinaPeakM: v.optional(v.number()),
  impact: v.string(),
  notes: v.optional(v.string()),
});

function toObservedAt(date: string) {
  const observedAt = Date.parse(`${date}T00:00:00+08:00`);
  if (!Number.isFinite(observedAt)) {
    throw new Error(`Invalid historical observation date: ${date}`);
  }
  return observedAt;
}

export const upsertBatch = mutation({
  args: {
    datasetId: v.string(),
    datasetVersion: v.string(),
    sourceFile: v.string(),
    sourceSha256: v.string(),
    rowCount: v.number(),
    dateMin: v.string(),
    dateMax: v.string(),
    records: v.array(historicalRecordValidator),
    /** Server-to-server proof; see `convex/ingest.ts`. */
    secret: v.optional(v.string()),
  },
  returns: v.object({
    inserted: v.number(),
    updated: v.number(),
    processed: v.number(),
  }),
  handler: async (ctx, args) => {
    await assertIngestAuthorized(ctx, args.secret);

    if (args.records.length === 0 || args.records.length > 250) {
      throw new Error(
        "Historical import batches must contain 1 to 250 records",
      );
    }

    const now = Date.now();
    const existingImport = await ctx.db
      .query("historicalImports")
      .withIndex("by_dataset_id", (index) =>
        index.eq("datasetId", args.datasetId),
      )
      .unique();

    const importId = existingImport
      ? existingImport._id
      : await ctx.db.insert("historicalImports", {
          datasetId: args.datasetId,
          datasetVersion: args.datasetVersion,
          sourceFile: args.sourceFile,
          sourceSha256: args.sourceSha256,
          rowCount: args.rowCount,
          importedRows: 0,
          dateMin: args.dateMin,
          dateMax: args.dateMax,
          status: "importing",
          updatedAt: now,
        });

    let inserted = 0;
    let updated = 0;

    for (const record of args.records) {
      const location = await ctx.db
        .query("locations")
        .withIndex("by_city_code", (index) =>
          index.eq("cityCode", record.locationCode),
        )
        .unique();
      if (location) {
        await ctx.db.patch(location._id, {
          name: record.locationName,
          latitude: record.latitude,
          longitude: record.longitude,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("locations", {
          cityCode: record.locationCode,
          name: record.locationName,
          locationType: "city",
          latitude: record.latitude,
          longitude: record.longitude,
          timezone: "Asia/Manila",
          coverageStatus: "supported",
          source: args.datasetId,
          updatedAt: now,
        });
      }

      const station = await ctx.db
        .query("stations")
        .withIndex("by_code", (index) => index.eq("code", record.stationCode))
        .unique();
      const stationId = station
        ? station._id
        : await ctx.db.insert("stations", {
            code: record.stationCode,
            name: record.stationName,
            cityCode: record.locationCode,
            riverName: record.riverName,
            latitude: record.latitude,
            longitude: record.longitude,
            waterLevelUnit: "m",
            rainfallUnit: "mm",
            timezone: "Asia/Manila",
            source: record.dataSource,
            active: true,
            lastObservedAt: toObservedAt(record.date),
            qualityStatus: record.qualityStatus,
          });

      if (station) {
        await ctx.db.patch(station._id, {
          name: record.stationName,
          cityCode: record.locationCode,
          riverName: record.riverName,
          latitude: record.latitude,
          longitude: record.longitude,
          lastObservedAt: toObservedAt(record.date),
          qualityStatus: record.qualityStatus,
        });
      }

      const sourceRecordId = `${record.date}:${record.locationCode}`;
      const existingReading = await ctx.db
        .query("sensorReadings")
        .withIndex("by_source_record", (index) =>
          (index as any)
            .eq("source", args.datasetId)
            .eq("sourceRecordId", sourceRecordId),
        )
        .unique();
      const reading = {
        stationId,
        locationCode: record.locationCode,
        observedAt: toObservedAt(record.date),
        ingestedAt: now,
        rainfallMm: record.rainfallMm,
        waterLevelM: record.waterLevelM,
        soilMoisturePercent: record.soilMoisturePercent,
        antecedentRain3dMm: record.antecedentRain3dMm,
        antecedentRain7dMm: record.antecedentRain7dMm,
        antecedentRain30dMm: record.antecedentRain30dMm,
        floodOccurrence: record.floodOccurrence,
        riskLabel: record.riskLabel,
        rainSource: record.rainSource,
        datasetId: args.datasetId,
        split: record.split,
        source: args.datasetId,
        sourceRecordId,
        qualityStatus: record.qualityStatus,
        qualityFlags: [record.rainSource ?? "unknown-rain-source"],
        notes: record.notes,
      };

      if (existingReading) {
        await ctx.db.patch(existingReading._id, reading);
        updated += 1;
      } else {
        await ctx.db.insert("sensorReadings", reading);
        inserted += 1;
      }
    }

    const importedRows = Math.min(
      args.rowCount,
      (existingImport?.importedRows ?? 0) + args.records.length,
    );
    await ctx.db.patch(importId, {
      importedRows,
      status: importedRows >= args.rowCount ? "complete" : "importing",
      updatedAt: now,
    });

    return { inserted, updated, processed: args.records.length };
  },
});

export const getImportStatus = query({
  args: { datasetId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) =>
    await ctx.db
      .query("historicalImports")
      .withIndex("by_dataset_id", (index) =>
        index.eq("datasetId", args.datasetId),
      )
      .unique(),
});

export const upsertFloodEvents = mutation({
  args: {
    datasetId: v.string(),
    source: v.string(),
    events: v.array(floodEventValidator),
    /** Server-to-server proof; see `convex/ingest.ts`. */
    secret: v.optional(v.string()),
  },
  returns: v.object({ inserted: v.number(), updated: v.number() }),
  handler: async (ctx, args) => {
    await assertIngestAuthorized(ctx, args.secret);

    let inserted = 0;
    let updated = 0;
    for (const event of args.events) {
      const existing = await ctx.db
        .query("floodEvents")
        .withIndex("by_dataset_event", (index) =>
          (index as any)
            .eq("datasetId", args.datasetId)
            .eq("eventDate", event.eventDate),
        )
        .unique();
      const payload = {
        ...event,
        source: args.source,
        datasetId: args.datasetId,
      };
      if (existing) {
        await ctx.db.patch(existing._id, payload);
        updated += 1;
      } else {
        await ctx.db.insert("floodEvents", payload);
        inserted += 1;
      }
    }
    return { inserted, updated };
  },
});

export const listForLocation = query({
  args: {
    locationCode: v.string(),
    startAt: v.number(),
    endAt: v.number(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.startAt > args.endAt) {
      throw new Error("startAt must be earlier than or equal to endAt");
    }

    const limit = Math.min(Math.max(Math.trunc(args.limit ?? 100), 1), 500);
    return await ctx.db
      .query("sensorReadings")
      .withIndex("by_location_observed_at", (index) =>
        (index as any)
          .eq("locationCode", args.locationCode)
          .gte("observedAt", args.startAt)
          .lte("observedAt", args.endAt),
      )
      .order("asc")
      .take(limit);
  },
});
