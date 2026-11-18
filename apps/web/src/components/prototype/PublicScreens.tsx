"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  LockKey,
  Moon,
  ShieldCheck,
  SignOut,
  Sun,
  UserCircle,
  WaveSine,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { BuildStamp } from "@/components/BuildStamp";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui";
import { useFirebaseAuth } from "@/components/auth/FirebaseAuthProvider";
import type { ProductRole } from "@/data/prototype";
import { api } from "../../../../../convex/_generated/api";
import { useMutation } from "convex/react";

import { usePreference } from "@/lib/preferences";
import { useTheme } from "@/lib/theme";

import {
  ActionLink,
  CheckControl,
  Notice,
  PasswordField,
  PageHeading,
  SelectControl,
  StatusBadge,
  Stepper,
  Surface,
  TextAreaField,
  TextField,
} from "./Primitives";

function PublicShell({
  children,
  showPublicLinks = false,
}: {
  children: ReactNode;
  showPublicLinks?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sourceReturn = searchParams.get("from");
  const preservedReturn = searchParams.get("return");
  const isInformationPage = [
    "/about",
    "/methodology",
    "/official-sources",
  ].includes(pathname);
  const informationParent = isInformationPage ? pathname : sourceReturn;
  const informationReturn =
    pathname === "/methodology" ? sourceReturn : preservedReturn;
  const informationQuery = informationParent
    ? `?from=${encodeURIComponent(informationParent)}${
        informationReturn
          ? `&return=${encodeURIComponent(informationReturn)}`
          : ""
      }`
    : "";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="flex min-h-16 items-center border-b border-line px-4 sm:px-6">
        <Link href="/welcome" className="flex items-center gap-2">
          <WaveSine size={30} weight="bold" />
          <span className="text-section">RiverGuard</span>
        </Link>
        {showPublicLinks ? (
          <nav
            className="text-navigation ml-auto hidden items-center gap-4 sm:flex"
            aria-label="Public navigation"
          >
            <Link href={`/about${informationQuery}`}>About</Link>
            <Link href={`/official-sources${informationQuery}`}>
              Official sources
            </Link>
          </nav>
        ) : null}
      </header>
      {children}
      <div className="text-metadata border-t border-line px-4 py-3 text-right text-muted sm:px-6">
        <BuildStamp />
      </div>
    </div>
  );
}

export function WelcomeScreen() {
  return (
    <PublicShell showPublicLinks>
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-8 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-metadata font-semibold uppercase tracking-[0.14em] text-brand-secondary-ink">
            NCR flood-risk research workspace
          </p>
          <h1 className="mt-3 max-w-3xl text-[clamp(2.25rem,6vw,5rem)] leading-[0.98] font-semibold tracking-[-0.055em]">
            Evidence before assumptions.
          </h1>
          <p className="text-body mt-5 max-w-2xl text-muted">
            RiverGuard is a local decision-support platform for exploring
            city-level flood-risk data, experimental forecasts, model evidence,
            and controlled review workflows.
          </p>
          <div className="mt-5">
            <ActionLink href="/auth/login">
              Get started <ArrowRight size={14} />
            </ActionLink>
          </div>
        </div>
      </main>
    </PublicShell>
  );
}

function AuthLayout({
  children,
  title,
  description,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <PublicShell>
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 px-5 py-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(380px,0.55fr)]">
        <div className="hidden lg:block">
          <p className="text-metadata font-semibold uppercase tracking-[0.14em] text-brand-secondary-ink">
            RiverGuard account
          </p>
          <h1 className="text-[2.75rem] mt-3 leading-none font-semibold tracking-[-0.05em]">
            Research access with clear responsibility.
          </h1>
          <p className="text-body mt-4 max-w-xl text-muted">
            Privileged roles require invitation or administrator approval.
          </p>
          <p className="text-metadata mt-4 max-w-xl text-muted">
            Privileged access is assigned by an administrator after identity and
            organization review.
          </p>
        </div>
        <Surface className="p-5 sm:p-6" title={title} description={description}>
          {children}
        </Surface>
      </main>
    </PublicShell>
  );
}

