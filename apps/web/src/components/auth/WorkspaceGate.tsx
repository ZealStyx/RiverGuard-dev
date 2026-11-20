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
 * Degraded gate for builds without Convex.
 *
 * Role and account status live in the deployment, so without it they cannot be
 * read — and this used to let any signed-in Firebase user into *every*
 * workspace, including the administrator one. That is a fail-open check, and it
 * is now a fail-closed one: an unverifiable role means no entry, with an
 * explanation, instead of entry granted by default. Local design previews still
 * opt in through `NEXT_PUBLIC_DEV_BYPASS_AUTH` in development only.
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

  // Signed in, but the role and status that decide what this person may see are
  // not reachable. Refuse: the alternative is admitting everyone.
  return (
    <main className="p-6 text-muted">
      <h1 className="text-section">Access cannot be verified</h1>
      <p className="mt-2 text-body">
        This build has no workspace backend configured, so your RiverGuard role
        and account status cannot be checked. Access to the {role} workspace is
        closed until the deployment is configured.
      </p>
      <p className="mt-2 text-body text-muted">
        Administrators: set the Convex deployment URL for this environment. For
        local design previews only, set both{" "}
        <code>NEXT_PUBLIC_DEV_BYPASS_AUTH=true</code> and{" "}
        <code>NODE_ENV=development</code>.
      </p>
    </main>
  );
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
