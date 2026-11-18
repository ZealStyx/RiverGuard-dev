"use client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

import { useFirebaseConvexAuth } from "@/components/auth/FirebaseAuthProvider";

const deploymentUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = deploymentUrl
  ? new ConvexReactClient(deploymentUrl)
  : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (convexClient === null) {
    return children;
  }

  return (
    <ConvexProviderWithAuth
      client={convexClient}
      useAuth={useFirebaseConvexAuth}
    >
      {children}
    </ConvexProviderWithAuth>
  );
}
