"use client";
import Link from "next/link";
import { useState, type ReactNode, type FormEvent } from "react";
import {
  useConvexAuth,
  useConvexConnectionState,
  useMutation,
  useQuery,
} from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { convexConfigured } from "@/lib/convex-config";
import { useFirebaseAuth } from "./FirebaseAuthProvider";
import { Button } from "@/components/ui";
import {
  SelectControl,
  TextAreaField,
  TextField,
  Surface,
} from "../prototype/Primitives";

type View = "request" | "status" | "inbox" | "queue" | "invite" | "audit";
type Props = { view: View; detail?: string };
type City = NonNullable<Doc<"invitations">["location"]>;
export function AccessPanel(props: Props) {
  return convexConfigured ? (
    <Connected {...props} />
  ) : (
    <p>Access cannot be verified. The workspace database is unavailable.</p>
  );
}
function Connected(props: Props) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useFirebaseAuth();
  const { isWebSocketConnected } = useConvexConnectionState();
  if (!isWebSocketConnected)
    return <p>Cannot verify access. Waiting for the workspace database…</p>;
  if (isLoading) return <p>Checking your account…</p>;
  if (!isAuthenticated)
    return <Link href="/auth/login">Sign in to manage access</Link>;
  if (!user?.emailVerified)
    return <Link href="/auth/verify">Verify your email to continue</Link>;
  return <Panel {...props} />;
}
function AccessForm({
  submit,
  label,
  children,
}: {
  submit: (data: FormData) => Promise<unknown>;
  label: string;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await submit(new FormData(e.currentTarget));
      setMessage("Saved.");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "The change could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="grid gap-3" onSubmit={handle}>
      {children}
      <Button type="submit" loading={busy}>
        {label}
      </Button>
      <p role="status">{message}</p>
    </form>
  );
}
function CitySelect({ id }: { id: string }) {
  return (
    <SelectControl
      required
      label="Approved LGU assignment"
      id={id}
      name="location"
      defaultValue=""
    >
      <option value="" disabled>
        Choose a city
      </option>
      {["marikina", "manila", "pasig", "quezon-city"].map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </SelectControl>
  );
}
function Panel({ view, detail }: Props) {
  const account = useQuery(api.users.getCurrent, {});
  if (account === undefined) return <p>Loading account…</p>;
  if (!account)
    return <Link href="/auth/signup">Register a RiverGuard account first</Link>;
  if (view === "queue") return <Queue detail={detail} />;
  if (view === "invite") return <Invite />;
  if (view === "audit") return <Audit />;
  return (
    <div className="grid gap-4">
      <Surface title="Your workspace access">
        <p>Account: {account.status ?? "not approved"}</p>
        {account.status === "active" &&
          [account.role, ...(account.additionalRoles ?? [])].map((role) => (
            <Link className="block underline" key={role} href={`/${role}`}>
              Open {role} workspace
            </Link>
          ))}
      </Surface>
      <History />
      {account.status === "active" && (
        <>{view === "request" && <RequestForm />}</>
      )}
      {(account.status === "active" || account.status === "pending") && (
        <Inbox />
      )}
      <Link href="/auth/logout">Sign out</Link>
    </div>
  );
}
function History() {
  const requests = useQuery(api.applications.mine, {});
  return (
    <Surface title="Your requests">
      {requests === undefined
        ? "Loading requests…"
        : requests.length === 0
          ? "No role requests."
          : requests.map((r) => (
              <p key={r._id}>
                {r.role}: {r.status}
              </p>
            ))}
    </Surface>
  );
}
function RequestForm() {
  const request = useMutation(api.applications.request);
  const [role, setRole] = useState<"researcher" | "lgu">("researcher");
  return (
    <Surface title="Request additional access">
      <AccessForm
        label="Submit for review"
        submit={(d) =>
          request({
            role,
            profile: {
              organization: String(d.get("organization")),
              purpose: String(d.get("purpose")),
              requestedArea: String(d.get("area")),
              ...(role === "lgu"
                ? { position: String(d.get("position")) }
                : {
                    researcherType: d.get("type") as NonNullable<
                      Doc<"roleRequests">["profile"]["researcherType"]
                    >,
                  }),
            },
          })
        }
      >
        <SelectControl
          id="access-role"
          label="Requested role"
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
        >
          <option value="researcher">Researcher</option>
          <option value="lgu">LGU operator</option>
        </SelectControl>
        <TextField
          required
          id="organization"
          name="organization"
          label="Organization"
        />
        {role === "lgu" ? (
          <TextField required id="position" name="position" label="Position" />
        ) : (
          <SelectControl id="type" name="type" label="Researcher type">
            {[
              "student",
              "faculty",
              "government",
              "private",
              "independent",
              "other",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </SelectControl>
        )}
        <TextField required id="area" name="area" label="Requested area" />
        <TextAreaField required id="purpose" name="purpose" label="Purpose" />
      </AccessForm>
    </Surface>
  );
}
function Queue({ detail }: { detail?: string }) {
  const rows = useQuery(api.applications.queue, {});
  const decide = useMutation(api.applications.decide);
  const shown = rows?.filter((r) => !detail || r._id === detail);
  return (
    <Surface title="Pending access requests">
      {!shown
        ? "Loading requests…"
        : !shown.length
          ? "No pending requests."
          : shown.map((r) => (
              <article
                className="grid gap-3 border-b border-line py-4"
                key={r._id}
              >
                <h3>
                  {r.email} · {r.role}
                </h3>
                <p>
                  {[
                    r.profile.organization,
                    r.profile.position ?? r.profile.researcherType,
                    r.profile.requestedArea,
                    r.profile.purpose,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <AccessForm
                  label="Approve access"
                  submit={(d) =>
                    decide({
                      id: r._id,
                      approve: true,
                      ...(r.role === "lgu"
                        ? { location: d.get("location") as City }
                        : {}),
                    })
                  }
                >
                  {r.role === "lgu" && <CitySelect id={`location-${r._id}`} />}
                </AccessForm>
                <AccessForm
                  label="Reject request"
                  submit={() => decide({ id: r._id, approve: false })}
                />
              </article>
            ))}
    </Surface>
  );
}
function Invite() {
  const sent = useQuery(api.applications.recentInvitations, {});
  const invite = useMutation(api.applications.invite);
  const [role, setRole] = useState<Doc<"users">["role"]>("researcher");
  return (
    <Surface title="Send a workspace invitation">
      <p>
        Delivered to the recipient’s RiverGuard invitation inbox. They must
        register and verify the same email address to accept within seven days.
      </p>
      <AccessForm
        label="Send invitation"
        submit={(d) =>
          invite({
            email: String(d.get("email")),
            role,
            ...(role === "lgu" ? { location: d.get("location") as City } : {}),
          })
        }
      >
        <TextField
          id="recipient-email"
          name="email"
          type="email"
          required
          label="Recipient email"
        />
        <SelectControl
          label="Role to grant"
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
        >
          {["resident", "researcher", "lgu", "admin"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </SelectControl>
        {role === "lgu" && <CitySelect id="invite-location" />}
      </AccessForm>
      <h3>Recent invitations</h3>
      {sent?.map((i) => (
        <p key={i._id}>
          {i.email} · {i.role} ·{" "}
          {i.acceptedBy
            ? "Accepted"
            : `Expires ${new Date(i.expiresAt).toLocaleDateString()}`}{" "}
          · {i.mailStatus ? `Email: ${i.mailStatus}` : "Inbox delivery only"}
        </p>
      ))}
    </Surface>
  );
}
function Inbox() {
  const invites = useQuery(api.applications.inbox, {});
  const accept = useMutation(api.applications.accept);
  return (
    <Surface title="Invitation inbox">
      {!invites
        ? "Loading invitations…"
        : !invites.length
          ? "No open invitations."
          : invites.map((i) => (
              <AccessForm
                key={i._id}
                label={`Accept ${i.role} access`}
                submit={() => accept({ id: i._id })}
              >
                <p>
                  {i.location} · Expires{" "}
                  {new Date(i.expiresAt).toLocaleDateString()}
                </p>
              </AccessForm>
            ))}
    </Surface>
  );
}
function Audit() {
  const events = useQuery(api.applications.audit, {});
  return (
    <Surface title="Recent access changes">
      {!events
        ? "Loading events…"
        : !events.length
          ? "No recorded events."
          : events.map((e) => (
              <p className="py-2" key={e._id}>
                {new Date(e._creationTime).toLocaleString()} · {e.action} ·{" "}
                {e.role} {e.location} · actor {e.actor} · recipient {e.subject}
              </p>
            ))}
    </Surface>
  );
}
