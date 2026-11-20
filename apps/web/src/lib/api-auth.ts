/** Trusted service credential or a verified Firebase identity with stored, scoped operational access. */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { convexDeploymentUrl } from "./convex-config";
import { NextResponse } from "next/server";

export type ApiAuthResult =
  | { authorized: true; via: "service-token" | "firebase" }
  | { authorized: false; reason: string };

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
  location?: string,
): Promise<ApiAuthResult> {
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

  if (convexDeploymentUrl && (await verifyFirebaseIdToken(token))) {
    try {
      const c = new ConvexHttpClient(convexDeploymentUrl);
      c.setAuth(token);
      if (
        await c.query(
          api.users.authorizeOperationalAccess,
          location ? { location } : {},
        )
      )
        return { authorized: true, via: "firebase" };
    } catch {
      /* Database or authorization failure: never grant fallback access. */
    }
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
  location?: string,
): Promise<NextResponse | null> {
  const result = await authorizeApiRequest(request, location);

  if (result.authorized) return null;

  return NextResponse.json(
    { error: "Authentication is required.", detail: result.reason },
    { status: 401 },
  );
}
