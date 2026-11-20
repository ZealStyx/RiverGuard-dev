import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  elevatedRole,
  cityCode,
  alertStatusValidator,
  dataQualityValidator,
  hazardLayerKindValidator,
  lguReviewStatusValidator,
  modelStatusValidator,
  modelTypeValidator,
  riskLevelValidator,
  userRoleValidator,
  userRoleProfileValidator,
  userStatusValidator,
} from "./validators";

export default defineSchema({
  locations: defineTable({
    cityCode: v.string(),
    name: v.string(),
    locationType: v.literal("city"),
    latitude: v.number(),
    longitude: v.number(),
    timezone: v.string(),
    coverageStatus: v.union(v.literal("supported"), v.literal("unavailable")),
    source: v.string(),
    updatedAt: v.number(),
  })
    .index("by_city_code", ["cityCode"])
    .index("by_coverage_status", ["coverageStatus", "name"]),

  users: defineTable({
    externalId: v.optional(v.string()),
    email: v.string(),
    displayName: v.string(),
    role: userRoleValidator,
    additionalRoles: v.optional(v.array(userRoleValidator)),
    status: v.optional(userStatusValidator),
    roleProfile: v.optional(userRoleProfileValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_email", ["email"]),

  roleRequests: defineTable({
    userId: v.id("users"),
    role: elevatedRole,
    profile: userRoleProfileValidator,
    initial: v.boolean(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    reviewer: v.optional(v.id("users")),
    decidedAt: v.optional(v.number()),
    location: v.optional(cityCode),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),
  invitations: defineTable({
    mailStatus: v.optional(
      v.union(v.literal("queued"), v.literal("sent"), v.literal("failed")),
    ),
    email: v.string(),
    role: userRoleValidator,
    location: v.optional(cityCode),
    sender: v.id("users"),
    expiresAt: v.number(),
    acceptedBy: v.optional(v.id("users")),
  }).index("by_email", ["email"]),
  accessEvents: defineTable({
    actor: v.id("users"),
    subject: v.string(),
    action: v.string(),
    role: userRoleValidator,
    location: v.optional(cityCode),
  }),
  lguProfiles: defineTable({
    userId: v.id("users"),
    cityCode: v.string(),
    assignedLocationCodes: v.optional(v.array(v.string())),
    organization: v.string(),
    position: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_city", ["cityCode"]),

  stations: defineTable({
    code: v.string(),
    name: v.string(),
    cityCode: v.string(),
    riverName: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    waterLevelUnit: v.literal("m"),
    rainfallUnit: v.literal("mm"),
    timezone: v.string(),
    source: v.string(),
    sourceUrl: v.optional(v.string()),
    active: v.boolean(),
    lastObservedAt: v.optional(v.number()),
    qualityStatus: dataQualityValidator,
  })
    .index("by_code", ["code"])
    .index("by_city_name", ["cityCode", "name"])
    .index("by_active_name", ["active", "name"]),

  sensorReadings: defineTable({
    stationId: v.id("stations"),
    locationCode: v.optional(v.string()),
    observedAt: v.number(),
    ingestedAt: v.number(),
    rainfallMm: v.optional(v.number()),
    waterLevelM: v.optional(v.number()),
    soilMoisturePercent: v.optional(v.number()),
    antecedentRain3dMm: v.optional(v.number()),
    antecedentRain7dMm: v.optional(v.number()),
    antecedentRain30dMm: v.optional(v.number()),
    floodOccurrence: v.optional(v.boolean()),
    riskLabel: v.optional(v.string()),
    rainSource: v.optional(v.string()),
    datasetId: v.optional(v.string()),
    split: v.optional(v.string()),
    source: v.string(),
    sourceRecordId: v.optional(v.string()),
    qualityStatus: dataQualityValidator,
    qualityFlags: v.array(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_station_observed_at", ["stationId", "observedAt"])
    .index("by_location_observed_at", ["locationCode", "observedAt"])
    .index("by_source_record", ["source", "sourceRecordId"])
    .index("by_ingested_at", ["ingestedAt"]),

  modelVersions: defineTable({
    name: v.string(),
    version: v.string(),
    modelType: modelTypeValidator,
    featureSchemaVersion: v.string(),
    status: modelStatusValidator,
    trainedAt: v.optional(v.number()),
    createdAt: v.number(),
    metrics: v.optional(v.any()),
    limitations: v.array(v.string()),
  })
    .index("by_name_version", ["name", "version"])
    .index("by_type_created_at", ["modelType", "createdAt"]),

  forecastRuns: defineTable({
    requestedBy: v.optional(v.id("users")),
    requestedAt: v.number(),
    completedAt: v.optional(v.number()),
    provider: v.string(),
    retrievedAt: v.number(),
    status: v.union(
      v.literal("requested"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    errorCode: v.optional(v.string()),
  }).index("by_requested_at", ["requestedAt"]),

  forecasts: defineTable({
    runId: v.id("forecastRuns"),
    locationCode: v.string(),
    issuedAt: v.number(),
    validAt: v.number(),
    horizonHours: v.number(),
    rainfallMm: v.optional(v.number()),
    predictedWaterLevelM: v.optional(v.number()),
    modelVersionId: v.optional(v.id("modelVersions")),
    inputFreshnessAt: v.optional(v.number()),
    qualityStatus: dataQualityValidator,
    qualityFlags: v.array(v.string()),
  })
    .index("by_run_valid_at", ["runId", "validAt"])
    .index("by_location_valid_at", ["locationCode", "validAt"]),

  riskAssessments: defineTable({
    forecastId: v.optional(v.id("forecasts")),
    locationCode: v.string(),
    assessedAt: v.number(),
    validAt: v.number(),
    riskLevel: riskLevelValidator,
    probability: v.optional(v.number()),
    modelVersionId: v.optional(v.id("modelVersions")),
    featureSchemaVersion: v.optional(v.string()),
    contributionSummary: v.optional(v.any()),
    qualityStatus: dataQualityValidator,
    limitations: v.array(v.string()),
  })
    .index("by_location_valid_at", ["locationCode", "validAt"])
    .index("by_forecast", ["forecastId"]),

  alerts: defineTable({
    locationCode: v.string(),
    riskAssessmentId: v.optional(v.id("riskAssessments")),
    status: alertStatusValidator,
    severity: riskLevelValidator,
    title: v.string(),
    message: v.string(),
    createdAt: v.number(),
    acknowledgedAt: v.optional(v.number()),
    acknowledgedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_location_created_at", ["locationCode", "createdAt"])
    .index("by_status_created_at", ["status", "createdAt"]),

  lguReviews: defineTable({
    runId: v.id("forecastRuns"),
    reviewerId: v.id("users"),
    locationCode: v.string(),
    status: lguReviewStatusValidator,
    notes: v.string(),
    reviewedAt: v.number(),
  })
    .index("by_run", ["runId"])
    .index("by_location_reviewed_at", ["locationCode", "reviewedAt"]),

  hazardLayers: defineTable({
    slug: v.string(),
    name: v.string(),
    kind: hazardLayerKindValidator,
    localAssetPath: v.string(),
    coverage: v.string(),
    attribution: v.string(),
    license: v.string(),
    active: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_active_kind", ["active", "kind"]),

  floodEvents: defineTable({
    eventDate: v.string(),
    name: v.string(),
    area: v.string(),
    rainfallMm: v.optional(v.number()),
    duration: v.optional(v.string()),
    marikinaPeakM: v.optional(v.number()),
    impact: v.string(),
    notes: v.optional(v.string()),
    source: v.string(),
    datasetId: v.optional(v.string()),
  })
    .index("by_event_date", ["eventDate"])
    .index("by_dataset_event", ["datasetId", "eventDate"]),

  /**
   * The observed weather a location actually had, one row per location and day.
   *
   * This is the table the deployment already holds: it was created by the
   * observed-window work that `POST /api/forecast` wrote through
   * `observations:recordWindow`, and a schema push validates those existing
   * documents, so the shape below is theirs, not a new one. `date` is the key
   * (an Asia/Manila calendar day) and `observedAt` mirrors `sensorReadings` for
   * time-range queries.
   *
   * `/api/historical` reads the days that are already here and asks Open-Meteo
   * only for the gaps and for today/yesterday, then writes those back through
   * `observedWeather:upsertDays` — so the chart is the stored past plus the
   * present, and a revisit costs no provider calls.
   *
   * Rainfall is the provider's value; nothing here is modelled. Water level is
   * deliberately absent: the dataset's level is a rainfall-derived proxy, and
   * extrapolating it would present an invented number as a gauge reading.
   */
  observedWeather: defineTable({
    locationCode: v.string(),
    locationName: v.string(),
    date: v.string(),
    observedAt: v.number(),
    rainfallMm: v.number(),
    tmaxC: v.optional(v.number()),
    tminC: v.optional(v.number()),
    et0Mm: v.optional(v.number()),
    soilMoisturePercent: v.optional(v.number()),
    soilMoistureSource: v.optional(v.string()),
    /** `gauge` when a local gauge file supplied that day's rainfall. */
    rainfallSource: v.optional(v.string()),
    /** Which provider the numbers came from, e.g. `open-meteo`. */
    provider: v.string(),
    /**
     * Human label for the surface behind `provider`, e.g.
     * "Open-Meteo (ERA5 / IFS)". Optional: rows written before this field
     * existed fall back to `provider` when the UI names the source.
     */
    sourceLabel: v.optional(v.string()),
    /** When the provider was queried, epoch milliseconds. */
    retrievedAt: v.number(),
    /** When this row was written, epoch milliseconds. */
    recordedAt: v.number(),
  })
    .index("by_location_date", ["locationCode", "date"])
    .index("by_date", ["date"]),

  historicalImports: defineTable({
    datasetId: v.string(),
    datasetVersion: v.string(),
    sourceFile: v.string(),
    sourceSha256: v.string(),
    rowCount: v.number(),
    importedRows: v.number(),
    dateMin: v.string(),
    dateMax: v.string(),
    status: v.union(
      v.literal("validated"),
      v.literal("importing"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    updatedAt: v.number(),
  }).index("by_dataset_id", ["datasetId"]),
});
