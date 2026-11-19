"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useFirebaseAuth } from "./FirebaseAuthProvider";
import { api } from "../../../../../convex/_generated/api";
import { convexConfigured } from "@/lib/convex-config";
import type { ProductRole } from "@/data/prototype";

function devBypassEnabled() {
  // Local design/content preview only. The NODE_ENV check prevents this flag
  // from weakening access control in a production build.
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true"
  );
}

/**
 * Convex is optional. When no usable deployment URL exists, the Convex hooks
 * below throw ("Could not find ConvexProviderWithAuth"), which took down every
 * protected route. Pick the implementation from a build-time constant so the
 * hook set never changes between renders.
 */
export function WorkspaceGate({
  role,
  children,
}: {
  role: ProductRole;
  children: React.ReactNode;
}) {
  if (!convexConfigured) {
    return <FirebaseOnlyGate role={role}>{children}</FirebaseOnlyGate>;
  }
  return <ConvexBackedGate role={role}>{children}</ConvexBackedGate>;
}

/**
 * Degraded gate for builds without Convex: sign-in is still required, but role
 * and account status cannot be read from the deployment, so only authentication
 * is enforced.
 */
function FirebaseOnlyGate({
  role,
  children,
}: {
  role: ProductRole;
  children: React.ReactNode;
}) {
  const devBypassAuth = devBypassEnabled();
  const router = useRouter();
  const { user, loading: firebaseLoading } = useFirebaseAuth();

  useEffect(() => {
    if (devBypassAuth) return;
    if (!firebaseLoading && user === null) {
      router.replace(`/auth/login?return=/${role}`);
    }
  }, [devBypassAuth, firebaseLoading, role, router, user]);

  if (devBypassAuth) return <>{children}</>;

  if (firebaseLoading || !user) {
    return (
      <main className="p-6 text-muted">Checking your RiverGuard access…</main>
    );
  }

  return <>{children}</>;
}

function ConvexBackedGate({
  role,
  children,
}: {
  role: ProductRole;
  children: React.ReactNode;
}) {
  const devBypassAuth = devBypassEnabled();
  const router = useRouter();
  const { user, loading: firebaseLoading } = useFirebaseAuth();
  const { isAuthenticated: convexAuthenticated, isLoading: convexLoading } =
    useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrent,
    convexAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (devBypassAuth) return;
    if (!firebaseLoading && user === null) {
      router.replace(`/auth/login?return=/${role}`);
      return;
    }
    if (currentUser && currentUser.role !== role) {
      router.replace(`/${currentUser.role}`);
    }
  }, [currentUser, devBypassAuth, firebaseLoading, role, router, user]);

  if (devBypassAuth) return <>{children}</>;

  if (
    firebaseLoading ||
    convexLoading ||
    !user ||
    !convexAuthenticated ||
    currentUser === undefined
  ) {
    return (
      <main className="p-6 text-muted">Checking your RiverGuard access…</main>
    );
  }

  if (currentUser === null) {
    return (
      <main className="p-6 text-muted">
        Your account is not provisioned in RiverGuard yet. Return to sign in and
        try again.
      </main>
    );
  }

  if ((currentUser.status ?? "active") !== "active") {
    return (
      <main className="p-6 text-muted">
        Your RiverGuard account is not active. Contact an administrator for
        access.
      </main>
    );
  }

  if (currentUser.role !== role) {
    return (
      <main className="p-6 text-muted">Redirecting to your workspace…</main>
    );
  }

  return children;
}
