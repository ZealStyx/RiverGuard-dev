import {
  mutation,
  query,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
declare const process: { env: Record<string, string | undefined> };
import { ConvexError, v, type Infer } from "convex/values";
import {
  elevatedRole,
  cityCode,
  userRoleValidator,
  userRoleProfileValidator,
} from "./validators";
import {
  requireRole,
  requireCurrentUser,
  hasRole,
  currentAccount,
} from "./auth";
import type { Doc } from "./_generated/dataModel";

export function validateApplication(
  role: Infer<typeof elevatedRole>,
  profile: Infer<typeof userRoleProfileValidator>,
) {
  if (
    !profile.organization?.trim() ||
    !profile.purpose?.trim() ||
    !profile.requestedArea?.trim() ||
    (role === "lgu" && !profile.position?.trim()) ||
    (role === "researcher" && !profile.researcherType)
  )
    throw new ConvexError(
      "Complete the role-specific organization, area, credentials and purpose fields.",
    );
}
export const request = mutation({
  args: { role: elevatedRole, profile: userRoleProfileValidator },
  handler: async (ctx, { role, profile }) => {
    const user = await requireCurrentUser(ctx);
    validateApplication(role, profile);
    if (role !== "lgu" && hasRole(user, role))
      throw new ConvexError("This role is already approved.");
    const duplicate = await ctx.db
      .query("roleRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(q.eq(q.field("role"), role), q.eq(q.field("status"), "pending")),
      )
      .first();
    if (duplicate) throw new ConvexError("This request is already pending.");
    await ctx.db.insert("roleRequests", {
      role,
      profile,
      userId: user._id,
      initial: false,
      status: "pending",
    });
  },
});
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await currentAccount(ctx);
    return user
      ? ctx.db
          .query("roleRequests")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .order("desc")
          .collect()
      : [];
  },
});
export const queue = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    const rows = await ctx.db
      .query("roleRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(100);
    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        email: (await ctx.db.get(row.userId))?.email,
      })),
    );
  },
});
async function grant(
  ctx: MutationCtx,
  user: Doc<"users">,
  role: Doc<"users">["role"],
  location?: Infer<typeof cityCode>,
  organization?: string,
) {
  if (role === "lgu") {
    if (!location)
      throw new ConvexError(
        "Assign an approved city before granting LGU access.",
      );
    const profile = await ctx.db
      .query("lguProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const now = Date.now();
    const values = {
      cityCode: location,
      assignedLocationCodes: [location],
      updatedAt: now,
    };
    if (profile) await ctx.db.patch(profile._id, values);
    else
      await ctx.db.insert("lguProfiles", {
        ...values,
        userId: user._id,
        organization: organization || "",
        createdAt: now,
      });
  }
  await ctx.db.patch(user._id, {
    status: "active",
    additionalRoles: hasRole(user, role)
      ? user.additionalRoles
      : [...(user.additionalRoles ?? []), role],
    updatedAt: Date.now(),
  });
}
export const decide = mutation({
  args: {
    id: v.id("roleRequests"),
    approve: v.boolean(),
    location: v.optional(cityCode),
  },
  handler: async (ctx, { id, approve, location }) => {
    const admin = await requireRole(ctx, ["admin"]);
    const row = await ctx.db.get(id);
    if (row?.status !== "pending")
      throw new ConvexError("Request is not pending.");
    const user = await ctx.db.get(row.userId);
    if (
      !user ||
      user.status !== (row.initial ? "pending" : "active") ||
      admin._id === user._id
    )
      throw new ConvexError("Account is not eligible for review.");
    const status = approve ? "approved" : "rejected";
    if (approve)
      await grant(ctx, user, row.role, location, row.profile.organization);
    else if (row.initial)
      await ctx.db.patch(user._id, {
        status: "rejected",
        updatedAt: Date.now(),
      });
    await ctx.db.patch(id, {
      status,
      reviewer: admin._id,
      decidedAt: Date.now(),
      location,
    });
    await ctx.db.insert("accessEvents", {
      actor: admin._id,
      subject: user._id,
      role: row.role,
      action: status,
      location,
    });
  },
});
export const audit = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    return ctx.db.query("accessEvents").order("desc").take(100);
  },
});
export const invite = mutation({
  args: {
    email: v.string(),
    role: userRoleValidator,
    location: v.optional(cityCode),
  },
  handler: async (ctx, { email, role, location }) => {
    const admin = await requireRole(ctx, ["admin"]);
    email = email.trim().toLowerCase();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      (role === "lgu" && !location)
    )
      throw new ConvexError(
        "A valid recipient and LGU assignment are required.",
      );
    const sendEmail = !!process.env.RESEND_API_KEY;
    const id = await ctx.db.insert("invitations", {
      email,
      role,
      location,
      ...(sendEmail ? { mailStatus: "queued" as const } : {}),
      sender: admin._id,
      expiresAt: Date.now() + 7 * 86400000,
    });
    await ctx.db.insert("accessEvents", {
      actor: admin._id,
      subject: email,
      role,
      location,
      action: "invited",
    });
    if (sendEmail)
      await ctx.scheduler.runAfter(0, internal.invitationMail.notify, {
        id,
        email,
      });
    return id;
  },
});
export const recentInvitations = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    return ctx.db.query("invitations").order("desc").take(50);
  },
});
export const inbox = query({
  args: {},
  handler: async (ctx) => {
    const { identity } = await currentAccount(ctx);
    if (!identity.emailVerified || !identity.email) return [];
    return ctx.db
      .query("invitations")
      .withIndex("by_email", (q) =>
        q.eq("email", identity.email!.toLowerCase()),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("acceptedBy"), undefined),
          q.gt(q.field("expiresAt"), Date.now()),
        ),
      )
      .collect();
  },
});
export const accept = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, { id }) => {
    const { user, identity } = await currentAccount(ctx);
    const inv = await ctx.db.get(id);
    if (
      !inv ||
      inv.acceptedBy ||
      inv.expiresAt <= Date.now() ||
      inv.email !== identity?.email?.toLowerCase()
    )
      throw new ConvexError("Invitation is unavailable.");
    if (
      !identity.emailVerified ||
      !user ||
      !(
        user.status === "active" ||
        (user.status === "pending" && user.role === inv.role)
      )
    )
      throw new ConvexError("Register and verify an eligible account first.");
    const pending = await ctx.db
      .query("roleRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("role"), inv.role),
        ),
      )
      .collect();
    for (const r of pending)
      await ctx.db.patch(r._id, {
        status: "approved",
        decidedAt: Date.now(),
        reviewer: inv.sender,
        location: inv.location,
      });
    await grant(
      ctx,
      user,
      inv.role,
      inv.location,
      user.roleProfile?.organization,
    );
    await ctx.db.patch(id, { acceptedBy: user._id });
    await ctx.db.insert("accessEvents", {
      actor: user._id,
      subject: user._id,
      role: inv.role,
      location: inv.location,
      action: "accepted invitation",
    });
  },
});
// Idempotent rollout for pending signups created before roleRequests existed.
export const migratePending = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("users")
      .paginate({ cursor: cursor ?? null, numItems: 100 });
    for (const user of page.page) {
      if (
        user.status !== "pending" ||
        (user.role !== "lgu" && user.role !== "researcher")
      )
        continue;
      const existing = await ctx.db
        .query("roleRequests")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (!existing)
        await ctx.db.insert("roleRequests", {
          userId: user._id,
          role: user.role,
          status: "pending",
          initial: true,
          profile: user.roleProfile ?? {},
        });
    }
    return page.isDone ? null : page.continueCursor;
  },
});
