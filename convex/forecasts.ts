/**
 * Forecast persistence: one mutation per run, one query for the dashboard.
 *
 * Written with the generic builders (`mutationGeneric` / `queryGeneric`) so the
 * project type-checks before a deployment has generated schema-specific
 * helpers, matching the convention already used in convex/historical.ts.
 *
 * Who calls this: the local Next route handler (`/api/forecast`) through a
 * ConvexHttpClient. Convex cannot call the developer's machine, so the write
 * direction is always local -> cloud.
 */

import {
  internalMutationGeneric as internalMutation,
  mutationGeneric as mutation,
  queryGeneric as query,
} from "convex/server";
import { v } from "convex/values";

import { raiseAlertIfElevated, resolveSupersededAlerts } from "./alerts";
import { requireCurrentUser, requireRole } from "./auth";
import {
  assertLocationAccess,
  assignedLocationCodes,
  normalizeLocationCode,
} from "./lgu";

const forecastDayValidator = v.object({
  date: v.string(),
  horizonDays: v.number(),
  rainfallMm: v.number(),
  probability: v.number(),
  waterLevelM: v.number(),
  riskLevel: v.union(
    v.literal("lower"),
    v.literal("moderate"),
    v.literal("elevated"),
    v.literal("unavailable"),
  ),
  alertLevel: v.union(
    v.literal("none"),
    v.literal("first"),
    v.literal("second"),
    v.literal("third"),
  ),
  exceedsOperatingThreshold: v.boolean(),
  reasons: v.array(v.string()),
});

/** Find or create the modelVersions row for this export, so runs are traceable. */
async function resolveModelVersionId(
  ctx: any,
  input: {
    modelName: string;
    modelVersion: string;
    featureSchemaVersion: string;
    operatingThreshold: number;
    warning: string;
  },
) {
  const existing = await ctx.db
    .query("modelVersions")
    .withIndex("by_name_version", (index: any) =>
      index.eq("name", input.modelName).eq("version", input.modelVersion),
    )
    .first();
  if (existing) return existing._id as string;

  return await ctx.db.insert("modelVersions", {
    name: input.modelName,
    version: input.modelVersion,
    modelType: "flood_risk",
    featureSchemaVersion: input.featureSchemaVersion,
    status: "development",
    createdAt: Date.now(),
    metrics: {
      operatingThreshold: input.operatingThreshold,
      note: "Test model trained on derived targets; metrics validate the pipeline only.",
    },
    limitations: [input.warning],
  });
}

