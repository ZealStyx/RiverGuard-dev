"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FloppyDisk,
  LockKey,
  ShieldCheck,
  SignOut,
  UserCircle,
  WaveSine,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";

import { Button } from "@/components/ui";
import type { ProductRole } from "@/data/prototype";

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

function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="flex min-h-16 items-center border-b border-line px-4 sm:px-6">
        <Link href="/welcome" className="flex items-center gap-2">
          <WaveSine size={30} weight="bold" />
          <span className="text-section">RiverGuard</span>
        </Link>
        <nav
          className="text-navigation ml-auto hidden items-center gap-4 sm:flex"
          aria-label="Public navigation"
        >
          <Link href="/about">About</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/official-sources">Official sources</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}

export function WelcomeScreen() {
  return (
    <PublicShell>
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-8 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-metadata font-semibold uppercase tracking-[0.14em] text-brand-secondary">
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
          <div className="mt-5 flex flex-wrap gap-2">
            <ActionLink href="/auth/login">
              Log in <ArrowRight size={14} />
            </ActionLink>
            <ActionLink href="/auth/signup" variant="secondary">
              Create resident account
            </ActionLink>
            <ActionLink href="/about" variant="quiet">
              Learn how it works
            </ActionLink>
          </div>
        </div>
        <div className="rounded-structure border border-line bg-canvas-soft p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Surface
              title="Researcher"
              description="Run and compare experimental forecasts."
            >
              <StatusBadge tone="neutral">Approval required</StatusBadge>
            </Surface>
            <Surface
              title="LGU operator"
              description="Review assigned-area evidence."
            >
              <StatusBadge tone="neutral">Approval required</StatusBadge>
            </Surface>
            <Surface
              title="Resident"
              description="See a simplified city-level outlook."
            >
              <StatusBadge tone="info">Account available</StatusBadge>
            </Surface>
            <Surface
              title="Administrator"
              description="Review access and configuration."
            >
              <StatusBadge tone="neutral">Restricted access</StatusBadge>
            </Surface>
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
          <p className="text-metadata font-semibold uppercase tracking-[0.14em] text-brand-secondary">
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const email = String(
      new FormData(event.currentTarget as HTMLFormElement).get("login-email"),
    )
      .trim()
      .toLowerCase();
    window.setTimeout(() => {
      setLoading(false);
      if (email === "resident@riverguard.local") {
        router.push("/onboarding/resident");
      } else if (email === "lgu@riverguard.local") {
        router.push("/auth/mfa?role=lgu&source=login");
      } else if (email === "admin@riverguard.local") {
        router.push("/auth/mfa?role=admin&source=login");
      } else if (email === "researcher@riverguard.local") {
        router.push("/auth/verify?role=researcher&source=login");
      } else {
        setError(
          "Use a registered RiverGuard account or request access before signing in.",
        );
      }
    }, 650);
  }
  return (
    <form onSubmit={submit} className="grid gap-3">
      <TextField
        id="login-email"
        label="Email"
        type="email"
        name="login-email"
        autoComplete="email"
        required
        defaultValue="researcher@riverguard.local"
      />
      <PasswordField
        id="login-password"
        label="Password"
        autoComplete="current-password"
        required
        defaultValue="riverguard"
        error={error}
      />
      <CheckControl
        id="remember-device"
        label="Remember this device"
        description="Keep this account signed in on this device."
      />
      <Button
        type="submit"
        loading={loading}
        loadingLabel="Logging in"
        className="w-full"
      >
        Log in
      </Button>
      <div className="text-metadata flex flex-wrap justify-between gap-2">
        <Link
          href="/auth/forgot-password"
          className="text-brand-primary underline"
        >
          Forgot password?
        </Link>
        <Link
          href="/auth/request-access"
          className="text-brand-primary underline"
        >
          Request staff access
        </Link>
        <Link href="/auth/signup" className="text-brand-primary underline">
          Create account
        </Link>
      </div>
      <div className="border-t border-line pt-3 text-center">
        <Link href="/welcome" className="text-metadata text-muted">
          Back to public view
        </Link>
      </div>
    </form>
  );
}

