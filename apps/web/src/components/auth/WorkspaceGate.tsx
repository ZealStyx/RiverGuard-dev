"use client";
import {
  useConvexAuth,
  useConvexConnectionState,
  useQuery_experimental,
} from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useFirebaseAuth } from "./FirebaseAuthProvider";
import { api } from "../../../../../convex/_generated/api";
import { convexConfigured } from "@/lib/convex-config";
import { accountDestination } from "@/lib/account-client";
import type { ProductRole } from "@/data/prototype";
type Props = { role: ProductRole; children: ReactNode };
export function WorkspaceGate(props: Props) {
  return convexConfigured ? (
    <Gate {...props} />
  ) : (
    <main className="p-6">
      Access cannot be verified: the workspace database is unavailable.
    </main>
  );
}
function Gate({ role, children }: Props) {
  const { user, loading } = useFirebaseAuth();
  const auth = useConvexAuth();
  const { isWebSocketConnected } = useConvexConnectionState();
  const router = useRouter();
  const result = useQuery_experimental({
    query: api.users.getCurrent,
    args: auth.isAuthenticated ? {} : "skip",
    throwOnError: false,
  });
  let destination: string | undefined;
  if (!loading && !user) destination = "/auth/login";
  else if (
    user &&
    !auth.isLoading &&
    auth.isAuthenticated &&
    isWebSocketConnected &&
    result.status === "success"
  ) {
    const account = result.data;
    if (!account || account.externalId === user.uid) {
      destination = accountDestination(account, user.emailVerified);
      if (
        account?.status === "active" &&
        user.emailVerified &&
        (account.role === role || account.additionalRoles?.includes(role))
      )
        destination = "allowed";
    }
  }
  useEffect(() => {
    if (destination && destination !== "allowed") router.replace(destination);
  }, [destination, router]);
  if (destination === "allowed") return children;
  return (
    <main className="p-6">
      {!isWebSocketConnected ||
      result.status === "error" ||
      (!auth.isLoading && !auth.isAuthenticated)
        ? "Access cannot be verified."
        : "Checking your RiverGuard access…"}{" "}
      <Link href="/auth/login">Return to sign in</Link>
    </main>
  );
}
