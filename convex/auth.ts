import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";

type AuthContext = GenericQueryCtx<any> | GenericMutationCtx<any>;

export type AuthenticatedUser = Awaited<ReturnType<typeof requireCurrentUser>>;

export async function requireCurrentUser(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Authentication is required.");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_external_id", (index: any) =>
      index.eq("externalId", identity.subject),
    )
    .unique();

  if (!user) {
    throw new Error("RiverGuard account is not provisioned.");
  }
  if ((user.status ?? "active") !== "active") {
    throw new Error("RiverGuard account is not active.");
  }

  return user;
}

export async function requireRole(
  ctx: AuthContext,
  roles: Array<"resident" | "lgu" | "researcher" | "admin">,
) {
  const user = await requireCurrentUser(ctx);
  if (!roles.includes(user.role)) {
    throw new Error("You do not have permission for this operation.");
  }
  return user;
}
