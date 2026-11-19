"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useFirebaseAuth } from "./FirebaseAuthProvider";
import { api } from "../../../../../convex/_generated/api";
import type { ProductRole } from "@/data/prototype";

export function WorkspaceGate({
  role,
  children,
}: {
  role: ProductRole;
  children: React.ReactNode;
}) {
  const devBypassAuth =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";
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

  // Local design/content preview only. The NODE_ENV check prevents this flag
  // from weakening access control in a production build.
  if (devBypassAuth) return children;

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