function ResidentSignup() {
  const router = useRouter();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        router.push("/auth/verify?role=resident&source=signup");
      }}
    >
      <TextField id="signup-name" label="Full name" required />
      <TextField id="signup-email" label="Email" type="email" required />
      <PasswordField
        id="signup-password"
        label="Password"
        required
        hint="Use at least 12 characters in a production system."
      />
      <PasswordField id="signup-confirm" label="Confirm password" required />
      <SelectControl id="signup-city" label="Primary city">
        <option>Marikina</option>
        <option>Quezon City</option>
        <option>Manila</option>
        <option>Pasig</option>
        <option>Unsupported area</option>
      </SelectControl>
      <CheckControl
        id="signup-terms"
        label="Accept future terms and privacy notice"
        required
      />
      <CheckControl
        id="signup-notifications"
        label="Receive RiverGuard notifications"
        description="Optional and separate from account consent."
      />
      <Button type="submit" className="w-full">
        Create resident account
      </Button>
      <Link
        href="/auth/login"
        className="text-metadata text-center text-brand-primary underline"
      >
        Already have an account? Log in
      </Link>
      <Link
        href="/welcome"
        className="text-metadata text-center text-muted underline"
      >
        Continue as guest
      </Link>
    </form>
  );
}

function AccessRequest() {
  const router = useRouter();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const role = String(
          new FormData(event.currentTarget as HTMLFormElement).get(
            "access-role",
          ),
        ).toLowerCase();
        router.push(
          `/auth/verify?role=${role === "lgu operator" ? "lgu" : "researcher"}&source=access`,
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id="access-name" label="Full name" required />
        <TextField id="access-email" label="Work email" type="email" required />
        <TextField id="access-org" label="Organization" required />
        <SelectControl
          id="access-role"
          name="access-role"
          label="Requested role"
        >
          <option>Researcher</option>
          <option>LGU operator</option>
        </SelectControl>
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
        className="text-metadata text-center text-brand-primary underline"
      >
        Cancel and return to login
      </Link>
    </form>
  );
}

function Verification() {
  const params = useSearchParams();
  const [verified, setVerified] = useState(false);
  const [resent, setResent] = useState(false);
  const role = params.get("role") ?? "researcher";
  const source = params.get("source") ?? "access";
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
    <div className="grid gap-3">
      <Notice title={resent ? "New code sent" : "Code sent"}>
        A verification code was sent to re••••••@example.com.
      </Notice>
      <TextField
        id="verification-code"
        label="Six-digit code"
        inputMode="numeric"
        maxLength={6}
        defaultValue="123456"
      />
      <Button
        onClick={() => {
          setVerified(true);
        }}
        className="w-full"
      >
        Verify
      </Button>
      <div className="text-metadata flex justify-between">
        <button
          type="button"
          onClick={() => setResent(true)}
          className="text-brand-primary underline"
        >
          {resent ? "Code resent" : "Resend code"}
        </button>
        <Link
          href={
            source === "signup"
              ? "/auth/signup"
              : source === "login"
                ? "/auth/login"
                : "/auth/request-access"
          }
          className="text-brand-primary underline"
        >
          Change email
        </Link>
        <Link href="/auth/login" className="text-brand-primary underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}

function PendingApproval() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get("role") ?? "researcher";
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
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-brand-secondary-soft text-brand-secondary">
          <ShieldCheck size={26} />
        </span>
      </div>
      <div className="text-center">
        <p className="text-section">Researcher access requested</p>
        <p className="text-body mt-1 text-muted">
          Submitted Nov 11, 2026 · Verification complete
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
        className="text-metadata text-center text-brand-primary underline"
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
        className="text-metadata text-center text-brand-primary underline"
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
        href={screen === "unauthorized" ? "/researcher" : "/auth/login"}
      >
        {action}
      </ActionLink>
    </div>
  );
}

