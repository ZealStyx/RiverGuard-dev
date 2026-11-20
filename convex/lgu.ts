import type { QueryCtx } from "./_generated/server";
import { hasRole, requireRole, type AuthenticatedUser } from "./auth";

/**
 * LGU access is derived only from the approved lguProfiles assignment. The
 * signup request is only a request and must never grant operational access.
 */
export function normalizeLocationCode(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export async function assignedLocationCodes(
  ctx: QueryCtx,
  user: AuthenticatedUser,
  unrestricted: readonly ("researcher" | "resident")[] = [],
): Promise<string[] | null> {
  if (
    !hasRole(user, "lgu") ||
    hasRole(user, "admin") ||
    unrestricted.some((role) => hasRole(user, role))
  )
    return null;

  const profile = await ctx.db
    .query("lguProfiles")
    .withIndex("by_user", (index) => index.eq("userId", user._id))
    .first();

  const values = [
    ...(profile?.assignedLocationCodes ?? []),
    profile?.cityCode,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(values.map(normalizeLocationCode))];
}

export async function assertLocationAccess(
  ctx: QueryCtx,
  user: AuthenticatedUser,
  locationCode: string,
  unrestricted: readonly ("researcher" | "resident")[] = [],
) {
  const allowed = await assignedLocationCodes(ctx, user, unrestricted);
  if (
    allowed !== null &&
    !allowed.includes(normalizeLocationCode(locationCode))
  ) {
    throw new Error("This location is outside your approved LGU assignment.");
  }
}

export async function requireLguOrAdmin(ctx: QueryCtx) {
  return requireRole(ctx, ["lgu", "admin"]);
}
