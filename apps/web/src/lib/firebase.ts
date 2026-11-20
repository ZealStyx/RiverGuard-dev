import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Whether this build has enough Firebase configuration to authenticate anyone.
 *
 * `apiKey` and `projectId` are the two values the SDK cannot invent; with them
 * missing the app is still fully usable in read-only form, it just cannot sign
 * anyone in.
 */
export const firebaseConfigured: boolean =
  typeof firebaseConfig.apiKey === "string" &&
  firebaseConfig.apiKey.length > 0 &&
  typeof firebaseConfig.projectId === "string" &&
  firebaseConfig.projectId.length > 0;

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

/**
 * The auth instance, created on first use — never at module load.
 *
 * `initializeApp()` with an empty API key throws `auth/invalid-api-key`, and
 * because this module is imported by the root layout that throw happened while
 * `next build` was prerendering `/_not-found`. A build with no Firebase
 * environment therefore failed outright. Returning `null` instead lets the
 * build finish and lets the UI report that sign-in is not configured.
 */
export function getFirebaseAuth(): Auth | null {
  if (!firebaseConfigured) return null;
  if (cachedAuth !== null) return cachedAuth;

  cachedApp = getApps()[0] ?? initializeApp(firebaseConfig);
  cachedAuth = getAuth(cachedApp);
  return cachedAuth;
}