export const recordOutlook = mutation({
  args: {
    locationCode: v.string(),
    locationName: v.string(),
    issueDate: v.string(),
    provider: v.string(),
    providerDegraded: v.boolean(),
    retrievedAt: v.number(),
    modelName: v.string(),
    modelVersion: v.string(),
    featureSchemaVersion: v.string(),
    operatingThreshold: v.number(),
    warning: v.string(),
    days: v.array(forecastDayValidator),
  },
  returns: v.object({
    runId: v.string(),
    forecasts: v.number(),
    assessments: v.number(),
    alerts: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin", "lgu", "researcher"]);
    await assertLocationAccess(ctx, user, args.locationCode, ["researcher"]);
    if (args.days.length === 0) {
      throw new Error("recordOutlook requires at least one forecast day");
    }

    const now = Date.now();
    const modelVersionId = await resolveModelVersionId(ctx, {
      modelName: args.modelName,
      modelVersion: args.modelVersion,
      featureSchemaVersion: args.featureSchemaVersion,
      operatingThreshold: args.operatingThreshold,
      warning: args.warning,
    });

    const runId = await ctx.db.insert("forecastRuns", {
      requestedBy: user._id,
      requestedAt: now,
      completedAt: now,
      provider: args.provider,
      retrievedAt: args.retrievedAt,
      status: "completed",
    });

    const qualityStatus = args.providerDegraded ? "unverified" : "provisional";
    const qualityFlags = args.providerDegraded
      ? ["degraded-weather-source"]
      : [];

    let alerts = 0;
    for (const day of args.days) {
      const validAt = Date.parse(`${day.date}T00:00:00+08:00`);
      if (!Number.isFinite(validAt)) {
        throw new Error(`Invalid forecast date: ${day.date}`);
      }

      const forecastId = await ctx.db.insert("forecasts", {
        runId,
        locationCode: args.locationCode,
        issuedAt: Date.parse(`${args.issueDate}T00:00:00+08:00`),
        validAt,
        horizonHours: day.horizonDays * 24,
        rainfallMm: day.rainfallMm,
        predictedWaterLevelM: day.waterLevelM,
        modelVersionId,
        inputFreshnessAt: args.retrievedAt,
        qualityStatus,
        qualityFlags,
      });

      const assessmentId = await ctx.db.insert("riskAssessments", {
        forecastId,
        locationCode: args.locationCode,
        assessedAt: now,
        validAt,
        riskLevel: day.riskLevel,
        probability: day.probability,
        modelVersionId,
        featureSchemaVersion: args.featureSchemaVersion,
        contributionSummary: {
          alertLevel: day.alertLevel,
          exceedsOperatingThreshold: day.exceedsOperatingThreshold,
          reasons: day.reasons,
        },
        qualityStatus,
        limitations: [args.warning],
      });

      // One alert per elevated day, and only when nothing open already covers it.
      if (day.riskLevel === "elevated") {
        const raised = await raiseAlertIfElevated(ctx, {
          locationCode: args.locationCode,
          locationName: args.locationName,
          riskAssessmentId: assessmentId,
          validAt,
          severity: day.riskLevel,
          probability: day.probability,
          waterLevelM: day.waterLevelM,
          alertLevel: day.alertLevel,
          reasons: day.reasons,
        });
        if (raised) alerts += 1;
      }
    }

    // A new completed run supersedes alerts for earlier runs of any location.
    await resolveSupersededAlerts(ctx, args.locationCode, runId);

    return {
      runId,
      forecasts: args.days.length,
      assessments: args.days.length,
      alerts,
    };
  },
});

/** How many recent runs `latestOutlook` will scan looking for this location. */
const MAX_RUNS_SCANNED = 40;

/**
 * The dashboard's read path: the newest completed run for a location, with its
 * forecast days and risk levels flattened into something a chart can render.
 */
export const latestOutlook = query({
  args: { locationCode: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await assertLocationAccess(ctx, user, args.locationCode, [
      "researcher",
      "resident",
    ]);
    /**
     * The newest completed run *that actually carries this location*.
     *
     * The previous version took the newest completed run across the whole
     * deployment and filtered afterwards, so a resident of a city whose latest
     * run was not the global newest was shown nothing. Runs are walked newest
     * first and the first one with a row for this city wins; the per-run probe
     * takes one row, so the cost is bounded by the number of runs scanned.
     */
    const candidateRuns = await ctx.db
      .query("forecastRuns")
      .withIndex("by_requested_at", (index: any) => index)
      .order("desc")
      .filter((row: any) => row.status === "completed")
      .take(MAX_RUNS_SCANNED);

    let run: (typeof candidateRuns)[number] | null = null;
    for (const candidate of candidateRuns) {
      const probe = await ctx.db
        .query("forecasts")
        .withIndex("by_run_valid_at", (index: any) =>
          index.eq("runId", candidate._id),
        )
        .filter((row: any) => row.locationCode === args.locationCode)
        .take(1);

      if (probe.length > 0) {
        run = candidate;
        break;
      }
    }

    if (!run) return null;

    const forecasts = await ctx.db
      .query("forecasts")
      .withIndex("by_run_valid_at", (index: any) => index.eq("runId", run!._id))
      .order("asc")
      .collect();

    const days = [];
    let modelVersion: string | null = null;
    let operatingThreshold: number | null = null;

    for (const forecast of forecasts) {
      if (forecast.locationCode !== args.locationCode) continue;

      const assessment = await ctx.db
        .query("riskAssessments")
        .withIndex("by_forecast", (index: any) =>
          index.eq("forecastId", forecast._id),
        )
        .first();

      if (forecast.modelVersionId && modelVersion === null) {
        const version = await ctx.db.get(forecast.modelVersionId);
        if (version) {
          modelVersion = `${version.name} ${version.version}`;
          operatingThreshold =
            typeof version.metrics?.operatingThreshold === "number"
              ? version.metrics.operatingThreshold
              : null;
        }
      }

      const date = new Date(forecast.validAt);
      days.push({
        date: new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Manila",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(date),
        horizonDays: Math.max(1, Math.round(forecast.horizonHours / 24)),
        rainfallMm: forecast.rainfallMm ?? 0,
        probability: assessment?.probability ?? 0,
        waterLevelM: forecast.predictedWaterLevelM ?? 0,
        riskLevel: assessment?.riskLevel ?? "unavailable",
        alertLevel: assessment?.contributionSummary?.alertLevel ?? "none",
        reasons: assessment?.contributionSummary?.reasons ?? [],
      });
    }

    if (days.length === 0) return null;

    const openAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_location_created_at", (index: any) =>
        index.eq("locationCode", args.locationCode),
      )
      .filter((row: any) => row.status === "open")
      .collect();

    return {
      runId: run._id,
      requestedAt: run.requestedAt,
      completedAt: run.completedAt ?? null,
      provider: run.provider,
      retrievedAt: run.retrievedAt,
      modelVersion,
      operatingThreshold,
      days,
      alerts: openAlerts.length,
    };
  },
});