function LogoutScreen() {
  return (
    <div className="grid gap-3 text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-brand-secondary-soft text-brand-secondary">
        <SignOut size={24} />
      </span>
      <div>
        <p className="text-section">You have been logged out</p>
        <p className="text-body mt-1 text-muted">
          Your RiverGuard session has ended.
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
      "Create resident account",
      "Save locations and preferences in a future public experience.",
    ],
    "request-access": [
      "Request staff access",
      "Researcher and LGU roles require administrator approval.",
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
  researcher: {
    title: "Researcher onboarding",
    destination: "/researcher",
    steps: ["Profile", "Coverage", "Models", "Tour", "Use", "Ready"],
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
      : role === "researcher"
        ? [
            profileStep,
            coverageStep,
            <div key="models" className="grid gap-3 sm:grid-cols-2">
              <Surface title="Experimental model A">
                <p className="text-body text-muted">
                  Forecast rainfall and basin response for supported cities.
                </p>
              </Surface>
              <Surface title="Static hazard context">
                <p className="text-body text-muted">
                  Long-term susceptibility is shown separately from forecasts.
                </p>
              </Surface>
            </div>,
            tourStep,
            <CheckControl
              key="researcher-use"
              id="researcher-responsible-use"
              label="I understand the experimental-use limitations"
              required
            />,
            <Notice
              key="researcher-ready"
              title="Ready for research"
              tone="success"
            >
              Your dashboard, data sources, forecast workflow, and model cards
              are ready to explore.
            </Notice>,
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
              <Surface
                key="admin-configuration"
                title="Configuration readiness"
              >
                <p className="text-body text-muted">
                  Review supported locations, provider status, model versions,
                  and data-source readiness.
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
                User requests, configuration, and audit tools are ready.
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
  const returnHref =
    requestedReturn &&
    /^\/(researcher|resident|lgu|admin)$/.test(requestedReturn)
      ? requestedReturn
      : "/welcome";
  const returnLabel = returnHref === "/welcome" ? "Back" : "Back to dashboard";
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
                  className="text-body flex items-center justify-between rounded-control border border-line px-3 py-2 text-brand-primary"
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
  const [saved, setSaved] = useState(false);
  const activeScreen = screen || "profile";
  const settingsTitle =
    activeScreen === "notifications"
      ? "Notifications"
      : activeScreen === "accessibility"
        ? "Accessibility"
        : activeScreen === "security"
          ? "Security and sessions"
          : activeScreen === "password"
            ? "Change password"
            : activeScreen === "account"
              ? "Account access"
              : "Profile";

  let content: ReactNode;
  if (activeScreen === "profile") {
    content = (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="text-major-status">My profile</h2>
            <p className="text-body mt-1 text-muted">
              Personal details and workspace assignment.
            </p>
          </div>
          <Button size="small" onClick={() => setSaved(true)}>
            <FloppyDisk size={14} /> Save changes
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 py-4">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-brand-secondary-soft text-brand-primary">
            <UserCircle size={32} weight="duotone" />
          </span>
          <div>
            <p className="text-button">Profile image</p>
            <p className="text-metadata mt-0.5 text-muted">
              PNG or JPEG under 2 MB
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button size="small" variant="secondary">
              Change image
            </Button>
            <Button size="small" variant="quiet">
              Remove
            </Button>
          </div>
        </div>

        <div className="grid gap-3 border-t border-line py-4 sm:grid-cols-2">
          <TextField
            id="profile-first-name"
            label="First name"
            defaultValue="RiverGuard"
          />
          <TextField
            id="profile-last-name"
            label="Last name"
            defaultValue="Researcher"
          />
          <TextField
            id="profile-org"
            label="Organization"
            defaultValue="University research team"
          />
          <TextField
            id="profile-role"
            label="Role"
            value="Researcher"
            readOnly
          />
          <TextField
            id="profile-email"
            label="Contact email"
            defaultValue="researcher@riverguard.local"
          />
          <TextField
            id="profile-locations"
            label="Assigned locations"
            value="NCR research workspace"
            readOnly
          />
        </div>

        <div className="border-t border-line pt-4">
          <h2 className="text-section">Account security</h2>
          <div className="mt-3 divide-y divide-line rounded-control border border-line">
            <div className="flex flex-wrap items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-button">Email address</p>
                <p className="text-body mt-0.5 text-muted">
                  researcher@riverguard.local
                </p>
              </div>
              <Button size="small" variant="quiet">
                Change email
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-button">Password</p>
                <p className="text-body mt-0.5 tracking-[0.22em] text-muted">
                  ••••••••••••
                </p>
              </div>
              <ActionLink href="/settings/password" variant="quiet">
                Change password
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
  } else if (activeScreen === "notifications") {
    content = (
      <div>
        <h2 className="text-major-status">Notification preferences</h2>
        <p className="text-body mt-1 text-muted">
          Choose which workspace updates need your attention.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <CheckControl
            id="notify-reviews"
            label="Review assignments"
            description="New items assigned to your account."
          />
          <CheckControl
            id="notify-status"
            label="System status"
            description="Provider or model availability changes."
          />
          <CheckControl
            id="notify-outlook"
            label="Forecast updates"
            description="New completed runs for followed locations."
          />
          <CheckControl
            id="notify-notes"
            label="Notes and mentions"
            description="Replies and follow-up assignments."
          />
        </div>
        <div className="mt-4 max-w-md">
          <SelectControl id="notify-channel" label="Delivery channel">
            <option>In application</option>
            <option>Email</option>
          </SelectControl>
        </div>
        <Button className="mt-4" size="small" onClick={() => setSaved(true)}>
          Save preferences
        </Button>
      </div>
    );
  } else if (activeScreen === "accessibility") {
    content = (
      <div>
        <h2 className="text-major-status">Accessibility preferences</h2>
        <p className="text-body mt-1 text-muted">
          Adjust how charts, maps, and motion are presented.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <CheckControl
            id="high-contrast"
            label="Increase contrast"
            description="Strengthen borders and secondary text."
          />
          <CheckControl
            id="reduce-motion-setting"
            label="Reduce motion"
            description="Limit non-essential interface animation."
          />
          <CheckControl
            id="table-alternative"
            label="Prefer chart tables"
            description="Show accessible data tables with charts."
          />
          <CheckControl
            id="larger-targets"
            label="Larger control targets"
            description="Increase interactive control size."
          />
        </div>
        <div className="mt-4 max-w-md">
          <SelectControl id="spatial-view" label="Default spatial view">
            <option>Interactive map</option>
            <option>Location list</option>
          </SelectControl>
        </div>
        <Button className="mt-4" size="small" onClick={() => setSaved(true)}>
          Save preferences
        </Button>
      </div>
    );
  } else if (activeScreen === "security") {
    content = (
      <div>
        <h2 className="text-major-status">Security and sessions</h2>
        <p className="text-body mt-1 text-muted">
          Review sign-in protection and active devices.
        </p>
        <div className="mt-4 divide-y divide-line rounded-control border border-line">
          <div className="flex flex-wrap items-center gap-3 px-3 py-3">
            <div className="flex-1">
              <p className="text-button">Multi-factor authentication</p>
              <p className="text-body mt-0.5 text-muted">Not configured</p>
            </div>
            <ActionLink href="/auth/mfa" variant="quiet">
              Set up MFA
            </ActionLink>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-3 py-3">
            <div className="flex-1">
              <p className="text-button">Current session</p>
              <p className="text-body mt-0.5 text-muted">
                This browser · Manila timezone
              </p>
            </div>
            <StatusBadge tone="success">Active</StatusBadge>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-3 py-3">
            <div className="flex-1">
              <p className="text-button">Other sessions</p>
              <p className="text-body mt-0.5 text-muted">
                End access on other signed-in devices.
              </p>
            </div>
            <Button size="small" variant="quiet">
              Log out other sessions
            </Button>
          </div>
        </div>
      </div>
    );
  } else if (activeScreen === "password") {
    content = (
      <div className="grid gap-6 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)] lg:gap-8">
        <div className="self-stretch rounded-control border border-line bg-canvas-soft p-4">
          <p className="text-metadata font-semibold uppercase tracking-[0.12em] text-muted">
            Security
          </p>
          <h2 className="text-section mt-2">Password security</h2>
          <p className="text-body mt-1 text-muted">
            Keep your RiverGuard account protected with a password that is
            unique to this workspace.
          </p>
          <ul className="text-body mt-4 grid gap-2 text-muted">
            <li>Use at least 12 characters.</li>
            <li>Do not reuse a password from another service.</li>
            <li>Never share your password or verification codes.</li>
          </ul>
        </div>
        <div className="min-w-0">
          <h2 className="text-major-status">Change password</h2>
          <p className="text-body mt-1 text-muted">
            Choose a strong password that is not reused elsewhere.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <PasswordField
                id="current-password"
                label="Current password"
                autoComplete="current-password"
              />
            </div>
            <PasswordField
              id="settings-new-password"
              label="New password"
              autoComplete="new-password"
            />
            <PasswordField
              id="settings-confirm-password"
              label="Confirm new password"
              autoComplete="new-password"
            />
            <div className="sm:col-span-2">
              <Button
                size="small"
                className="w-full"
                onClick={() => setSaved(true)}
              >
                Change password
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    content = (
      <div>
        <h2 className="text-major-status">Account access</h2>
        <p className="text-body mt-1 text-muted">
          Manage session access and role-assignment requests.
        </p>
        <div className="mt-4 divide-y divide-line rounded-control border border-line">
          <div className="flex flex-wrap items-center gap-3 px-3 py-3">
            <div className="flex-1">
              <p className="text-button">Request an access change</p>
              <p className="text-body mt-0.5 text-muted">
                Ask an administrator to review your role or assigned locations.
              </p>
            </div>
            <Button size="small" variant="quiet">
              Request review
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-3 py-3">
            <div className="flex-1">
              <p className="text-button text-danger">
                Deactivate account access
              </p>
              <p className="text-body mt-0.5 text-muted">
                Staff access is deactivated by an authorized administrator to
                preserve audit history.
              </p>
            </div>
            <Button size="small" variant="danger">
              Request deactivation
            </Button>
          </div>
        </div>
      </div>
    );
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
        {saved ? (
          <p className="text-metadata mt-3 text-success" role="status">
            Changes saved.
          </p>
        ) : null}
      </section>
    </>
  );
}
