import type { AuthConfig } from "convex/server";

declare const process: {
  env: Record<string, string | undefined>;
};

const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!firebaseProjectId) {
  throw new Error(
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID must be set for Convex Firebase authentication",
  );
}

export default {
  providers: [
    {
      domain: `https://securetoken.google.com/${firebaseProjectId}`,
      applicationID: firebaseProjectId,
    },
  ],
} satisfies AuthConfig;
