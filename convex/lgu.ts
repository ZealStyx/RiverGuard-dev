import { requireRole, type AuthenticatedUser } from "./auth";

/**
 * LGU access is derived only from the approved lguProfiles assignment. The
 * signup request is only a request and must never grant operational access.
 */
export function normalizeLocationCode(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export async function assignedLocationCodes(
  ctx: any,
  user: AuthenticatedUser,
): Promise<string[] | null> {
  if (user.role !== "lgu") return null;

  const profile = await ctx.db
    .query("lguProfiles")
    .withIndex("by_user", (index: any) => index.eq("userId", user._id))
    .first();

  const values = [
    ...(profile?.assignedLocationCodes ?? []),
    profile?.cityCode,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(values.map(normalizeLocationCode))];
}

export async function assertLocationAccess(
  ctx: any,
  user: AuthenticatedUser,
  locationCode: string,
) {
  const allowed = await assignedLocationCodes(ctx, user);
  if (
    allowed !== null &&
    !allowed.includes(normalizeLocationCode(locationCode))
  ) {
    throw new Error("This location is outside your approved LGU assignment.");
  }
}

export async function requireLguOrAdmin(ctx: any) {
  return requireRole(ctx, ["lgu", "admin"]);
}
