import {
  mutationGeneric as mutation,
  queryGeneric as query,
} from "convex/server";
import { v } from "convex/values";

import { requireLguOrAdmin, assertLocationAccess } from "./lgu";

const reviewStatus = v.union(
  v.literal("reviewed"),
  v.literal("escalated"),
  v.literal("returned"),
);

async function loadRun(ctx: any, runIdValue: string) {
  const runId = ctx.db.normalizeId("forecastRuns", runIdValue);
  if (!runId) return null;
  const run = await ctx.db.get(runId);
  if (!run) return null;
  const forecasts = await ctx.db
    .query("forecasts")
    .withIndex("by_run_valid_at", (index: any) => index.eq("runId", runId))
    .collect();
  return { runId, run, forecasts };
}

export const getForRun = query({
  args: { runId: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const user = await requireLguOrAdmin(ctx);
    const loaded = await loadRun(ctx, args.runId);
    if (!loaded) return null;

    for (const forecast of loaded.forecasts) {
      await assertLocationAccess(ctx, user, forecast.locationCode);
    }

    const review = await ctx.db
      .query("lguReviews")
      .withIndex("by_run", (index: any) => index.eq("runId", loaded.runId))
      .first();
    if (!review) return null;

    const reviewer = await ctx.db.get(review.reviewerId);
    return {
      status: review.status,
      locationCode: review.locationCode,
      notes: review.notes,
      reviewedAt: review.reviewedAt,
      reviewerName: reviewer?.displayName ?? "LGU reviewer",
    };
  },
});

export const submit = mutation({
  args: {
    runId: v.string(),
    status: reviewStatus,
    notes: v.string(),
  },
  returns: v.object({
    status: reviewStatus,
    reviewedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await requireLguOrAdmin(ctx);
    const notes = args.notes.trim();
    if (!notes) throw new Error("Review notes are required.");

    const loaded = await loadRun(ctx, args.runId);
    if (!loaded || loaded.forecasts.length === 0) {
      throw new Error("The selected forecast run could not be found.");
    }

    for (const forecast of loaded.forecasts) {
      await assertLocationAccess(ctx, user, forecast.locationCode);
    }

    const locationCode = String(loaded.forecasts[0].locationCode);
    const reviewedAt = Date.now();
    const existing = await ctx.db
      .query("lguReviews")
      .withIndex("by_run", (index: any) => index.eq("runId", loaded.runId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        reviewerId: user._id,
        locationCode,
        status: args.status,
        notes,
        reviewedAt,
      });
    } else {
      await ctx.db.insert("lguReviews", {
        runId: loaded.runId,
        reviewerId: user._id,
        locationCode,
        status: args.status,
        notes,
        reviewedAt,
      });
    }

    return { status: args.status, reviewedAt };
  },
});