/**
 * Recent runs, newest first, for researcher history and operational audit.
 *
 * The screen used to render four invented run IDs. Runs only exist once someone
 * presses "Run forecast", so an empty deployment returns an empty list.
 */
export const recentRuns = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      runId: v.string(),
      requestedAt: v.number(),
      completedAt: v.union(v.number(), v.null()),
      provider: v.string(),
      status: v.string(),
      locations: v.array(v.string()),
      days: v.number(),
      alerts: v.number(),
      modelVersion: v.union(v.string(), v.null()),
      reviewStatus: v.union(
        v.literal("pending"),
        v.literal("reviewed"),
        v.literal("escalated"),
        v.literal("returned"),
      ),
      reviewerName: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin", "lgu", "researcher"]);
    const allowedLocations = await assignedLocationCodes(ctx, user, [
      "researcher",
    ]);
    const runs = await ctx.db
      .query("forecastRuns")
      .withIndex("by_requested_at", (index: any) => index)
      .order("desc")
      .take(Math.min(args.limit ?? 20, 100));

    const results = await Promise.all(
      runs.map(async (run: any) => {
        const forecasts = await ctx.db
          .query("forecasts")
          .withIndex("by_run_valid_at", (index: any) =>
            index.eq("runId", run._id),
          )
          .collect();
        const modelVersionId = forecasts.find(
          (row: any) => row.modelVersionId,
        )?.modelVersionId;
        const model = modelVersionId ? await ctx.db.get(modelVersionId) : null;
        const assessments = (
          await Promise.all(
            forecasts.map((forecast: any) =>
              ctx.db
                .query("riskAssessments")
                .withIndex("by_forecast", (index: any) =>
                  index.eq("forecastId", forecast._id),
                )
                .first(),
            ),
          )
        ).filter(Boolean);

        const locations = [
          ...new Set(forecasts.map((row: any) => String(row.locationCode))),
        ];
        if (
          allowedLocations !== null &&
          !locations.some((location) =>
            allowedLocations.includes(normalizeLocationCode(location)),
          )
        ) {
          return null;
        }

        const review = await ctx.db
          .query("lguReviews")
          .withIndex("by_run", (index: any) => index.eq("runId", run._id))
          .first();
        const reviewer = review ? await ctx.db.get(review.reviewerId) : null;

        return {
          runId: run.runId ?? String(run._id),
          requestedAt: run.requestedAt ?? 0,
          completedAt: run.completedAt ?? null,
          provider: run.provider ?? "",
          status: run.status ?? "unknown",
          locations,
          days: forecasts.length,
          alerts: assessments.filter(
            (row: any) =>
              row.riskLevel === "elevated" || row.riskLevel === "moderate",
          ).length,
          modelVersion: model
            ? String((model as any).version ?? (model as any).name ?? "")
            : null,
          reviewStatus: review?.status ?? "pending",
          reviewerName: reviewer?.displayName ?? null,
        };
      }),
    );
    return results
      .filter(
        (result): result is Exclude<typeof result, null> => result !== null,
      )
      .slice(0, Math.min(args.limit ?? 20, 100));
  },
});

