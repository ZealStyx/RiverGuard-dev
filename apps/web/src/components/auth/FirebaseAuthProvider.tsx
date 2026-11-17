"use client";

import {
  ConfirmationResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  onIdTokenChanged,
  RecaptchaVerifier,
  sendEmailVerification,
  signInWithPopup,
  signInWithPhoneNumber,
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

import { firebaseAuth } from "@/lib/firebase";

type FirebaseAuthContextValue = {
  getIdToken: () => Promise<string | null>;
  sendEmailVerification: () => Promise<void>;
  user: User | null;
  loading: boolean;
  createAccountWithEmail: (email: string, password: string) => Promise<User>;
  confirmSmsCode: (code: string) => Promise<User>;
  sendSmsCode: (phoneNumber: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  signOut: () => Promise<void>;
};

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | null>(
  null,
);

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);
  const smsConfirmation = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    return onIdTokenChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
    return result.user;
  }, []);

  const signInWithEmail = useCallback(
    (email: string, password: string) =>
      signInWithEmailAndPassword(firebaseAuth, email, password).then(
        (result) => result.user,
      ),
    [],
  );

  const createAccountWithEmail = useCallback(
    (email: string, password: string) =>
      createUserWithEmailAndPassword(firebaseAuth, email, password).then(
        (result) => result.user,
      ),
    [],
  );

  const sendSmsCode = useCallback(async (phoneNumber: string) => {
    if (recaptchaVerifier.current === null) {
      recaptchaVerifier.current = new RecaptchaVerifier(
        firebaseAuth,
        "recaptcha-container",
        { size: "invisible" },
      );
    }

    smsConfirmation.current = await signInWithPhoneNumber(
      firebaseAuth,
      phoneNumber,
      recaptchaVerifier.current,
    );
  }, []);

  const confirmSmsCode = useCallback(async (code: string) => {
    if (smsConfirmation.current === null) {
      throw new Error("Request a verification code first.");
    }

    const result = await smsConfirmation.current.confirm(code);
    smsConfirmation.current = null;
    return result.user;
  }, []);

  const signOut = useCallback(() => firebaseSignOut(firebaseAuth), []);
  const sendCurrentUserEmailVerification = useCallback(async () => {
    if (!user) {
      throw new Error("You must be signed in to verify your email.");
    }
    await sendEmailVerification(user);
  }, [user]);
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
      confirmSmsCode,
      signInWithEmail,
      signInWithGoogle,
      sendSmsCode,
      signOut,
    }),
    [
      createAccountWithEmail,
      confirmSmsCode,
      getIdToken,
      loading,
      sendCurrentUserEmailVerification,
      signInWithEmail,
      signInWithGoogle,
      sendSmsCode,
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
    throw new Error(
      "useFirebaseAuth must be used inside FirebaseAuthProvider",
    );
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
