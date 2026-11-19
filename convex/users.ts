import {
  mutationGeneric as mutation,
  queryGeneric as query,
} from "convex/server";
import { v } from "convex/values";

import { userRoleProfileValidator, userRoleValidator } from "./validators";

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
  args: {
    requestedRole: v.optional(userRoleValidator),
    roleProfile: v.optional(userRoleProfileValidator),
  },
  returns: v.object({
    userId: v.string(),
    role: v.string(),
    status: v.string(),
  }),
  handler: async (ctx, args) => {
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
        ...(args.roleProfile ? { roleProfile: args.roleProfile } : {}),
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
      role: args.requestedRole ?? "resident",
      status:
        args.requestedRole === "lgu" || args.requestedRole === "researcher"
          ? "pending"
          : "active",
      ...(args.roleProfile ? { roleProfile: args.roleProfile } : {}),
      createdAt: now,
      updatedAt: now,
    });

    return {
      userId,
      role: args.requestedRole ?? "resident",
      status: "active",
    };
  },
});

export const updateCurrentProfile = mutation({
  args: {
    displayName: v.string(),
    roleProfile: v.optional(userRoleProfileValidator),
  },
  returns: v.object({
    updated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Authentication is required");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_external_id", (index) =>
        index.eq("externalId", identity.subject),
      )
      .unique();

    if (!existing) {
      throw new Error("RiverGuard account is not provisioned.");
    }

    await ctx.db.patch(existing._id, {
      displayName: args.displayName,
      ...(args.roleProfile ? { roleProfile: args.roleProfile } : {}),
      updatedAt: Date.now(),
    });

    return { updated: true };
  },
});
