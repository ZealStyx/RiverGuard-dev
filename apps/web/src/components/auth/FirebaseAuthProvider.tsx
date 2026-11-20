"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  onIdTokenChanged,
  sendEmailVerification,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { firebaseConfigured, getFirebaseAuth } from "@/lib/firebase";

type FirebaseAuthContextValue = {
  getIdToken: () => Promise<string | null>;
  sendEmailVerification: () => Promise<void>;
  user: User | null;
  loading: boolean;
  createAccountWithEmail: (email: string, password: string) => Promise<User>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  signOut: () => Promise<void>;
};

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | null>(
  null,
);

/**
 * Sign-in needs a configured SDK. Callers get a clear message instead of the
 * SDK's own `auth/invalid-api-key` when the deployment has no Firebase keys.
 */
function requireFirebaseAuth() {
  const auth = getFirebaseAuth();
  if (auth === null) {
    throw new Error(
      "Sign-in is not configured in this build. Set the NEXT_PUBLIC_FIREBASE_* variables to enable it.",
    );
  }
  return auth;
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // With no configuration there is no session to wait for, so start settled
  // rather than leaving every gate on "Checking your access…" forever.
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    const auth = getFirebaseAuth();
    // Nothing to subscribe to. `loading` already starts false in this build, so
    // there is no state to settle and no session to wait for.
    if (auth === null) return;
    return onIdTokenChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(
      requireFirebaseAuth(),
      new GoogleAuthProvider(),
    );
    return result.user;
  }, []);

  const signInWithEmail = useCallback(
    (email: string, password: string) =>
      signInWithEmailAndPassword(requireFirebaseAuth(), email, password).then(
        (result) => result.user,
      ),
    [],
  );

  const createAccountWithEmail = useCallback(
    (email: string, password: string) =>
      createUserWithEmailAndPassword(
        requireFirebaseAuth(),
        email,
        password,
      ).then((result) => result.user),
    [],
  );

  const signOut = useCallback(() => firebaseSignOut(requireFirebaseAuth()), []);
  const sendCurrentUserEmailVerification = useCallback(async () => {
    const currentUser = getFirebaseAuth()?.currentUser ?? null;
    if (!currentUser) {
      throw new Error("You must be signed in to verify your email.");
    }
    const origin =
      typeof window === "undefined" ? undefined : window.location.origin;
    await sendEmailVerification(
      currentUser,
      origin
        ? {
            url: `${origin}/auth/login`,
            handleCodeInApp: false,
          }
        : undefined,
    );
  }, []);
  const getIdToken = useCallback(
    () => (user ? user.getIdToken() : Promise.resolve(null)),
    [user],
  );

  const value = useMemo(
    () => ({
      getIdToken,
      sendEmailVerification: sendCurrentUserEmailVerification,
      user,
      loading,
      createAccountWithEmail,
      signInWithEmail,
      signInWithGoogle,
      signOut,
    }),
    [
      createAccountWithEmail,
      getIdToken,
      loading,
      sendCurrentUserEmailVerification,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      user,
    ],
  );

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (context === null) {
    throw new Error("useFirebaseAuth must be used inside FirebaseAuthProvider");
  }
  return context;
}

export function useFirebaseConvexAuth() {
  const { user, loading } = useFirebaseAuth();
  const fetchAccessToken = useCallback(
    ({ forceRefreshToken }: { forceRefreshToken: boolean }) =>
      user
        ? user.getIdToken(forceRefreshToken).catch(() => null)
        : Promise.resolve(null),
    [user],
  );

  return {
    isLoading: loading,
    isAuthenticated: user !== null,
    fetchAccessToken,
  };
}
