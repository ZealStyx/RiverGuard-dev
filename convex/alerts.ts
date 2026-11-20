/**
 * Alerts: raised by forecast writes, acknowledged and resolved by people.
 *
 * Two rules keep this honest:
 *  1. Only `elevated` assessments raise an alert. "Moderate" is informational.
 *  2. A new completed run for a location resolves the open alerts it supersedes,
 *     so a stale danger banner cannot outlive the forecast that justified it.
 */

import {
  mutationGeneric as mutation,
  paginationOptsValidator,
  queryGeneric as query,
} from "convex/server";
import { v } from "convex/values";

import { assertLocationAccess } from "./lgu";
import { requireRole } from "./auth";

export const listForLocation = query({
  args: {
    locationCode: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    await assertLocationAccess(
      ctx,
      await requireRole(ctx, ["resident", "lgu", "admin"]),
      args.locationCode,
      ["resident"],
    );
    return await ctx.db
      .query("alerts")
      .withIndex("by_location_created_at", (index) =>
        index.eq("locationCode", args.locationCode),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/** Small list for the dashboard banner. */
export const listOpenForLocation = query({
  args: { locationCode: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    await assertLocationAccess(
      ctx,
      await requireRole(ctx, ["resident", "lgu", "admin"]),
      args.locationCode,
      ["resident"],
    );
    const rows = await ctx.db
      .query("alerts")
      .withIndex("by_location_created_at", (index: any) =>
        index.eq("locationCode", args.locationCode),
      )
      .order("desc")
      .filter((row: any) => row.status === "open")
      .take(Math.min(args.limit ?? 5, 20));

    return rows.map((row: any) => ({
      _id: row._id,
      title: row.title,
      message: row.message,
      severity: row.severity,
      createdAt: row.createdAt,
    }));
  },
});

/**
 * Plain helper (not a mutation) shared with convex/forecasts.ts.
 * Returns true when a new alert row was inserted.
 */
export async function raiseAlertIfElevated(
  ctx: any,
  input: {
    locationCode: string;
    locationName: string;
    riskAssessmentId: string;
    validAt: number;
    severity: "lower" | "moderate" | "elevated" | "unavailable";
    probability: number;
    waterLevelM: number;
    alertLevel: "none" | "first" | "second" | "third";
    reasons: string[];
  },
): Promise<boolean> {
  if (input.severity !== "elevated") return false;

  const duplicate = await ctx.db
    .query("alerts")
    .withIndex("by_location_created_at", (index: any) =>
      index.eq("locationCode", input.locationCode),
    )
    .filter(
      (row: any) =>
        row.status === "open" &&
        row.riskAssessmentId === input.riskAssessmentId,
    )
    .first();
  if (duplicate) return false;

  const when = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
  }).format(new Date(input.validAt));

  await ctx.db.insert("alerts", {
    locationCode: input.locationCode,
    riskAssessmentId: input.riskAssessmentId,
    status: "open",
    severity: input.severity,
    title: `Elevated flood risk - ${input.locationName} - ${when}`,
    message:
      `Experimental model output: ${(input.probability * 100).toFixed(0)}% flood probability, ` +
      `predicted level ${input.waterLevelM.toFixed(2)} m (${
        input.alertLevel === "none"
          ? "below alarm levels"
          : `${input.alertLevel} alarm`
      }). ` +
      `Not an official warning - verify PAGASA and LGU advisories. ` +
      (input.reasons[0] ?? ""),
    createdAt: Date.now(),
  });
  return true;
}

/** Resolve open alerts from earlier runs for the same location. */
export async function resolveSupersededAlerts(
  ctx: any,
  locationCode: string,
  currentRunId: string,
): Promise<number> {
  const open = await ctx.db
    .query("alerts")
    .withIndex("by_location_created_at", (index: any) =>
      index.eq("locationCode", locationCode),
    )
    .filter((row: any) => row.status === "open")
    .collect();

  let resolved = 0;
  for (const alert of open) {
    if (!alert.riskAssessmentId) continue;
    const assessment = await ctx.db.get(alert.riskAssessmentId);
    if (!assessment?.forecastId) continue;
    const forecast = await ctx.db.get(assessment.forecastId);
    if (forecast && forecast.runId !== currentRunId) {
      await ctx.db.patch(alert._id, {
        status: "resolved",
        resolvedAt: Date.now(),
      });
      resolved += 1;
    }
  }
  return resolved;
}

export const acknowledge = mutation({
  args: { alertId: v.id("alerts"), acknowledgedBy: v.optional(v.id("users")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["lgu", "admin"]);
    const alert = await ctx.db.get(args.alertId);
    if (!alert) throw new Error("Alert not found.");
    await assertLocationAccess(ctx, user, alert.locationCode);
    await ctx.db.patch(args.alertId, {
      status: "acknowledged",
      acknowledgedAt: Date.now(),
      acknowledgedBy: user._id,
    });
    return null;
  },
});

export const resolve = mutation({
  args: { alertId: v.id("alerts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["lgu", "admin"]);
    const alert = await ctx.db.get(args.alertId);
    if (!alert) throw new Error("Alert not found.");
    await assertLocationAccess(ctx, user, alert.locationCode);
    await ctx.db.patch(args.alertId, {
      status: "resolved",
      resolvedAt: Date.now(),
    });
    return null;
  },
});
