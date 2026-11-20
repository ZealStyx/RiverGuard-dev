/**
 * Authorisation for the ingest mutations.
 *
 * `observedWeather:upsertDays`, `historical:upsertBatch` and
 * `historical:upsertFloodEvents` write the rows the charts, the risk badges and
 * the model inputs are built from. They are called in two ways:
 *
 *   1. by this repository's own server code — `/api/historical` and
 *      `scripts/import_historical_dataset.mjs`, which hold no Firebase
 *      identity and therefore cannot use the normal user check;
 *   2. by a signed-in person importing a dataset by hand.
 *
 * Both are allowed, but only with proof. The deployment's
 * `RIVERGUARD_INGEST_SECRET` is the proof for case 1 and an active
 * `admin` account is the proof for case 2. Anything else is refused.
 *
 * The check fails closed on purpose: when `RIVERGUARD_INGEST_SECRET` is not set
 * on the deployment, a request that carries no user identity is rejected rather
 * than trusted. Set the variable on the deployment and in the web app's server
 * environment to keep the live history path writing.
 */

import { requireRole } from "./auth";
import type { MutationCtx } from "./_generated/server";

/**
 * Convex exposes the deployment's environment variables on `process.env`, but
 * `convex/` is compiled without `@types/node` (the runtime is V8, not Node), so
 * the accessor is declared here rather than pulling Node's whole type surface
 * into functions that cannot use it.
 */
declare const process: { env: Record<string, string | undefined> };

/** Constant-time comparison, so the secret cannot be guessed a byte at a time. */
function sameSecret(candidate: string, expected: string): boolean {
  if (candidate.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < candidate.length; index += 1) {
    mismatch |= candidate.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

/**
 * Whether `secret` is this deployment's server credential.
 *
 * The same variable authorises the historical ingest and the server-side
 * forecast write: one credential to configure, one place to rotate it.
 */
export function hasIngestSecret(secret?: string): boolean {
  const expected = process.env.RIVERGUARD_INGEST_SECRET;
  return (
    typeof expected === "string" &&
    expected.length > 0 &&
    typeof secret === "string" &&
    sameSecret(secret, expected)
  );
}

export async function assertIngestAuthorized(
  ctx: MutationCtx,
  secret?: string,
): Promise<void> {
  if (hasIngestSecret(secret)) {
    return;
  }

  // A global import is not limited to any one LGU assignment.
  await requireRole(ctx, ["admin"]);
}
