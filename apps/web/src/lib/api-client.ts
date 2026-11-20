/**
 * `fetch` for this application's own API routes.
 *
 * The routes check `Authorization: Bearer <Firebase ID token>` (see
 * `lib/api-auth.ts`), so every browser call has to carry one. Wrapping `fetch`
 * rather than sprinkling `getIdToken()` through the components keeps the
 * screens unchanged — `authFetch()` returns a `Promise<Response>`, so existing
 * `.then(...)` chains and `await` sites work as they did.
 *
 * A signed-out visitor gets no token, the call goes out bare, and the route
 * answers 401 — which the screens already render as an error rather than an
 * invented chart.
 */

import { getFirebaseAuth } from "./firebase";

async function apiAuthHeaders(): Promise<Record<string, string>> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return {};

  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

export async function authFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = await apiAuthHeaders();

  return fetch(input, {
    ...init,
    headers: {
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
      ...headers,
    },
  });
}
