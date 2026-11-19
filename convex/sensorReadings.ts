import { paginationOptsValidator, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

export const listWindow = query({
  args: {
    stationId: v.id("stations"),
    startAt: v.number(),
    endAt: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.startAt > args.endAt) {
      throw new Error("startAt must be earlier than or equal to endAt");
    }

    return await ctx.db
      .query("sensorReadings")
      .withIndex("by_station_observed_at", (index) =>
        // queryGeneric keeps this pre-deployment foundation runnable before
        // Convex generates schema-specific server types on the first dev run.
        (index as any)
          .eq("stationId", args.stationId)
          .gte("observedAt", args.startAt)
          .lte("observedAt", args.endAt),
      )
      .order("asc")
      .paginate(args.paginationOpts);
  },
});
