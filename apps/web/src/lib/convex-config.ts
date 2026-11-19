/**
 * The one place that decides whether this build can talk to Convex.
 *
 * A malformed `NEXT_PUBLIC_CONVEX_URL` used to be handed to `ConvexReactClient`
 * unchanged, which throws inside the root layout — so a single missing character
 * (`ttps://…`) white-screened every route instead of degrading. The value is
 * normalised once here: trimmed, stripped of stray quotes, required to start
 * with `http://` or `https://`, trailing slashes removed. Anything else is
 * reported and treated as "not configured", which lets the app render with its
 * local stores instead of failing to render at all.
 *
 * Every Convex switch in the app reads `convexConfigured` from here so there is
 * only one definition of "configured" to reason about.
 */

const rawUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";

/** Returns a usable deployment URL, or null if the value cannot be used. */
export function normalizeConvexUrl(value: string): string | null {
  const cleaned = value
    .trim()
    .replace(/^["']+/, "")
    .replace(/["']+$/, "")
    .trim();
  if (!cleaned) return null;
  if (!/^https?:\/\//i.test(cleaned)) return null;
  return cleaned.replace(/\/+$/, "");
}

export const convexDeploymentUrl = normalizeConvexUrl(rawUrl);

export const convexConfigured = convexDeploymentUrl !== null;

/**
 * Set only when a value was supplied but rejected, so an absent variable (a
 * legitimate local-only setup) stays quiet while a typo is loud.
 */
export const convexConfigError: string | null =
  rawUrl.trim() && convexDeploymentUrl === null
    ? `NEXT_PUBLIC_CONVEX_URL is not a usable deployment address: ${JSON.stringify(
        rawUrl.trim(),
      )}. It must start with "https://" or "http://". RiverGuard will run without Convex: forecasts are not stored, and run history falls back to the local store.`
    : null;

if (convexConfigError) {
  console.warn(`[riverguard] ${convexConfigError}`);
}
