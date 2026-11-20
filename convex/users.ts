import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { signupRole, userRoleProfileValidator } from "./validators";
import { assignedLocationCodes } from "./lgu";
import { currentAccount, requireCurrentUser, requireRole } from "./auth";
import { validateApplication } from "./applications";

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await currentAccount(ctx);
    return user
      ? {
          ...user,
          assignedLocations:
            user.status === "active"
              ? await assignedLocationCodes(ctx, user)
              : null,
        }
      : null;
  },
});
export const register = mutation({
  args: {
    requestedRole: signupRole,
    displayName: v.optional(v.string()),
    roleProfile: userRoleProfileValidator,
  },
  handler: async (ctx, { requestedRole: role, roleProfile, displayName }) => {
    const { identity, user } = await currentAccount(ctx);
    if (user) return user;
    if (!identity.email) throw new Error("An email address is required.");
    if (role !== "resident") validateApplication(role, roleProfile);
    const now = Date.now(),
      status = role === "resident" ? "active" : "pending";
    const id = await ctx.db.insert("users", {
      externalId: identity.subject,
      email: identity.email,
      displayName: displayName?.trim() || identity.name || identity.email,
      role,
      status,
      roleProfile,
      createdAt: now,
      updatedAt: now,
    });
    if (role !== "resident")
      await ctx.db.insert("roleRequests", {
        userId: id,
        role,
        profile: roleProfile,
        initial: true,
        status: "pending",
      });
    await ctx.db.insert("accessEvents", {
      actor: id,
      subject: id,
      role,
      action: "registered " + status,
    });
    return (await ctx.db.get(id))!;
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
    const existing = await requireCurrentUser(ctx);
    await ctx.db.patch(existing._id, {
      displayName: args.displayName,
      ...(args.roleProfile ? { roleProfile: args.roleProfile } : {}),
      updatedAt: Date.now(),
    });

    return { updated: true };
  },
});

// Next server routes spend provider resources or return stored operational data.
// Use the same verified identity, grants and LGU assignment as Convex operations.
export const authorizeOperationalAccess = query({
  args: { location: v.optional(v.string()) },
  handler: async (ctx, { location }) => {
    const user = await requireRole(ctx, ["admin", "lgu", "researcher"]);
    const allowed = await assignedLocationCodes(ctx, user, ["researcher"]);
    return allowed === null || (!!location && allowed.includes(location));
  },
});
