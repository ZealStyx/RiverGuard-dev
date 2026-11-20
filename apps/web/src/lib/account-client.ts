import { ConvexHttpClient } from "convex/browser";
import type { User } from "firebase/auth";
import { convexDeploymentUrl } from "./convex-config";
import { api } from "../../../../convex/_generated/api";
import type { FunctionArgs } from "convex/server";

// Bind each operation to the credential just returned by Firebase. Do not race
// the React provider's asynchronous handoff or reuse a different user's token.
async function client(user: User) {
  if (!convexDeploymentUrl)
    throw new Error(
      "Workspace access cannot be verified: the database is unavailable.",
    );
  const client = new ConvexHttpClient(convexDeploymentUrl, {
    fetch: (input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(12000) }),
  });
  client.setAuth(await user.getIdToken());
  return client;
}
export type Registration = FunctionArgs<typeof api.users.register>;
export function accountDestination(
  account: { role: string; status?: string } | null,
  verified: boolean,
) {
  if (!account) return "/auth/signup";
  if (!verified) return "/auth/verify";
  if (
    account.status === "pending" ||
    account.status === "suspended" ||
    account.status === "rejected"
  )
    return `/auth/${account.status}`;
  if (
    account.status !== "active" ||
    !["resident", "lgu", "researcher", "admin"].includes(account.role)
  )
    return "/auth/unauthorized";
  return `/${account.role}`;
}
export async function accountRoute(user: User, registration?: Registration) {
  const c = await client(user);
  const account = registration
    ? await c.mutation(api.users.register, registration)
    : await c.query(api.users.getCurrent, {});
  return accountDestination(account, user.emailVerified);
}
