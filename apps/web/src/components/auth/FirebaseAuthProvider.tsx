"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
  type MultiFactorError,
  type UserCredential,
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
  useRef,
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

function Challenge({ finish }: { finish: (code: string | null) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={() => finish(null)}
      aria-labelledby="factor-title"
      className="m-auto rounded-lg bg-white p-6 backdrop:bg-black/40"
    >
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          finish(String(new FormData(e.currentTarget).get("code")));
        }}
      >
        <h2 id="factor-title">Confirm your sign-in</h2>
        <label>
          Authenticator app code
          <input
            name="code"
            className="block border p-2"
            required
            pattern="[0-9]{6}"
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </label>
        <button type="submit">Verify with Firebase</button>
        <button type="button" onClick={() => finish(null)}>
          Cancel sign-in
        </button>
      </form>
    </dialog>
  );
}
export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [challenge, setChallenge] = useState<
    ((code: string | null) => void) | null
  >(null);
  const completeSignIn = useCallback(
    async (operation: Promise<UserCredential>) => {
      try {
        return (await operation).user;
      } catch (error) {
        if (
          (error as MultiFactorError)?.code !==
          "auth/multi-factor-auth-required"
        )
          throw error;
        const resolver = getMultiFactorResolver(
          requireFirebaseAuth(),
          error as MultiFactorError,
        );
        const hint = resolver.hints.find((h) => h.factorId === "totp");
        if (!hint)
          throw new Error(
            "This account requires a factor not supported by this client.",
          );
        const code = await new Promise<string | null>((resolve) =>
          setChallenge(() => resolve),
        );
        setChallenge(null);
        if (!code) throw new Error("Sign-in cancelled.");
        return (
          await resolver.resolveSignIn(
            TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code.trim()),
          )
        ).user;
      }
    },
    [],
  );
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
    return completeSignIn(
      signInWithPopup(requireFirebaseAuth(), new GoogleAuthProvider()),
    );
  }, [completeSignIn]);

  const signInWithEmail = useCallback(
    (email: string, password: string) =>
      completeSignIn(
        signInWithEmailAndPassword(requireFirebaseAuth(), email, password),
      ),
    [completeSignIn],
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
      {challenge && <Challenge finish={challenge} />}
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
