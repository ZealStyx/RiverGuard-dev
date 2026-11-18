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
  const router = useRouter();
  const { user, loading: firebaseLoading } = useFirebaseAuth();
  const { isAuthenticated: convexAuthenticated, isLoading: convexLoading } =
    useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrent,
    convexAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (!firebaseLoading && user === null) {
      router.replace(`/auth/login?return=/${role}`);
      return;
    }
    if (currentUser && currentUser.role !== role) {
      router.replace(`/${currentUser.role}`);
    }
  }, [currentUser, firebaseLoading, role, router, user]);

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
