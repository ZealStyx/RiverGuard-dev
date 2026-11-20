import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
export type AuthenticatedUser = Doc<"users">;
export function hasRole(
  user: Pick<AuthenticatedUser, "role" | "additionalRoles">,
  role: AuthenticatedUser["role"],
) {
  return user.role === role || !!user.additionalRoles?.includes(role);
}
export async function currentAccount(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Sign in to RiverGuard.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_external_id", (q) => q.eq("externalId", identity.subject))
    .unique();
  return { identity, user };
}
export async function requireCurrentUser(ctx: QueryCtx) {
  const { identity, user } = await currentAccount(ctx);
  if (!identity.emailVerified || user?.status !== "active")
    throw new Error("A verified, active account is required.");
  return user;
}
export async function requireRole(
  ctx: QueryCtx,
  roles: AuthenticatedUser["role"][],
) {
  const user = await requireCurrentUser(ctx);
  if (!roles.some((role) => hasRole(user, role)))
    throw new Error("Permission denied.");
  return user;
}