/**
 * One run, with every day it stored.
 *
 * The run detail page used to answer "Run not found" for any id, because there
 * was no way to ask for a specific run. This is that way: the id comes from
 * `recentRuns` (or from the `runId` a completed forecast returns).
 */
export const getRun = query({
  args: { runId: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin", "lgu", "researcher"]);
    const runId = ctx.db.normalizeId("forecastRuns", args.runId);
    if (!runId) return null;

    const run = await ctx.db.get(runId);
    if (!run) return null;

    const forecasts = await ctx.db
      .query("forecasts")
      .withIndex("by_run_valid_at", (index: any) => index.eq("runId", runId))
      .order("asc")
      .collect();

    for (const forecast of forecasts) {
      await assertLocationAccess(ctx, user, forecast.locationCode, [
        "researcher",
      ]);
    }

    const modelVersionId = forecasts.find(
      (row: any) => row.modelVersionId,
    )?.modelVersionId;
    const model = modelVersionId ? await ctx.db.get(modelVersionId) : null;

    const days = [];
    for (const forecast of forecasts) {
      const assessment = await ctx.db
        .query("riskAssessments")
        .withIndex("by_forecast", (index: any) =>
          index.eq("forecastId", forecast._id),
        )
        .first();

      days.push({
        date: new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Manila",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(forecast.validAt)),
        locationCode: String(forecast.locationCode),
        horizonDays: Math.max(
          1,
          Math.round((forecast.horizonHours ?? 24) / 24),
        ),
        rainfallMm: forecast.rainfallMm ?? 0,
        probability: assessment?.probability ?? 0,
        waterLevelM: forecast.predictedWaterLevelM ?? 0,
        riskLevel: assessment?.riskLevel ?? "unavailable",
        alertLevel: assessment?.contributionSummary?.alertLevel ?? "none",
        exceedsOperatingThreshold:
          assessment?.contributionSummary?.exceedsOperatingThreshold ?? false,
        reasons: assessment?.contributionSummary?.reasons ?? [],
      });
    }

    const metrics = (model as any)?.metrics;
    const issuedAt = forecasts.find(
      (row: any) => typeof row.issuedAt === "number",
    )?.issuedAt;

    return {
      runId: String(run._id),
      issueDate:
        typeof issuedAt === "number"
          ? new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Manila",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date(issuedAt))
          : null,
      requestedAt: run.requestedAt ?? 0,
      completedAt: run.completedAt ?? null,
      provider: run.provider ?? "",
      status: run.status ?? "unknown",
      retrievedAt: run.retrievedAt ?? 0,
      providerDegraded: forecasts.some(
        (row: any) => row.qualityStatus === "unverified",
      ),
      modelVersion: model ? String((model as any).version ?? "") : null,
      modelKind: model ? String((model as any).modelType ?? "") : null,
      operatingThreshold:
        typeof metrics?.operatingThreshold === "number"
          ? metrics.operatingThreshold
          : null,
      featureSchemaVersion: model
        ? String((model as any).featureSchemaVersion ?? "")
        : null,
      warning: Array.isArray((model as any)?.limitations)
        ? String((model as any).limitations[0] ?? "")
        : null,
      days,
    };
  },
});

/** Housekeeping used by the cron: finish runs that never completed. */
export const failStaleRuns = internalMutation({
  args: { olderThanMs: v.optional(v.number()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.olderThanMs ?? 15 * 60 * 1000);
    const stale = await ctx.db
      .query("forecastRuns")
      .withIndex("by_requested_at", (index: any) => index)
      .filter(
        (row: any) => row.status === "requested" && row.requestedAt < cutoff,
      )
      .collect();

    for (const run of stale) {
      await ctx.db.patch(run._id, {
        status: "failed",
        errorCode: "timeout",
        completedAt: Date.now(),
      });
    }
    return stale.length;
  },
});
