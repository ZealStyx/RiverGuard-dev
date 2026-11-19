import { queryGeneric as query } from "convex/server";
import { v } from "convex/values";

export const listAvailable = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.trunc(args.limit ?? 50), 1), 100);

    return await ctx.db
      .query("stations")
      .withIndex("by_active_name", (index) => index.eq("active", true))
      .take(limit);
  },
});

export const getByCode = query({
  args: { code: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stations")
      .withIndex("by_code", (index) => index.eq("code", args.code))
      .unique();
  },
});
