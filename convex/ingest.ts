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
 * `admin`/`lgu` account is the proof for case 2. Anything else is refused.
 *
 * The check fails closed on purpose: when `RIVERGUARD_INGEST_SECRET` is not set
 * on the deployment, a request that carries no user identity is rejected rather
 * than trusted. Set the variable on the deployment and in the web app's server
 * environment to keep the live history path writing.
 */

import type { GenericMutationCtx } from "convex/server";

/**
 * Convex exposes the deployment's environment variables on `process.env`, but
 * `convex/` is compiled without `@types/node` (the runtime is V8, not Node), so
 * the accessor is declared here rather than pulling Node's whole type surface
 * into functions that cannot use it.
 */
declare const process: { env: Record<string, string | undefined> };

/** Signed-in roles allowed to import data without the shared secret. */
const STAFF_ROLES: string[] = ["admin", "lgu"];

/** Constant-time comparison, so the secret cannot be guessed a byte at a time. */
function sameSecret(candidate: string, expected: string): boolean {
  if (candidate.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < candidate.length; index += 1) {
    mismatch |= candidate.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function assertIngestAuthorized(
  ctx: GenericMutationCtx<any>,
  secret?: string,
): Promise<void> {
  const expected = process.env.RIVERGUARD_INGEST_SECRET;

  if (
    typeof expected === "string" &&
    expected.length > 0 &&
    typeof secret === "string" &&
    sameSecret(secret, expected)
  ) {
    return;
  }

  const identity = await ctx.auth.getUserIdentity();
  if (identity !== null) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_external_id", (index: any) =>
        index.eq("externalId", identity.subject),
      )
      .unique();

    if (
      user !== null &&
      (user.status ?? "active") === "active" &&
      STAFF_ROLES.includes(user.role)
    ) {
      return;
    }
  }

  throw new Error(
    "Ingest is not authorised. Send the deployment's RIVERGUARD_INGEST_SECRET from the server, or sign in with an active LGU or administrator account.",
  );
}
