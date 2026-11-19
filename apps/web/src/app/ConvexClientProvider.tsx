"use client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

import { useFirebaseConvexAuth } from "@/components/auth/FirebaseAuthProvider";
import { convexDeploymentUrl } from "@/lib/convex-config";

/**
 * The URL arrives already validated — see lib/convex-config.ts. An unusable
 * value yields null here rather than a ConvexReactClient that throws during
 * render, so a typo costs the Convex features instead of the whole layout.
 */
const convexClient = convexDeploymentUrl
  ? new ConvexReactClient(convexDeploymentUrl)
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
