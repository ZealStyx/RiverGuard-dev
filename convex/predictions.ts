import { paginationOptsValidator, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

export const listForLocation = query({
  args: {
    locationCode: v.string(),
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
      .query("forecasts")
      .withIndex("by_location_valid_at", (index) =>
        // queryGeneric keeps this pre-deployment foundation runnable before
        // a Convex development deployment generates schema-specific helpers.
        (index as any)
          .eq("locationCode", args.locationCode)
          .gte("validAt", args.startAt)
          .lte("validAt", args.endAt),
      )
      .order("asc")
      .paginate(args.paginationOpts);
  },
});