function LoginForm() {
  const router = useRouter();
  const {
    confirmSmsCode,
    sendSmsCode,
    signInWithEmail,
    signInWithGoogle,
    signOut,
  } = useFirebaseAuth();
  const ensureCurrent = useMutation(api.users.ensureCurrent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [method, setMethod] = useState<"email" | "google" | "sms">("email");
  async function finishSignIn() {
    await ensureCurrent({});
    router.push("/resident");
  }
  async function signInWithGoogleAccount() {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
      await finishSignIn();
    } catch (signInError) {
      setLoading(false);
      setError(formatAuthError(signInError));
    }
  }
  async function signInWithEmailAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const signedInUser = await signInWithEmail(
        String(formData.get("login-email")).trim(),
        String(formData.get("login-password")),
      );
      if (!signedInUser.emailVerified) {
        await signOut();
        throw new Error("Please verify your email address before signing in.");
      }
      await finishSignIn();
    } catch (signInError) {
      setLoading(false);
      setError(formatAuthError(signInError));
    }
  }
  async function sendSms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const formData = new FormData(event.currentTarget);
      await sendSmsCode(String(formData.get("login-phone")).trim());
      setSmsSent(true);
    } catch (signInError) {
      setError(formatAuthError(signInError));
    } finally {
      setLoading(false);
    }
  }
  async function verifySms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const formData = new FormData(event.currentTarget);
      await confirmSmsCode(String(formData.get("login-code")).trim());
      await finishSignIn();
    } catch (signInError) {
      setLoading(false);
      setError(formatAuthError(signInError));
    }
  }
  return (
    <div className="grid gap-4">
      {error ? <p className="text-metadata text-danger">{error}</p> : null}
      <div className="overflow-hidden rounded-control border border-line bg-surface shadow-sm">
        <div
          className="flex items-end gap-1 border-b border-line bg-canvas px-2 pt-2"
          role="tablist"
          aria-label="Sign-in method"
        >
          {(["email", "google", "sms"] as const).map((tab) => {
            const labels = {
              email: "Email",
              google: "Google",
              sms: "SMS",
            };
            const isActive = method === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setMethod(tab)}
                className={`text-metadata relative rounded-t-control border border-b-0 px-3 py-2 transition ${
                  isActive
                    ? "z-10 -mb-px border-line bg-surface font-semibold text-ink"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
        <div className="grid gap-4 p-4 sm:p-5" role="tabpanel">
          {method === "email" ? (
            <form onSubmit={signInWithEmailAccount} className="grid gap-3">
              <TextField
                id="login-email"
                label="Email"
                type="email"
                name="login-email"
                autoComplete="email"
                required
              />
              <PasswordField
                id="login-password"
                label="Password"
                name="login-password"
                autoComplete="current-password"
                required
              />
              <Link
                href="/auth/forgot-password"
                className="text-metadata text-brand-primary-ink"
              >
                Forgot password?
              </Link>
              <Button
                type="submit"
                loading={loading}
                loadingLabel="Logging in"
                className="w-full"
              >
                Log in with email
              </Button>
            </form>
          ) : null}
          {method === "google" ? (
            <div className="grid gap-3">
              <p className="text-metadata text-muted">
                Use your Google account to securely sign in to RiverGuard.
              </p>
              <Button
                type="button"
                onClick={signInWithGoogleAccount}
                loading={loading}
                loadingLabel="Connecting to Google"
                className="w-full"
              >
                Continue with Google
              </Button>
            </div>
          ) : null}
          {method === "sms" ? (
            !smsSent ? (
              <form onSubmit={sendSms} className="grid gap-3">
                <TextField
                  id="login-phone"
                  label="Mobile number"
                  type="tel"
                  name="login-phone"
                  autoComplete="tel"
                  placeholder="+63 912 345 6789"
                  required
                />
                <Button
                  type="submit"
                  loading={loading}
                  loadingLabel="Sending code"
                  className="w-full"
                >
                  Continue with SMS
                </Button>
              </form>
            ) : (
              <form onSubmit={verifySms} className="grid gap-3">
                <TextField
                  id="login-code"
                  label="Verification code"
                  inputMode="numeric"
                  name="login-code"
                  autoComplete="one-time-code"
                  required
                />
                <Button
                  type="submit"
                  loading={loading}
                  loadingLabel="Verifying code"
                  className="w-full"
                >
                  Verify SMS code
                </Button>
              </form>
            )
          ) : null}
        </div>
      </div>
      <div id="recaptcha-container" />
      <Link
        href="/auth/signup"
        className="text-metadata text-center text-brand-primary-ink"
      >
        New to RiverGuard? Create Account
      </Link>
      <div className="border-t border-line pt-3 text-center">
        <Link href="/welcome" className="text-metadata text-muted">
          Back to Home
        </Link>
      </div>
    </div>
  );
}

function ResidentSignup() {
  const router = useRouter();
  const {
    createAccountWithEmail,
    sendEmailVerification,
    sendSmsCode,
    signInWithGoogle,
  } = useFirebaseAuth();
  const ensureCurrent = useMutation(api.users.ensureCurrent);
  const [role, setRole] = useState("resident");
  const [method, setMethod] = useState<"email" | "google" | "sms">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      if (method === "google") {
        await signInWithGoogle();
        await ensureCurrent({});
        router.push(`/onboarding/${role}`);
        return;
      }

      if (method === "sms") {
        await sendSmsCode(String(formData.get("signup-phone")).trim());
        router.push(`/auth/verify?role=${role}&source=signup-sms`);
        return;
      }

      const password = String(formData.get("signup-password"));
      const confirmation = String(formData.get("signup-confirm"));
      if (password !== confirmation) {
        throw new Error("Passwords do not match.");
      }
      await createAccountWithEmail(
        String(formData.get("signup-email")).trim(),
        password,
      );
      await sendEmailVerification();
      router.push(`/auth/verify?role=${role}&source=signup`);
    } catch (signupError) {
      setError(formatAuthError(signupError));
    } finally {
      setLoading(false);
    }
  };
  return (
    <form className="grid gap-3" onSubmit={submit}>
      {error ? <p className="text-metadata text-danger">{error}</p> : null}
      <SelectControl
        id="signup-role"
        label="Account type"
        value={role}
        onChange={(event) => setRole(event.target.value)}
      >
        <option value="resident">Resident</option>
        <option value="lgu">LGU operator</option>
      </SelectControl>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button
          type="button"
          variant={method === "email" ? "primary" : "secondary"}
          onClick={() => setMethod("email")}
        >
          Email
        </Button>
        <Button
          type="button"
          variant={method === "google" ? "primary" : "secondary"}
          onClick={() => setMethod("google")}
        >
          Google
        </Button>
        <Button
          type="button"
          variant={method === "sms" ? "primary" : "secondary"}
          onClick={() => setMethod("sms")}
        >
          SMS
        </Button>
      </div>
      {method === "google" ? (
        <p className="text-metadata text-muted">
          Continue with Google to create your RiverGuard account.
        </p>
      ) : null}
      {method === "sms" ? (
        <TextField
          id="signup-phone"
          name="signup-phone"
          label="Mobile number"
          type="tel"
          autoComplete="tel"
          placeholder="+63 912 345 6789"
          required
        />
      ) : null}
      {method === "email" ? (
        <>
          <TextField
            id="signup-name"
            name="signup-name"
            label="Full name"
            required
          />
          <TextField
            id="signup-email"
            name="signup-email"
            label="Email"
            type="email"
            required
          />
          <PasswordField
            id="signup-password"
            name="signup-password"
            label="Password"
            required
            hint="Use at least 12 characters in a production system."
          />
          <PasswordField
            id="signup-confirm"
            name="signup-confirm"
            label="Confirm password"
            required
          />
        </>
      ) : null}
      {role === "resident" ? (
        <SelectControl id="signup-city" label="Primary city">
          <option>Marikina</option>
          <option>Quezon City</option>
          <option>Manila</option>
          <option>Pasig</option>
          <option>Unsupported area</option>
        </SelectControl>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            id="signup-organization"
            label={role === "lgu" ? "LGU or agency" : "Organization"}
            required
          />
          <SelectControl id="signup-area" label="Requested area" required>
            <option>Marikina</option>
            <option>Quezon City</option>
            <option>Manila</option>
            <option>Pasig</option>
          </SelectControl>
          <div className="sm:col-span-2">
            <TextAreaField
              id="signup-purpose"
              label={
                role === "lgu" ? "Operational purpose" : "Research purpose"
              }
              required
              placeholder="Tell us how you plan to use RiverGuard."
            />
          </div>
        </div>
      )}
      <CheckControl
        id="signup-terms"
        label="Accept future terms and privacy notice"
        description="This refers to RiverGuard’s terms of use, privacy notice, and authorized-use limitations."
        required
      />
      <CheckControl
        id="signup-notifications"
        label="Receive RiverGuard notifications"
        description="Optional and separate from account consent."
      />
      <Button type="submit" loading={loading} className="w-full">
        {method === "google"
          ? "Create with Google"
          : method === "sms"
            ? "Send SMS code"
            : "Create Account"}
      </Button>
      <Link
        href="/auth/login"
        className="text-metadata text-center text-brand-primary-ink"
      >
        Already have an account? Log in
      </Link>
    </form>
  );
}

function formatAuthError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Sign-in failed. Please try again.";
  }

  if (error.message.includes("auth/invalid-credential")) {
    return "The email or password is incorrect.";
  }
  if (error.message.includes("auth/too-many-requests")) {
    return "Too many attempts. Try again later.";
  }
  if (error.message.includes("auth/operation-not-allowed")) {
    return "Email/password sign-in is not enabled in Firebase yet.";
  }
  if (error.message.includes("auth/popup-closed-by-user")) {
    return "Google sign-in was cancelled.";
  }
  return error.message;
}

function AccessRequest() {
  const router = useRouter();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        router.push("/auth/verify?role=lgu&source=access");
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id="access-name" label="Full name" required />
        <TextField id="access-email" label="Work email" type="email" required />
        <TextField id="access-org" label="Organization" required />
        <TextField
          id="access-role"
          name="access-role"
          label="Requested role"
          value="LGU operator"
          readOnly
        />
        <SelectControl id="access-location" label="Requested area">
          <option>Marikina</option>
          <option>Quezon City</option>
          <option>Manila</option>
          <option>Pasig</option>
        </SelectControl>
        <TextField id="access-reference" label="Reference or contact" />
      </div>
      <TextAreaField
        id="access-reason"
        label="Reason for access"
        required
        placeholder="Explain the research or authorized operational purpose…"
      />
      <CheckControl
        id="access-acknowledge"
        label="Authorized-use acknowledgement"
        required
        description="Requesting a role does not grant it."
      />
      <Button type="submit" className="w-full">
        Submit access request
      </Button>
      <Link
        href="/auth/login"
        className="text-metadata text-center text-brand-primary-ink underline"
      >
        Cancel and return to login
      </Link>
    </form>
  );
}

function Verification() {
  const params = useSearchParams();
  const { confirmSmsCode, user, sendEmailVerification } = useFirebaseAuth();
  const ensureCurrent = useMutation(api.users.ensureCurrent);
  const [verified, setVerified] = useState(false);
  const [resent, setResent] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [checking, setChecking] = useState(false);
  const [code, setCode] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const codeInputs = useRef<Array<HTMLInputElement | null>>([]);
  const role = params.get("role") ?? "lgu";
  const source = params.get("source") ?? "access";
  const isEmailVerification = source === "signup";
  const isSmsVerification = source === "signup-sms";
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = window.setInterval(
      () => setSecondsRemaining((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [secondsRemaining]);
  if (verified)
    return (
      <AuthSuccess
        title="Identity verified"
        description={
          role === "resident"
            ? "Your account has been verified and is ready for onboarding."
            : "Your role request is now pending administrator approval."
        }
        href={
          role === "resident"
            ? "/onboarding/resident"
            : source === "invitation"
              ? `/auth/mfa?role=${role}&source=invitation`
              : `/auth/pending?role=${role}`
        }
        action={
          role === "resident" ? "Continue to onboarding" : "View request status"
        }
      />
    );
  return (
    <div className="grid min-w-0 gap-3">
      {isEmailVerification ? (
        <Notice
          title={resent ? "Verification email resent" : "Check your email"}
        >
          We sent a verification link to {user?.email ?? "your email address"}.
          Open the email and click the link to confirm your address.
        </Notice>
      ) : isSmsVerification ? (
        <Notice title="SMS code sent">
          A six-digit verification code was sent to your mobile number.
        </Notice>
      ) : (
        <Notice title={resent ? "New code sent" : "Code sent"}>
          A verification code was sent to re••••••@example.com.
        </Notice>
      )}
      {isSmsVerification ? (
        <TextField
          id="signup-sms-code"
          name="signup-sms-code"
          label="Six-digit verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          required
        />
      ) : null}
      {!isEmailVerification && !isSmsVerification ? (
        <div className="grid w-full gap-1.5">
          <span className="text-button">Six-digit code</span>
          <div
            className="grid min-w-0 grid-cols-6 gap-2"
            aria-label="Six-digit verification code"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <input
                key={index}
                ref={(element) => {
                  codeInputs.current[index] = element;
                }}
                aria-label={`Digit ${index + 1}`}
                className="text-body h-11 min-w-0 w-full rounded-control border border-line bg-canvas text-center text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                inputMode="numeric"
                maxLength={1}
                value={code[index] ?? ""}
                onChange={(event) => {
                  const digit = event.target.value.replace(/\D/g, "").slice(-1);
                  const next = code.padEnd(6, "").split("");
                  next[index] = digit;
                  setCode(next.join("").slice(0, 6));
                  if (digit && index < 5)
                    codeInputs.current[index + 1]?.focus();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !code[index] && index > 0) {
                    codeInputs.current[index - 1]?.focus();
                  }
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
      {verificationError ? (
        <p className="text-metadata text-danger">{verificationError}</p>
      ) : null}
      {!isSmsVerification ? (
        <div className="mt-1 flex items-center justify-between text-metadata">
          <button
            type="button"
            disabled={secondsRemaining > 0}
            onClick={() => {
              if (isEmailVerification) {
                void sendEmailVerification().then(
                  () => setResent(true),
                  (error: unknown) =>
                    setVerificationError(formatAuthError(error)),
                );
              } else {
                setResent(true);
                setCode("");
                setSecondsRemaining(60);
              }
            }}
            className={
              secondsRemaining > 0
                ? "cursor-not-allowed text-muted"
                : "text-brand-primary-ink"
            }
          >
            {isEmailVerification
              ? resent
                ? "Email resent"
                : "Resend verification email"
              : resent
                ? "Code resent"
                : "Resend code"}
          </button>
          <span className="text-muted">
            Expires in 00:{String(secondsRemaining).padStart(2, "0")}
          </span>
        </div>
      ) : null}
      <Button
        loading={checking}
        onClick={async () => {
          if (!isEmailVerification) {
            if (isSmsVerification) {
              try {
                await confirmSmsCode(code);
                await ensureCurrent({});
                setVerified(true);
              } catch (error) {
                setVerificationError(formatAuthError(error));
              }
              return;
            }
            setVerified(true);
            return;
          }
          setChecking(true);
          setVerificationError("");
          try {
            await user?.reload();
            if (!user?.emailVerified) {
              throw new Error(
                "Click the verification link in your email first.",
              );
            }
            await ensureCurrent({});
            setVerified(true);
          } catch (error) {
            setVerificationError(formatAuthError(error));
          } finally {
            setChecking(false);
          }
        }}
        className="w-full"
      >
        {isEmailVerification ? "I verified my email" : "Verify"}
      </Button>
      <div className="text-center text-metadata">
        <Link href="/auth/login" className="text-brand-primary-ink">
          Back to login
        </Link>
      </div>
    </div>
  );
}

function PendingApproval() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get("role") ?? "lgu";
  const [approved, setApproved] = useState(false);
  if (approved)
    return (
      <AuthSuccess
        title="Access approved"
        description="Your role-specific onboarding is ready to begin."
        href={`/onboarding/${role}`}
        action="Begin onboarding"
      />
    );
  return (
    <div className="grid gap-3">
      <div className="flex justify-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-brand-secondary-soft text-brand-secondary-ink">
          <ShieldCheck size={26} />
        </span>
      </div>
      <div className="text-center">
        <p className="text-section">LGU operator access requested</p>
        <p className="text-body mt-1 text-muted">
          Submitted · Verification complete
        </p>
      </div>
      <div className="rounded-control bg-canvas-soft p-3 text-body">
        <p>
          <strong>Status:</strong> Pending administrator approval
        </p>
        <p className="mt-1 text-muted">
          You cannot enter a protected workspace until the request is approved.
        </p>
      </div>
      <Button
        variant="quiet"
        className="w-full"
        onClick={() => {
          setApproved(true);
          router.refresh();
        }}
      >
        Refresh status
      </Button>
      <ActionLink href="/auth/logout" variant="quiet" className="w-full">
        Log out
      </ActionLink>
    </div>
  );
}

function PasswordRecovery({ reset }: { reset?: boolean }) {
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <AuthSuccess
        title={reset ? "Password reset complete" : "Check your email"}
        description={
          reset
            ? "The sample password was updated."
            : "If an account exists, reset instructions have been prepared."
        }
        href="/auth/login"
        action="Continue to login"
      />
    );
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setSent(true);
      }}
    >
      {reset ? (
        <>
          <PasswordField id="new-password" label="New password" required />
          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            required
          />
        </>
      ) : (
        <TextField
          id="recovery-email"
          label="Account email"
          type="email"
          required
        />
      )}
      <Button type="submit" className="w-full">
        {reset ? "Reset password" : "Send reset link"}
      </Button>
      <Link
        href="/auth/login"
        className="text-metadata text-center text-brand-primary-ink underline"
      >
        Back to login
      </Link>
    </form>
  );
}

function MfaScreen() {
  const params = useSearchParams();
  const role = params.get("role") ?? "admin";
  const [verified, setVerified] = useState(false);
  if (verified)
    return (
      <AuthSuccess
        title="MFA verified"
        description="The sample security challenge is complete."
        href={`/onboarding/${role}`}
        action="Continue to workspace"
      />
    );
  return (
    <div className="grid gap-3">
      <Notice title="Security challenge">
        Enter a code from the configured authentication method.
      </Notice>
      <TextField
        id="mfa-code"
        label="Authentication code"
        inputMode="numeric"
        defaultValue="123456"
      />
      <Button className="w-full" onClick={() => setVerified(true)}>
        Verify
      </Button>
      <Button className="w-full" variant="quiet">
        Use recovery code
      </Button>
    </div>
  );
}

function Invitation() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get("role") ?? "lgu";
  const [accepted, setAccepted] = useState(false);
  if (accepted)
    return (
      <AuthSuccess
        title="Invitation accepted"
        description="Complete the role-specific onboarding to enter the sample workspace."
        href={`/auth/verify?role=${role}&source=invitation`}
        action="Begin onboarding"
      />
    );
  return (
    <div className="grid gap-3">
      <Notice title="Marikina DRRMO invitation">
        Assigned role: LGU operator · Assigned area: Marikina.
      </Notice>
      <TextField
        id="invite-name"
        label="Confirm full name"
        defaultValue="Liza Torres"
      />
      <PasswordField id="invite-password" label="Create password" />
      <CheckControl id="invite-use" label="Accept authorized-use notice" />
      <Button onClick={() => setAccepted(true)} className="w-full">
        Accept invitation
      </Button>
      <Button
        variant="quiet"
        className="w-full"
        onClick={() => router.push("/welcome")}
      >
        Decline
      </Button>
      <Link
        href="/auth/request-access"
        className="text-metadata text-center text-brand-primary-ink underline"
      >
        Report an incorrect invitation
      </Link>
    </div>
  );
}

function AccountProblem({ screen }: { screen: string }) {
  const content: Record<string, [string, string, string]> = {
    rejected: [
      "Access request not approved",
      "Your sample request was not approved. A neutral administrator note may be shown when appropriate.",
      "Contact administrator",
    ],
    suspended: [
      "Account suspended",
      "Access is temporarily unavailable. Contact the administrator for non-sensitive guidance.",
      "Contact administrator",
    ],
    locked: [
      "Account locked",
      "Too many attempts or a security event requires account recovery.",
      "Recover account",
    ],
    unauthorized: [
      "Permission required",
      "This account does not have access to the requested workspace.",
      "Return to role home",
    ],
    unavailable: [
      "Authentication unavailable",
      "The identity service cannot be reached. Your entered information has been preserved.",
      "Try again",
    ],
    "session-expired": [
      "Session expired",
      "Log in again to continue. Your safe return destination will be retained.",
      "Log in again",
    ],
    "invitation-expired": [
      "Invitation expired",
      "This invitation can no longer be accepted. Request a new invitation from the assigning administrator.",
      "Return to login",
    ],
    "verification-expired": [
      "Verification link expired",
      "Request a new verification link before continuing the account flow.",
      "Return to verification",
    ],
  };
  const [title, description, action] = content[screen] ?? content.unauthorized;
  return (
    <div className="grid gap-3 text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-warning/10 text-warning">
        <LockKey size={24} />
      </span>
      <div>
        <p className="text-section">{title}</p>
        <p className="text-body mt-1 text-muted">{description}</p>
      </div>
      <ActionLink
        href={screen === "unauthorized" ? "/admin/research" : "/auth/login"}
      >
        {action}
      </ActionLink>
    </div>
  );
}

/**
 * Ends the Firebase session, then says so.
 *
 * The screen used to announce "You have been logged out" without signing
 * anything out, so the browser kept a live session while telling the operator it
 * had ended. The sign-out now runs on mount and the wording follows its result.
 */
function LogoutScreen() {
  const { user, loading, signOut } = useFirebaseAuth();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    signOut()
      .then(() => {
        if (active) setDone(true);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Sign-out did not complete.",
          );
      });
    return () => {
      active = false;
    };
  }, [signOut]);

  const settled = done || (!loading && user === null);

  return (
    <div className="grid gap-3 text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-brand-secondary-soft text-brand-secondary-ink">
        <SignOut size={24} />
      </span>
      <div>
        <p className="text-section">
          {error
            ? "Sign-out did not complete"
            : settled
              ? "You have been logged out"
              : "Signing out…"}
        </p>
        <p className="text-body mt-1 text-muted">
          {error
            ? error
            : settled
              ? "Your RiverGuard session has ended."
              : "Ending the session held by this browser."}
        </p>
      </div>
      <ActionLink href="/auth/login">Return to login</ActionLink>
      <ActionLink href="/welcome" variant="quiet">
        Public view
      </ActionLink>
    </div>
  );
}

function AuthSuccess({
  action,
  description,
  href,
  title,
}: {
  action: string;
  description: string;
  href: string;
  title: string;
}) {
  return (
    <div className="grid gap-3 text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle size={26} weight="fill" />
      </span>
      <div>
        <p className="text-section">{title}</p>
        <p className="text-body mt-1 text-muted">{description}</p>
      </div>
      <ActionLink href={href}>{action}</ActionLink>
    </div>
  );
}

export function AuthScreen({ screen }: { screen: string }) {
  const titles: Record<string, [string, string]> = {
    login: ["Log in", "Sign in to your RiverGuard workspace."],
    signup: [
      "Create Account",
      "Save locations and preferences in a future public experience.",
    ],
    "request-access": [
      "Request staff access",
      "LGU operator access requires administrator approval. Administrator access is invitation-only.",
    ],
    verify: ["Verify identity", "Confirm the account destination."],
    pending: [
      "Pending approval",
      "Track the status of a privileged-role request.",
    ],
    "forgot-password": [
      "Forgot password",
      "Request neutral account-recovery guidance.",
    ],
    "reset-password": ["Reset password", "Choose a new sample password."],
    mfa: [
      "Multi-factor authentication",
      "Complete the required security challenge.",
    ],
    invitation: [
      "Accept invitation",
      "Review the assigned role, area, and authorized-use notice.",
    ],
    logout: ["Signed out", "Your RiverGuard session has ended."],
  };
  const [title, description] = titles[screen] ?? [
    "Account status",
    "Review the account state and available next action.",
  ];
  let content: ReactNode;
  if (screen === "login") content = <LoginForm />;
  else if (screen === "signup") content = <ResidentSignup />;
  else if (screen === "request-access") content = <AccessRequest />;
  else if (screen === "verify") content = <Verification />;
  else if (screen === "pending") content = <PendingApproval />;
  else if (screen === "forgot-password") content = <PasswordRecovery />;
  else if (screen === "reset-password") content = <PasswordRecovery reset />;
  else if (screen === "mfa") content = <MfaScreen />;
  else if (screen === "invitation") content = <Invitation />;
  else if (screen === "logout") content = <LogoutScreen />;
  else content = <AccountProblem screen={screen} />;
  return (
    <AuthLayout title={title} description={description}>
      {content}
    </AuthLayout>
  );
}

const onboardingContent: Record<
  ProductRole,
  { steps: string[]; title: string; destination: string }
> = {
  resident: {
    title: "Resident onboarding",
    destination: "/resident",
    steps: ["Welcome", "Locations", "Preferences", "Safety"],
  },
  lgu: {
    title: "LGU operator onboarding",
    destination: "/lgu",
    steps: [
      "Assignment",
      "Authority",
      "Review flow",
      "Notes",
      "Notifications",
      "Safety",
      "Ready",
    ],
  },
  admin: {
    title: "Administrator onboarding",
    destination: "/admin",
    steps: [
      "Assignment",
      "MFA",
      "Role policy",
      "Research tools",
      "Methodology",
      "Configuration",
      "Audit",
      "Security",
      "Ready",
    ],
  },
};

export function OnboardingScreen({ role }: { role: ProductRole }) {
  const config = onboardingContent[role];
  const [step, setStep] = useState(0);
  const router = useRouter();
  const isLast = step === config.steps.length - 1;
  const profileStep = (
    <div key="profile" className="grid gap-3 sm:grid-cols-2">
      <TextField
        id="onboard-name"
        label="Full name"
        defaultValue={role === "resident" ? "Resident user" : "RiverGuard user"}
      />
      <TextField
        id="onboard-org"
        label="Organization"
        defaultValue={
          role === "lgu"
            ? "Marikina DRRMO"
            : role === "admin"
              ? "RiverGuard research"
              : "University research team"
        }
      />
    </div>
  );
  const coverageStep = (
    <Notice
      key="coverage"
      title={
        role === "lgu"
          ? "Review is not warning authority"
          : "Supported sample geography"
      }
      tone="warning"
    >
      {role === "lgu"
        ? "Use the review and escalation process. RiverGuard cannot issue official warnings."
        : "RiverGuard currently represents city-level views for four NCR cities, not barangay or street-level evidence."}
    </Notice>
  );
  const tourStep = (
    <div key="tour">
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          "Role dashboard",
          "Map and locations",
          "Evidence and provenance",
          "Help and limitations",
        ].map((item) => (
          <div
            key={item}
            className="rounded-control border border-line bg-canvas-soft p-3"
          >
            <p className="text-button">{item}</p>
            <p className="text-metadata mt-1 text-muted">
              Available from your RiverGuard workspace.
            </p>
          </div>
        ))}
      </div>
      <Notice
        title="Ready to enter the workspace"
        tone="success"
        className="mt-3"
      >
        You can revisit methodology and limitations from every role shell.
      </Notice>
    </div>
  );
  const content =
    role === "resident"
      ? [
          <Notice key="welcome" title="Welcome to RiverGuard">
            Review experimental outlooks as decision-support information and
            confirm official advisories before taking action.
          </Notice>,
          <div key="locations" className="grid gap-3 sm:grid-cols-2">
            <SelectControl id="resident-primary-city" label="Primary city">
              <option>Marikina</option>
              <option>Quezon City</option>
              <option>Manila</option>
              <option>Pasig</option>
            </SelectControl>
            <SelectControl
              id="resident-additional-cities"
              label="Additional locations"
            >
              <option>None</option>
              <option>Quezon City</option>
              <option>Manila</option>
              <option>Pasig</option>
            </SelectControl>
          </div>,
          <div key="resident-preferences" className="grid gap-2">
            <CheckControl
              id="resident-notifications"
              label="Receive outlook notifications"
            />
            <CheckControl
              id="resident-accessibility"
              label="Prefer chart table alternatives"
            />
          </div>,
          <div key="resident-safety" className="grid gap-3">
            <Notice title="Official advisories remain primary" tone="warning">
              RiverGuard provides experimental research outputs. Check PAGASA
              and your LGU for official advisories and evacuation instructions.
            </Notice>
            <CheckControl
              id="resident-responsible-use"
              label="I understand the experimental-use limitations"
              required
            />
          </div>,
        ]
      : role === "lgu"
        ? [
            profileStep,
            <Notice
              key="lgu-authority"
              title="Review is not warning authority"
              tone="warning"
            >
              RiverGuard cannot issue official warnings or evacuation
              instructions.
            </Notice>,
            <Surface key="lgu-review" title="Review workflow">
              <p className="text-body text-muted">
                Inspect the latest outlook, review quality warnings, record an
                internal assessment, and escalate for authorized action.
              </p>
            </Surface>,
            <CheckControl
              key="lgu-notes"
              id="lgu-notes"
              label="Enable internal review notes"
            />,
            <CheckControl
              key="lgu-notifications"
              id="lgu-notifications"
              label="Receive assigned-area review notifications"
            />,
            <CheckControl
              key="lgu-safety"
              id="lgu-authorized-use"
              label="I understand the authorized-use limitations"
              required
            />,
            <Notice key="lgu-ready" title="Ready for review" tone="success">
              Your assigned-area dashboard and review queue are ready.
            </Notice>,
          ]
        : [
            profileStep,
            <Notice key="admin-mfa" title="Secure administrator access">
              Complete multi-factor authentication before managing users or
              system configuration.
            </Notice>,
            <CheckControl
              key="admin-policy"
              id="admin-role-policy"
              label="I understand role and location assignment policy"
              required
            />,
            tourStep,
            coverageStep,
            <Surface key="admin-configuration" title="Configuration readiness">
              <p className="text-body text-muted">
                Review supported locations, provider status, model versions, and
                data-source readiness.
              </p>
            </Surface>,
            <Surface key="admin-audit" title="Audit responsibilities">
              <p className="text-body text-muted">
                Access changes and configuration updates are recorded for
                authorized review.
              </p>
            </Surface>,
            <CheckControl
              key="admin-security"
              id="admin-security"
              label="I understand administrator security responsibilities"
              required
            />,
            <Notice
              key="admin-ready"
              title="Ready for administration"
              tone="success"
            >
              Research tools, user requests, configuration, and audit tools are
              ready.
            </Notice>,
          ];
  return (
    <PublicShell>
      <main className="mx-auto max-w-5xl px-5 py-8">
        <PageHeading
          title={config.title}
          eyebrow={`${role} workspace`}
          description="Complete the role-specific introduction before opening the workspace."
        />
        <Surface>
          <Stepper steps={config.steps} current={step} />
          <div className="my-6 min-h-48">{content[step]}</div>
          <div className="flex justify-between">
            <Button
              size="small"
              variant="quiet"
              disabled={step === 0}
              onClick={() => setStep((value) => value - 1)}
            >
              <ArrowLeft size={14} /> Back
            </Button>
            <Button
              size="small"
              onClick={() =>
                isLast
                  ? router.push(config.destination)
                  : setStep((value) => value + 1)
              }
            >
              {isLast ? "Go to workspace" : "Continue"} <ArrowRight size={14} />
            </Button>
          </div>
        </Surface>
      </main>
    </PublicShell>
  );
}

export function PublicInfoScreen({
  screen,
}: {
  screen: "about" | "methodology" | "official-sources";
}) {
  const params = useSearchParams();
  const requestedReturn = params.get("from");
  const preservedReturn = params.get("return");
  const validWorkspaceReturn =
    preservedReturn && /^\/(resident|lgu|admin)(?:\/.*)?$/.test(preservedReturn)
      ? preservedReturn
      : null;
  const informationReturn =
    requestedReturn &&
    ["/about", "/methodology", "/official-sources"].includes(requestedReturn)
      ? `${requestedReturn}${validWorkspaceReturn ? `?from=${encodeURIComponent(validWorkspaceReturn)}` : ""}`
      : null;
  const returnHref =
    informationReturn ??
    (requestedReturn &&
    /^\/(resident|lgu|admin)(?:\/.*)?$/.test(requestedReturn)
      ? requestedReturn
      : "/welcome");
  const returnLabel =
    returnHref === "/welcome"
      ? "Back"
      : requestedReturn === "/methodology"
        ? "Back to methodology"
        : requestedReturn === "/about"
          ? "Back to About"
          : requestedReturn === "/official-sources"
            ? "Back to official sources"
            : "Back to dashboard";
  const content = {
    about: {
      title: "About RiverGuard",
      eyebrow: "Research platform",
      description:
        "An NCR decision-support research platform for traceable experimental flood-risk workflows.",
    },
    methodology: {
      title: "Methodology and limitations",
      eyebrow: "Help and definitions",
      description:
        "Understand data resolution, model responsibility, uncertainty, provenance, and unsupported claims.",
    },
    "official-sources": {
      title: "Official advisories and sources",
      eyebrow: "Authoritative information",
      description:
        "RiverGuard is not an official warning authority. Use recognized government channels for current guidance.",
    },
  }[screen];
  return (
    <PublicShell>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <PageHeading
          {...content}
          actions={
            <ActionLink href={returnHref} variant="quiet">
              <ArrowLeft size={14} /> {returnLabel}
            </ActionLink>
          }
        />
        {screen === "about" ? (
          <div className="grid gap-3 lg:grid-cols-3">
            <Surface title="Purpose">
              <p className="text-body text-muted">
                Explore data, experimental forecasts, model evidence, and
                controlled human review.
              </p>
            </Surface>
            <Surface title="Current coverage">
              <p className="text-body text-muted">
                Sample city-level views for Quezon City, Marikina, Manila, and
                Pasig.
              </p>
            </Surface>
            <Surface title="Research scope">
              <p className="text-body text-muted">
                City-level research workflows with traceable sources, model
                evidence, and limitations.
              </p>
            </Surface>
          </div>
        ) : screen === "methodology" ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <Surface title="Experimental forecast">
              <p className="text-body text-muted">
                A dated model output based on compatible forecast and historical
                features. It is not an exact flood probability.
              </p>
            </Surface>
            <Surface title="Static hazard context">
              <p className="text-body text-muted">
                Long-term susceptibility shown with a separate layer, legend,
                source, and timestamp.
              </p>
            </Surface>
            <Surface title="Missing and unsupported data">
              <p className="text-body text-muted">
                Missing values remain missing. Unsupported locations show no
                prediction rather than assumed low risk.
              </p>
            </Surface>
            <Surface title="Required evidence">
              <p className="text-body text-muted">
                Results expose location, valid time, source, model version,
                quality, and limitations when available.
              </p>
            </Surface>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            <Notice title="Check current official information" tone="warning">
              Use PAGASA and your local government unit for advisories and
              evacuation instructions.
            </Notice>
            <Surface title="Source links">
              <div className="grid gap-2">
                <a
                  className="text-body flex items-center justify-between rounded-control border border-line px-3 py-2 text-brand-primary-ink"
                  href="https://www.pagasa.dost.gov.ph/"
                  target="_blank"
                  rel="noreferrer"
                >
                  PAGASA <ArrowRight size={14} />
                </a>
                <div className="text-body rounded-control border border-line px-3 py-2 text-muted">
                  Local LGU/DRRMO source · Configure verified link later
                </div>
              </div>
            </Surface>
          </div>
        )}
      </main>
    </PublicShell>
  );
}

export function SettingsScreen({ screen }: { screen: string }) {
  const activeScreen = screen || "profile";
  const settingsTitle =
    activeScreen === "notifications"
      ? "Notifications"
      : activeScreen === "accessibility"
        ? "Accessibility"
        : activeScreen === "security" ||
            activeScreen === "password" ||
            activeScreen === "account"
          ? "Security, password & access"
          : "Profile";

  let content: ReactNode;
  if (activeScreen === "profile") {
    content = <ProfileSettings />;
  } else if (activeScreen === "notifications") {
    content = <NotificationSettings />;
  } else if (activeScreen === "accessibility") {
    content = <AccessibilitySettings />;
  } else {
    content = <SecuritySettings />;
  }

  return (
    <>
      <PageHeading
        title="Account settings"
        description="Manage your profile, preferences, security, and workspace access."
      />
      <section
        aria-labelledby="settings-content-title"
        className="min-w-0 rounded-panel border border-line bg-canvas p-4 sm:p-5 lg:min-h-[calc(100vh-6.5rem)] lg:p-6"
      >
        <h2 id="settings-content-title" className="sr-only">
          {settingsTitle}
        </h2>
        {content}
      </section>
    </>
  );
}

/**
 * Profile details are stored in this browser.
 *
 * There is no account record to write to, so the fields persist as typed and the
 * screen says where they went. Anything that only the identity service can do
 * (a photo, the e-mail address of record, the password) is described rather than
 * offered as a button that does nothing.
 */
function ProfileSettings() {
  const [firstName, setFirstName] = usePreference(
    "profile-first-name",
    "RiverGuard",
  );
  const [lastName, setLastName] = usePreference(
    "profile-last-name",
    "Administrator",
  );
  const [organisation, setOrganisation] = usePreference(
    "profile-organisation",
    "RiverGuard research",
  );
  const [email, setEmail] = usePreference(
    "profile-email",
    "admin@riverguard.local",
  );

  return (
    <div>
      <div className="border-b border-line pb-4">
        <h2 className="text-major-status">My profile</h2>
        <p className="text-body mt-1 text-muted">
          How this workspace labels you. No account exists in this build, so the
          details are kept in this browser.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 py-4">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-brand-secondary-soft text-brand-primary-ink">
          <UserCircle size={32} weight="duotone" />
        </span>
        <div>
          <p className="text-button">Profile image</p>
          <p className="text-metadata mt-0.5 text-muted">
            Initials stand in for a photo. Uploading one needs the identity
            service, which this prototype does not include.
          </p>
        </div>
      </div>

      <div className="grid gap-3 border-t border-line py-4 sm:grid-cols-2">
        <TextField
          id="profile-first-name"
          label="First name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
        <TextField
          id="profile-last-name"
          label="Last name"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
        />
        <TextField
          id="profile-org"
          label="Organization"
          value={organisation}
          onChange={(event) => setOrganisation(event.target.value)}
        />
        <TextField
          id="profile-role"
          label="Role"
          value="Administrator"
          readOnly
          hint="Assigned by the identity service."
        />
        <TextField
          id="profile-email"
          label="Contact email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          id="profile-locations"
          label="Assigned locations"
          value="All supported locations"
          readOnly
          hint="Assigned by the identity service."
        />
      </div>

      <p className="text-metadata text-muted" role="status">
        Saved in this browser as you type. Another browser or device starts from
        the defaults.
      </p>

      <div className="mt-4 border-t border-line pt-4">
        <h2 className="text-section">Account security</h2>
        <div className="mt-3 divide-y divide-line rounded-control border border-line">
          <div className="flex flex-wrap items-center gap-3 px-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-button">Email address of record</p>
              <p className="text-body mt-0.5 text-muted">
                Held by the identity service. The contact email above is only a
                local label.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-button">Password</p>
              <p className="text-body mt-0.5 text-muted">
                Set and changed in the identity service; this build stores no
                credentials.
              </p>
            </div>
            <ActionLink href="/settings/password" variant="quiet">
              Details
            </ActionLink>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-button">Multi-factor authentication</p>
              <p className="text-body mt-0.5 text-muted">
                Add an extra verification step when signing in.
              </p>
            </div>
            <ActionLink href="/auth/mfa" variant="quiet">
              Set up
            </ActionLink>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Notification choices are remembered, and nothing is sent.
 *
 * The build has no delivery service, so the screen states that plainly instead
 * of implying an e-mail will arrive.
 */
function NotificationSettings() {
  const [reviews, setReviews] = usePreference("notify-reviews", "false");
  const [status, setStatus] = usePreference("notify-status", "false");
  const [outlook, setOutlook] = usePreference("notify-outlook", "false");
  const [notes, setNotes] = usePreference("notify-notes", "false");

  return (
    <div>
      <h2 className="text-major-status">Notification preferences</h2>
      <p className="text-body mt-1 text-muted">
        Choose which workspace updates would need your attention.
      </p>
      <Notice className="mt-4" title="No delivery in this build" tone="warning">
        RiverGuard has no notification service, so nothing is sent by e-mail or
        in the application. These choices are stored in this browser for when
        delivery exists.
      </Notice>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <CheckControl
          id="notify-reviews"
          label="Review assignments"
          description="New items assigned to your account."
          checked={reviews === "true"}
          onChange={(event) =>
            setReviews(event.target.checked ? "true" : "false")
          }
        />
        <CheckControl
          id="notify-status"
          label="System status"
          description="Provider or model availability changes."
          checked={status === "true"}
          onChange={(event) =>
            setStatus(event.target.checked ? "true" : "false")
          }
        />
        <CheckControl
          id="notify-outlook"
          label="Forecast updates"
          description="New completed runs for followed locations."
          checked={outlook === "true"}
          onChange={(event) =>
            setOutlook(event.target.checked ? "true" : "false")
          }
        />
        <CheckControl
          id="notify-notes"
          label="Notes and mentions"
          description="Replies and follow-up assignments."
          checked={notes === "true"}
          onChange={(event) =>
            setNotes(event.target.checked ? "true" : "false")
          }
        />
      </div>
      <p className="text-metadata mt-4 text-muted" role="status">
        Saved in this browser as you change each control.
      </p>
    </div>
  );
}

/**
 * Only adjustments this build actually honours are offered: "reduce motion" sets
 * `data-reduce-motion` on the document, which `globals.css` uses to shorten
 * transitions. Contrast and text size follow the operating system instead.
 */
function AccessibilitySettings() {
  const [reduceMotion, setReduceMotion] = usePreference(
    "reduce-motion",
    "false",
  );
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <h2 className="text-major-status">Accessibility preferences</h2>
      <p className="text-body mt-1 text-muted">
        Adjust how charts, maps, and motion are presented.
      </p>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-button" id="theme-setting-label">
          Colour theme
        </p>
        <p className="text-metadata mt-0.5 text-muted">
          The same choice as the sun and moon buttons in the workspace header.
          The basemap keeps its own light tiles: they are OpenStreetMap images,
          not app surfaces.
        </p>
        <div
          role="radiogroup"
          aria-labelledby="theme-setting-label"
          className="mt-2 inline-flex rounded-full bg-canvas-soft p-1"
        >
          {(
            [
              [
                "light",
                "Light",
                <Sun aria-hidden="true" size={15} key="sun" />,
              ],
              [
                "dark",
                "Dark",
                <Moon aria-hidden="true" size={15} key="moon" />,
              ],
            ] as const
          ).map(([value, label, icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              onClick={() => setTheme(value)}
              className={`text-navigation flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors motion-reduce:transition-none ${
                theme === value
                  ? "bg-canvas text-ink shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-2 border-t border-line pt-4">
        <CheckControl
          id="reduce-motion-setting"
          label="Reduce motion"
          description="Shortens transitions and animations across the workspace."
          checked={reduceMotion === "true"}
          onChange={(event) =>
            setReduceMotion(event.target.checked ? "true" : "false")
          }
        />
      </div>
      <Notice className="mt-4" title="Other adjustments">
        Contrast, text size, and control size follow your operating system and
        browser settings. This build does not override them.
      </Notice>
      <p className="text-metadata mt-4 text-muted" role="status">
        Saved in this browser as you change the controls.
      </p>
    </div>
  );
}

/**
 * Security actions belong to the identity service.
 *
 * Every control here used to look like it worked: the password form accepted
 * three values, and the buttons for other sessions, access review and
 * deactivation set a line of green text. None of it reached anything. The screen
 * now describes who owns each action, and links only where a screen exists.
 */
function SecuritySettings() {
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-major-status">Security, password & access</h2>
        <p className="text-body mt-1 text-muted">
          Sign-in protection, password changes, sessions, and account access are
          held by the identity service. This local prototype has no credential
          store, so none of these actions can be completed here.
        </p>
      </div>
      <Notice title="No credentials in this build" tone="warning">
        RiverGuard runs locally without authentication. Anyone with access to
        this machine can read and write the same run, review, and audit files.
      </Notice>
      <div className="divide-y divide-line rounded-control border border-line">
        <div className="flex flex-wrap items-center gap-3 px-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-button">Multi-factor authentication</p>
            <p className="text-body mt-0.5 text-muted">
              Configured in the identity service. The setup flow is part of the
              sign-in prototype.
            </p>
          </div>
          <ActionLink href="/auth/mfa" variant="quiet">
            Open MFA setup
          </ActionLink>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-button">Password</p>
            <p className="text-body mt-0.5 text-muted">
              Changed in the identity service. This build cannot verify a
              current password, so it does not offer a form that would discard
              one.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-button">Sessions</p>
            <p className="text-body mt-0.5 text-muted">
              One local session exists. Ending sessions on other devices needs
              the identity service.
            </p>
          </div>
          <StatusBadge tone="neutral">Local only</StatusBadge>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-button">Access change</p>
            <p className="text-body mt-0.5 text-muted">
              Ask an administrator to review your role or assigned locations
              through the process your organisation defines. No request channel
              exists here.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-button text-danger">Deactivate account access</p>
            <p className="text-body mt-0.5 text-muted">
              Staff access is deactivated by an authorized administrator in the
              identity service, which preserves the audit history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
