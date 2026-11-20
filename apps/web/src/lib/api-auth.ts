/**
 * Authentication for the API routes.
 *
 * The route handlers under `app/api/` are not covered by Convex's user check:
 * they run in the Next server, which has no Convex identity of its own. Before
 * this module they were simply open, so `/api/forecast` would spend a weather
 * call and an ML run for any anonymous caller, `/api/runs` would list stored
 * runs, and `/api/historical` would write to the deployment on a GET.
 *
 * Three callers are accepted, in this order:
 *
 *   1. **Service token.** `Authorization: Bearer $RIVERGUARD_API_TOKEN`, for
 *      server-to-server use (scripts, uptime checks). Only accepted when the
 *      variable is configured.
 *   2. **Firebase ID token.** The browser's signed-in user sends its ID token,
 *      which is verified against Google's Identity Toolkit. The public Firebase
 *      API key is used only to address the endpoint — the token itself is what
 *      Google validates.
 *   3. **Development bypass.** `NODE_ENV=development` **and**
 *      `NEXT_PUBLIC_DEV_BYPASS_AUTH=true`, matching `WorkspaceGate`. Never
 *      applies to a production build.
 *
 * Fails closed: no token, an unverifiable token, or a verification that cannot
 * be performed (no API key, no network) all mean "not authorised".
 */

import { NextResponse } from "next/server";

export type ApiAuthResult =
  | { authorized: true; via: "service-token" | "firebase" | "dev-bypass" }
  | { authorized: false; reason: string };

function devBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true"
  );
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() ?? null;
}

/** Constant-time comparison, so the token cannot be guessed a byte at a time. */
function sameSecret(candidate: string, expected: string): boolean {
  if (candidate.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < candidate.length; index += 1) {
    mismatch |= candidate.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

/**
 * Ask Google whether this ID token belongs to a real, current session.
 *
 * `accounts:lookup` returns 200 with the user record only for a token the
 * project's own Firebase instance issued and has not revoked, so it doubles as
 * a signature, audience and revocation check without shipping the Admin SDK.
 */
async function verifyFirebaseIdToken(idToken: string): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return false;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
        cache: "no-store",
      },
    );

    if (!response.ok) return false;

    const payload = (await response.json()) as { users?: unknown[] };
    return Array.isArray(payload.users) && payload.users.length === 1;
  } catch {
    // No egress, a DNS failure, or a malformed answer: not proof of identity.
    return false;
  }
}

export async function authorizeApiRequest(
  request: Request,
): Promise<ApiAuthResult> {
  if (devBypassEnabled()) {
    return { authorized: true, via: "dev-bypass" };
  }

  const token = bearerToken(request);

  if (token === null) {
    return {
      authorized: false,
      reason: "This endpoint requires a signed-in RiverGuard account.",
    };
  }

  const serviceToken = process.env.RIVERGUARD_API_TOKEN;
  if (
    typeof serviceToken === "string" &&
    serviceToken.length > 0 &&
    sameSecret(token, serviceToken)
  ) {
    return { authorized: true, via: "service-token" };
  }

  if (await verifyFirebaseIdToken(token)) {
    return { authorized: true, via: "firebase" };
  }

  return {
    authorized: false,
    reason:
      "The bearer token was not accepted. Sign in again, or send the server's RIVERGUARD_API_TOKEN.",
  };
}

/**
 * `null` when the request may proceed, otherwise the 401 to return.
 *
 * Used as `const denied = await requireApiAuth(request); if (denied) return denied;`
 */
export async function requireApiAuth(
  request: Request,
): Promise<NextResponse | null> {
  const result = await authorizeApiRequest(request);

  if (result.authorized) return null;

  return NextResponse.json(
    { error: "Authentication is required.", detail: result.reason },
    { status: 401 },
  );
}
