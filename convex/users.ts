import {
  mutationGeneric as mutation,
  queryGeneric as query,
} from "convex/server";
import { v } from "convex/values";

export const getCurrent = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_external_id", (index) =>
        index.eq("externalId", identity.subject),
      )
      .unique();
  },
});

export const ensureCurrent = mutation({
  args: {},
  returns: v.object({
    userId: v.string(),
    role: v.string(),
    status: v.string(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new Error("Authentication is required");
    }

    const externalId = identity.subject;
    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_external_id", (index) =>
        index.eq("externalId", externalId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: identity.email ?? existing.email,
        displayName: identity.name ?? existing.displayName,
        updatedAt: now,
      });
      return {
        userId: existing._id,
        role: existing.role,
        status: existing.status ?? "active",
      };
    }

    const userId = await ctx.db.insert("users", {
      externalId,
      email: identity.email ?? `${externalId}@unknown.invalid`,
      displayName: identity.name ?? identity.email ?? "RiverGuard user",
      role: "resident",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return { userId, role: "resident", status: "active" };
  },
});
