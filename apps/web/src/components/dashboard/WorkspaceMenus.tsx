"use client";

import {
  ArrowRight,
  Bell,
  SignOut,
  UserCircle,
  Warning,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useFirebaseAuth } from "@/components/auth/FirebaseAuthProvider";
import { Menu } from "@/components/ui/Menu";
import { convexConfigured } from "@/components/dashboard/OutlookBridge";
import { convexFunctions } from "@/lib/convex-functions";
import { useConvexQueryResult } from "@/lib/convex-query";
import { formatRunTime } from "@/lib/runs";
import { useLocalRuns } from "@/lib/use-runs";

/** The fields both stores can answer for a run, so one list renders both. */
interface ActivityRun {
  runId: string;
  requestedAt: number;
  locations: string[];
  alerts: number;
  provider: string;
}

const settingsLinks = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/accessibility", label: "Accessibility and appearance" },
  { href: "/settings/security", label: "Security and access" },
];

function ActivityRows({ runs }: { runs: ActivityRun[] }) {
  return (
    <ul className="grid gap-0.5">
      {runs.map((run) => (
        <li key={run.runId}>
          <Link
            href={`/admin/research/runs/${encodeURIComponent(run.runId)}`}
            className="block rounded-control px-2.5 py-2 hover:bg-canvas-soft"
          >
            <span className="text-button block">
              {run.locations.join(", ") || "Run"}
            </span>
            <span className="text-metadata mt-0.5 block text-muted">
              {formatRunTime(run.requestedAt)} · {run.provider}
            </span>
            <span className="text-metadata mt-0.5 flex items-center gap-1.5">
              {run.alerts > 0 ? (
                <>
                  <Warning
                    aria-hidden="true"
                    size={12}
                    className="text-warning"
                  />
                  <span className="text-warning">
                    {run.alerts} day{run.alerts === 1 ? "" : "s"} above the
                    operating threshold
                  </span>
                </>
              ) : (
                <span className="text-muted">No day above the threshold</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ActivityFooter() {
  return (
    <Link
      href="/admin/research/runs"
      className="text-button mt-1 flex items-center justify-between rounded-control border-t border-line px-2.5 pt-2.5 pb-1 text-brand-primary-ink hover:bg-canvas-soft"
    >
      All forecast runs
      <ArrowRight aria-hidden="true" size={14} />
    </Link>
  );
}

function LocalActivity() {
  const { data, error } = useLocalRuns(6);
  if (error) {
    return (
      <p className="text-metadata px-2.5 py-2 text-muted">
        The local run store could not be read: {error.message}
      </p>
    );
  }
  if (data === undefined) {
    return (
      <p className="text-metadata px-2.5 py-2 text-muted">
        Reading stored runs…
      </p>
    );
  }
  if (data.length === 0) {
    return (
      <p className="text-metadata px-2.5 py-2 text-muted">
        Nothing recorded yet. A run appears here once it is scored and stored.
      </p>
    );
  }
  return (
    <>
      <ActivityRows runs={data} />
      <ActivityFooter />
    </>
  );
}

function ConvexActivity() {
  const { data, error } = useConvexQueryResult(convexFunctions.recentRuns, {
    limit: 6,
  });
  if (error) {
    return (
      <p className="text-metadata px-2.5 py-2 text-muted">
        The deployment could not answer: {error.message}
      </p>
    );
  }
  if (data === undefined) {
    return (
      <p className="text-metadata px-2.5 py-2 text-muted">
        Reading stored runs…
      </p>
    );
  }
  if (data.length === 0) {
    return (
      <p className="text-metadata px-2.5 py-2 text-muted">
        Nothing recorded yet. A run appears here once it is scored and stored.
      </p>
    );
  }
  return (
    <>
      <ActivityRows runs={data} />
      <ActivityFooter />
    </>
  );
}

/**
 * Recent activity, not a notification centre.
 *
 * There is no delivery channel and no read state to maintain, so this panel
 * shows what actually exists — the last stored runs and whether any of their
 * days crossed the operating threshold — and says which store it read.
 */
export function ActivityMenu() {
  return (
    <Menu label="Recent activity" icon={<Bell size={18} />} width="w-80">
      {() => (
        <>
          <div className="px-2.5 pb-1.5">
            <p className="text-section">Recent activity</p>
            <p className="text-metadata mt-0.5 text-muted">
              {convexConfigured
                ? "Read from the Convex deployment."
                : "Read from this machine's run store."}
            </p>
          </div>
          {convexConfigured ? <ConvexActivity /> : <LocalActivity />}
        </>
      )}
    </Menu>
  );
}

function ProfilePanel({ close }: { close: () => void }) {
  const { user, loading, signOut } = useFirebaseAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setBusy(true);
    setError(null);
    try {
      await signOut();
      close();
      router.push("/auth/login");
    } catch (cause) {
      // An unconfigured Firebase project throws here rather than silently
      // pretending the session ended.
      setError(
        cause instanceof Error ? cause.message : "Sign-out did not complete.",
      );
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-line px-2.5 pb-2.5">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-secondary-soft text-brand-primary-ink">
          <UserCircle size={22} weight="duotone" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-button truncate">
            {loading
              ? "Checking sign-in…"
              : (user?.email ?? "No signed-in account")}
          </p>
          <p className="text-metadata text-muted">
            {loading
              ? "Waiting for the identity service"
              : user
                ? user.emailVerified
                  ? "E-mail verified"
                  : "E-mail not yet verified"
                : "Anonymous local workspace"}
          </p>
        </div>
      </div>

      <nav aria-label="Account" className="mt-1 grid gap-0.5">
        {settingsLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={close}
            className="text-navigation rounded-control px-2.5 py-2 text-ink hover:bg-canvas-soft"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <p className="text-metadata mt-1 border-t border-line px-2.5 pt-2 text-muted">
        Runs, reviews, and audit entries written here are attributed to “Local
        operator (unauthenticated)” — there is no credential store in this
        build.
      </p>

      {user ? (
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={busy}
          className="text-navigation mt-1 flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-ink hover:bg-canvas-soft disabled:opacity-50"
        >
          <SignOut size={15} aria-hidden="true" />
          {busy ? "Signing out…" : "Sign out"}
        </button>
      ) : null}

      {error ? (
        <p className="text-metadata mt-1 px-2.5 text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

export function ProfileMenu() {
  return (
    <Menu
      label="Account and settings"
      icon={<UserCircle size={21} weight="duotone" />}
      width="w-72"
    >
      {(close) => <ProfilePanel close={close} />}
    </Menu>
  );
}
