import {
  mutationGeneric as mutation,
  queryGeneric as query,
} from "convex/server";
import { v } from "convex/values";

import { userRoleProfileValidator, userRoleValidator } from "./validators";

/**
 * Roles a person may ask for when their account is first created.
 *
 * The request is a request, never a grant: `resident` is active immediately
 * because it carries no elevated access, while `lgu` and `researcher` are
 * stored as `pending` until an administrator approves them. `admin` is absent
 * on purpose — administrator access is provisioned by an existing
 * administrator, so no client can talk itself into the administrator workspace.
 */
const SELF_SERVICE_ROLES = ["resident", "lgu", "researcher"] as const;

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

    // A new account. The role in the request decides what is *asked for*, and
    // the server decides what is granted.
    const requestedRole = args.requestedRole ?? "resident";

    if (
      !SELF_SERVICE_ROLES.includes(
        requestedRole as (typeof SELF_SERVICE_ROLES)[number],
      )
    ) {
      throw new Error(
        "Administrator accounts are provisioned by an administrator; they cannot be self-assigned.",
      );
    }

    // Only `resident` is usable without review. Everything else waits for an
    // administrator, and the stored status is what the gate reads.
    const status: "active" | "pending" =
      requestedRole === "resident" ? "active" : "pending";

    const userId = await ctx.db.insert("users", {
      externalId,
      email: identity.email ?? `${externalId}@unknown.invalid`,
      displayName: identity.name ?? identity.email ?? "RiverGuard user",
      role: requestedRole,
      status,
      ...(args.roleProfile ? { roleProfile: args.roleProfile } : {}),
      createdAt: now,
      updatedAt: now,
    });

    // Echo the stored status rather than assuming the account is active: a
    // pending request used to be reported back as `active`.
    return {
      userId,
      role: requestedRole,
      status,
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
