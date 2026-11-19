import { queryGeneric as query } from "convex/server";
import { v } from "convex/values";

export const latestForLocation = query({
  args: {
    locationCode: v.string(),
    validAtOrBefore: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const validAtOrBefore = args.validAtOrBefore ?? Date.now();

    return await ctx.db
      .query("riskAssessments")
      .withIndex("by_location_valid_at", (index) =>
        // queryGeneric keeps this pre-deployment foundation runnable before
        // a Convex development deployment generates schema-specific helpers.
        (index as any)
          .eq("locationCode", args.locationCode)
          .lte("validAt", validAtOrBefore),
      )
      .order("desc")
      .first();
  },
});
