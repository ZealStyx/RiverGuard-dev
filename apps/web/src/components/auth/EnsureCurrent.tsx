"use client";

/**
 * Account provisioning, available only when a Convex deployment is configured.
 *
 * `useMutation` throws while rendering when there is no `ConvexProvider` above
 * it — "Could not find Convex client!" — and `ConvexClientProvider` deliberately
 * renders its children bare when no usable deployment URL exists. The sign-in,
 * sign-up, and verification screens are public routes that must render in that
 * state, so the hook cannot live inside them.
 *
 * The hook is called in exactly one component here, and the screens receive
 * either the real mutation or `null`. A render-prop keeps the hook call inside a
 * component whose mount is decided by the build-time `convexConfigured` flag, so
 * the hook set never changes between renders.
 *
 * With Convex absent, callers get `null` and must degrade: sign-in still works
 * through Firebase, but role and account status cannot be read, because they
 * live in the deployment.
 */

import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { useMutation } from "convex/react";
import type { ReactNode } from "react";

import { api } from "../../../../../convex/_generated/api";
import { convexConfigured } from "@/lib/convex-config";

export type EnsureCurrentArgs = FunctionArgs<typeof api.users.ensureCurrent>;
export type EnsureCurrentAccount = FunctionReturnType<
  typeof api.users.ensureCurrent
>;

/** Resolves to the provisioned account, or null when Convex is unavailable. */
export type ProvisionAccount = (
  args: EnsureCurrentArgs,
) => Promise<EnsureCurrentAccount | null>;

export function WithEnsureCurrent({
  children,
}: {
  children: (ensureCurrent: ProvisionAccount | null) => ReactNode;
}) {
  if (!convexConfigured) return <>{children(null)}</>;
  return <LiveEnsureCurrent>{children}</LiveEnsureCurrent>;
}

function LiveEnsureCurrent({
  children,
}: {
  children: (ensureCurrent: ProvisionAccount | null) => ReactNode;
}) {
  const mutate = useMutation(api.users.ensureCurrent);

  async function ensureCurrent(args: EnsureCurrentArgs) {
    return await mutate(args);
  }

  return <>{children(ensureCurrent)}</>;
}
