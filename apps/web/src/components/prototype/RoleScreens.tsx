"use client";

import {
  FloppyDisk,
  Plus,
  ShieldCheck,
  UserPlus,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { RainfallChart } from "@/components/charts/RainfallChart";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { RiskSummary } from "@/components/dashboard/RiskSummary";
import { RiverMap } from "@/components/map/RiverMap";
import { Button } from "@/components/ui";
import { cx } from "@/lib/classnames";
import { supportedLocations } from "@/data/prototype";
import { convexConfigured } from "@/components/dashboard/OutlookBridge";
import { convexFunctions, type RecentRun } from "@/lib/convex-functions";
import { useQuery } from "convex/react";
import type { MapLayerId } from "@/types";

import {
  ActionLink,
  CheckControl,
  DataTable,
  EmptyPanel,
  Metric,
  Notice,
  PageHeading,
  SelectControl,
  StatusBadge,
  Surface,
  TextAreaField,
  TextField,
} from "./Primitives";
import {
  DataSourceCatalog,
  LocationDetails,
  Models,
  ResearcherScreen,
} from "./ResearcherScreens";

function ResidentHome() {
  const [selectedDay, setSelectedDay] = useState(0);
  return (
    <>
      <PageHeading
        title="My outlook"
        eyebrow="Marikina"
        description="A simplified seven-day experimental outlook with clear links to official information."
      />
      <Notice title="Official guidance" tone="warning">
        RiverGuard does not replace PAGASA advisories, LGU instructions, or
        evacuation guidance.
      </Notice>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Saved city"
          value="Marikina"
          detail="Supported location"
          tone="secondary"
        />
        <Metric
          label="Updated"
          value="Not yet run"
          detail="Press Run forecast to fetch"
        />
        <Metric
          label="Data quality"
          value="Research"
          detail="Review provenance"
          tone="warning"
        />
        <Metric
          label="Official status"
          value="Check sources"
          detail="No RiverGuard warning"
          tone="primary"
        />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <RiskSummary selectedDay={selectedDay} onDayChange={setSelectedDay} />
        <Surface title="What this means">
          <p className="text-body text-muted">
            Once a run completes, the index on the left shows whether the
            experimental model would flag that date for closer review. It never
            describes household, street, or barangay conditions.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionLink href="/resident/outlook">
              View all seven days
            </ActionLink>
            <ActionLink href="/resident/locations?view=hazard" variant="quiet">
              View hazard context
            </ActionLink>
          </div>
        </Surface>
      </div>
    </>
  );
}

function ResidentWorkspaceViewSwitcher({
  activeView,
}: {
  activeView: "hazard" | "locations";
}) {
  return (
    <div
      className="mb-4 inline-flex rounded-control border border-line bg-canvas-soft p-1"
      role="tablist"
      aria-label="Resident locations workspace view"
    >
      <Link
        href="/resident/locations"
        role="tab"
        aria-selected={activeView === "locations"}
        className={`text-button rounded-control px-3 py-1.5 transition-colors ${
          activeView === "locations"
            ? "bg-brand-primary text-white"
            : "text-muted hover:bg-canvas hover:text-ink"
        }`}
      >
        Locations
      </Link>
      <Link
        href="/resident/locations?view=hazard"
        role="tab"
        aria-selected={activeView === "hazard"}
        className={`text-button rounded-control px-3 py-1.5 transition-colors ${
          activeView === "hazard"
            ? "bg-brand-primary text-white"
            : "text-muted hover:bg-canvas hover:text-ink"
        }`}
      >
        Hazard context
      </Link>
    </div>
  );
}

function ResidentLocationsWorkspace({
  initialView = "locations",
}: {
  initialView?: "hazard" | "locations";
}) {
  const [saved, setSaved] = useState("Marikina");
  const [layer, setLayer] = useState<MapLayerId>("base");
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const activeView =
    requestedView === "hazard" ||
    (initialView === "hazard" && requestedView !== "locations")
      ? "hazard"
      : "locations";

  return (
    <>
      <PageHeading
        title="Locations & hazard"
        eyebrow="Resident spatial context"
        description="Choose a supported city and review long-term hazard context separately from the experimental outlook."
      />
      <ResidentWorkspaceViewSwitcher activeView={activeView} />
      {activeView === "hazard" ? (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_320px]">
          <RiverMap activeLayer={layer} onLayerChange={setLayer} />
          <Surface
            title="How to read this map"
            description="Static context only"
            className="h-fit self-start"
          >
            <p className="text-body text-muted">
              Static susceptibility describes long-term context. It does not say
              whether flooding will occur today.
            </p>
            <Notice
              title="Verified GIS layer required"
              tone="warning"
              className="mt-3"
            >
              No RiverGuard hazard geometry is loaded. A verified local GIS
              boundary and susceptibility layer must be supplied before this
              view can show static hazard context.
            </Notice>
          </Surface>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {supportedLocations.map((location) => (
              <Surface
                key={location.name}
                title={location.name}
                description={location.support}
              >
                <StatusBadge
                  tone={location.name === saved ? "success" : "neutral"}
                >
                  {location.name === saved ? "Primary location" : "Available"}
                </StatusBadge>
                <Button
                  size="small"
                  variant={location.name === saved ? "quiet" : "secondary"}
                  className="mt-4 w-full"
                  onClick={() => setSaved(location.name)}
                >
                  {location.name === saved ? "Selected" : "Set as primary"}
                </Button>
              </Surface>
            ))}
          </div>
          <Notice title="Coverage limitation" className="mt-4">
            Current coverage includes Quezon City, Marikina, Manila, and Pasig.
            Unsupported areas must never be shown as low risk.
          </Notice>
        </>
      )}
    </>
  );
}

function ResidentLocations() {
  return <ResidentLocationsWorkspace />;
}

function ResidentOutlook() {
  const [day, setDay] = useState(0);
  return (
    <>
      <PageHeading
        title="Seven-day outlook"
        eyebrow="Marikina"
        description="Experimental daily categories with a consistent official-source reminder."
      />
      <RiskSummary selectedDay={day} onDayChange={setDay} />
      <div className="mt-3 grid gap-3">
        <RainfallChart />
        <Surface title="Selected-day guidance">
          <p className="text-body text-muted">
            Review official weather and local government guidance before making
            decisions. RiverGuard’s category is illustrative and city-level.
          </p>
        </Surface>
      </div>
    </>
  );
}

function HazardContext() {
  return <ResidentLocationsWorkspace initialView="hazard" />;
}

function ResidentPreferences() {
  const [saved, setSaved] = useState(false);
  return (
    <>
      <PageHeading
        title="Preferences"
        eyebrow="Outlook and accessibility"
        description="Choose location, notification, and accessibility preferences."
      />
      <Surface className="mx-auto max-w-4xl" title="Resident preferences">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectControl id="resident-city" label="Primary city">
            <option>Marikina</option>
            <option>Quezon City</option>
            <option>Manila</option>
            <option>Pasig</option>
          </SelectControl>
          <SelectControl id="default-view" label="Default spatial view">
            <option>Map</option>
            <option>Accessible list</option>
          </SelectControl>
          <CheckControl
            id="outlook-notify"
            label="Experimental outlook updates"
            description="Choose how RiverGuard should notify you when services are connected."
          />
          <CheckControl
            id="reduced-motion"
            label="Reduce motion"
            description="Respect reduced-motion interactions where supported."
          />
        </div>
        <Button className="mt-4" size="small" onClick={() => setSaved(true)}>
          <FloppyDisk size={14} /> Save preferences
        </Button>
        {saved ? (
          <p className="text-metadata mt-2 text-success" role="status">
            Preferences saved for this preview.
          </p>
        ) : null}
      </Surface>
    </>
  );
}

export function ResidentScreen({ segments }: { segments: string[] }) {
  const [screen] = segments;
  if (!screen) return <ResidentHome />;
  if (screen === "locations") return <ResidentLocations />;
  if (screen === "outlook") return <ResidentOutlook />;
  if (screen === "hazard-context") return <HazardContext />;
  if (screen === "preferences") return <ResidentPreferences />;
  return <ResidentHome />;
}

function LguHome() {
  return (
    <>
      <PageHeading
        title="LGU overview"
        eyebrow="Marikina assigned workspace"
        description="Review the latest experimental output, quality warnings, and items awaiting an authorized assessment."
        actions={<ActionLink href="/lgu/reviews">Open review queue</ActionLink>}
      />
      <Notice title="Review support, not warning authority" tone="warning">
        RiverGuard supports an internal review. It does not issue an official
        warning or evacuation instruction.
      </Notice>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Needs review"
          value="1"
          detail="Assigned-area run"
          tone="warning"
        />
        <Metric
          label="Latest run"
          value="None"
          detail="No stored run for this area"
          tone="primary"
        />
        <Metric
          label="Quality warnings"
          value="1"
          detail="Provenance warning"
          tone="warning"
        />
        <Metric
          label="Escalated"
          value="1"
          detail="Awaiting assessment"
          tone="danger"
        />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Surface title="Latest assigned outlook">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-major-status text-warning">
                Elevated experimental index
              </p>
              <p className="text-body mt-1 text-muted">
                Marikina · Nov 11 · Experimental result
              </p>
            </div>
            <StatusBadge tone="warning">Needs review</StatusBadge>
          </div>
          <div className="mt-4 flex gap-2">
            <ActionLink href="/lgu/outlook">Review forecast</ActionLink>
            <ActionLink href="/lgu/outlook?view=map" variant="quiet">
              Open map
            </ActionLink>
          </div>
        </Surface>
        <Surface title="Review activity">
          <p className="text-body text-muted">
            No reviews are recorded. Review decisions are not persisted by this
            prototype, so there is nothing to list here yet.
          </p>
        </Surface>
      </div>
    </>
  );
}

function LguLocations() {
  return (
    <>
      <PageHeading
        title="Assigned locations"
        eyebrow="LGU workspace"
        description="Operators see only their approved location assignments."
      />
      <Surface title="Location access">
        <DataTable
          columns={[
            { key: "name", label: "Location" },
            { key: "support", label: "Coverage" },
            { key: "status", label: "Latest forecast" },
            { key: "updated", label: "Updated" },
          ]}
          rows={supportedLocations
            .filter((location) => location.name === "Marikina")
            .map((location) => ({ ...location }))}
          actions={() => (
            <ActionLink href="/lgu/outlook" variant="quiet">
              Open
            </ActionLink>
          )}
        />
      </Surface>
    </>
  );
}

function LguWorkspaceViewSwitcher({
  activeView,
}: {
  activeView: "map" | "outlook";
}) {
  return (
    <div
      className="mb-4 inline-flex rounded-control border border-line bg-canvas-soft p-1"
      role="tablist"
      aria-label="Marikina workspace view"
    >
      <Link
        href="/lgu/outlook"
        role="tab"
        aria-selected={activeView === "outlook"}
        className={`text-button rounded-control px-3 py-1.5 transition-colors ${
          activeView === "outlook"
            ? "bg-brand-primary text-white"
            : "text-muted hover:bg-canvas hover:text-ink"
        }`}
      >
        Outlook
      </Link>
      <Link
        href="/lgu/outlook?view=map"
        role="tab"
        aria-selected={activeView === "map"}
        className={`text-button rounded-control px-3 py-1.5 transition-colors ${
          activeView === "map"
            ? "bg-brand-primary text-white"
            : "text-muted hover:bg-canvas hover:text-ink"
        }`}
      >
        Map
      </Link>
    </div>
  );
}

function LguOutlook({
  initialView = "outlook",
}: {
  initialView?: "map" | "outlook";
}) {
  const [day, setDay] = useState(0);
  const [layer, setLayer] = useState<MapLayerId>("base");
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const activeView =
    requestedView === "map" ||
    (initialView === "map" && requestedView !== "outlook")
      ? "map"
      : "outlook";

  return (
    <>
      <PageHeading
        title="Forecast outlook & map"
        eyebrow="Marikina · assigned area"
        description="Review the latest seven-day outlook and assigned-area map in one workspace."
        actions={<ActionLink href="/lgu/reviews">Review queue</ActionLink>}
      />
      <LguWorkspaceViewSwitcher activeView={activeView} />
      {activeView === "map" ? (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_320px]">
          <RiverMap activeLayer={layer} onLayerChange={setLayer} />
          <Surface
            title="Assigned location"
            description="Current LGU workspace context"
            className="h-fit self-start"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-major-status">Marikina</p>
                <p className="text-body mt-1 text-muted">
                  City-level research coverage
                </p>
              </div>
              <StatusBadge tone="warning">No run stored</StatusBadge>
            </div>
            <dl className="text-body mt-4 grid gap-2 border-t border-line pt-3 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <dt className="text-metadata text-muted">Latest run</dt>
                <dd>None stored for this area</dd>
              </div>
              <div>
                <dt className="text-metadata text-muted">Map coverage</dt>
                <dd>OpenStreetMap basemap</dd>
              </div>
            </dl>
          </Surface>
        </div>
      ) : (
        <>
          <Notice title="Official assessment required" tone="warning">
            Escalate concerns through the established LGU process. Do not
            publish this experimental output as an official advisory.
          </Notice>
          <div className="mt-3 grid gap-3">
            <RiskSummary selectedDay={day} onDayChange={setDay} />
            <RainfallChart />
          </div>
        </>
      )}
    </>
  );
}

function ReviewQueue({ detail }: { detail?: string }) {
  if (detail) return <ReviewForm />;
  return (
    <>
      <PageHeading
        title="Review queue"
        eyebrow="Assigned assessments"
        description="Track new, drafted, reviewed, and escalated experimental runs."
      />
      <Surface title="Queue" description="Stored runs awaiting LGU review">
        {convexConfigured ? (
          <StoredRunReviewQueue />
        ) : (
          <p className="text-body text-muted">
            Review items come from stored forecast runs. Set{" "}
            <code className="rounded bg-canvas px-1 py-0.5">
              NEXT_PUBLIC_CONVEX_URL
            </code>{" "}
            to read them.
          </p>
        )}
      </Surface>
    </>
  );
}

function ReviewForm() {
  // Reviews attach to a stored run. The form used to render a fixed "Liza
  // Torres · Marikina" record under any run id in the path.
  return (
    <>
      <PageHeading
        title="Forecast review"
        eyebrow="Review queue"
        description="Record an internal assessment against a stored forecast run."
        actions={
          <ActionLink href="/lgu/reviews" variant="quiet">
            Back to queue
          </ActionLink>
        }
      />
      <EmptyPanel
        title="No run selected"
        description="A review needs a stored run to attach to. Pick one from the queue once a Convex deployment is configured and a forecast has been run."
        actionHref="/lgu/reviews"
        actionLabel="Back to queue"
      />
    </>
  );
}

function LguAlerts({ detail }: { detail?: string }) {
  if (detail === "new") return <AlertDraft />;
  if (detail === "approval") return <AlertApproval />;
  return (
    <>
      <PageHeading
        title="Alerts and notes"
        eyebrow="Future controlled workflow"
        description="Drafts remain internal until stakeholder-approved governance and backend authorization exist."
        actions={
          <ActionLink href="/lgu/alerts/new">
            <Plus size={14} /> New draft
          </ActionLink>
        }
      />
      <Notice title="Publication disabled" tone="warning">
        Publishing requires an approved channel and authorized workflow.
      </Notice>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <EmptyPanel
          title="No active alert drafts"
          description="Create a draft to review the required fields and approval states."
          actionHref="/lgu/alerts/new"
          actionLabel="Create draft"
        />
        <Surface title="Approval workflow" description="Not yet exercised">
          <p className="text-body text-muted">
            No draft has been created, so there is no approval state to show.
            The workflow below explains what a draft would require before it
            could be published.
          </p>
          <ActionLink
            href="/lgu/alerts/new"
            variant="quiet"
            className="mt-4 w-full"
          >
            Start a draft
          </ActionLink>
        </Surface>
      </div>
    </>
  );
}

function AlertApproval() {
  return (
    <>
      <PageHeading
        title="Alert approval"
        eyebrow="Future authorized workflow"
        description="Review a controlled draft against its supporting run, official references, scope, wording, and expiration."
        actions={
          <ActionLink href="/lgu/alerts" variant="quiet">
            Back to alerts
          </ActionLink>
        }
      />
      <EmptyPanel
        title="No draft awaiting approval"
        description="Approval acts on a submitted draft. Nothing has been submitted, so there is no draft here to approve, return, or reject."
        actionHref="/lgu/alerts/new"
        actionLabel="Start a draft"
      />
    </>
  );
}

function AlertDraft() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <>
      <PageHeading
        title="Alert draft"
        eyebrow="Future workflow · Marikina"
        description="Prepare a controlled draft supported by reviewed evidence. Publication remains unavailable."
      />
      <Surface className="mx-auto max-w-5xl" title="Draft details">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            id="alert-area"
            label="Affected area"
            defaultValue="Marikina (city-level)"
          />
          <TextField
            id="alert-period"
            label="Valid period"
            placeholder="From the run you are drafting against"
          />
          <SelectControl id="alert-severity" label="Draft severity">
            <option>For assessment</option>
            <option>Heightened attention</option>
          </SelectControl>
          <TextField
            id="alert-run"
            label="Supporting run"
            placeholder="Paste a stored run id"
          />
          <TextAreaField
            id="alert-summary"
            label="Summary"
            placeholder="State the reviewed evidence and limitations…"
            className="sm:col-span-2"
          />
          <TextAreaField
            id="alert-action"
            label="Recommended-action text"
            placeholder="Use only organization-approved wording…"
            className="sm:col-span-2"
          />
          <TextField
            id="alert-approver"
            label="Required approver"
            placeholder="Authorized reviewer"
          />
          <TextField
            id="alert-expiry"
            label="Expiration"
            type="datetime-local"
          />
        </div>
        <Notice title="High-consequence action" tone="danger">
          Publishing is intentionally disabled. A model result must never
          automatically become an official alert.
        </Notice>
        <div className="mt-4 flex justify-end gap-2">
          <ActionLink href="/lgu/alerts" variant="quiet">
            Cancel
          </ActionLink>
          <Button
            size="small"
            variant="secondary"
            onClick={() => setSubmitted(true)}
          >
            <ShieldCheck size={14} /> Request approval
          </Button>
        </div>
        {submitted ? (
          <p
            className="text-metadata mt-2 text-right text-success"
            role="status"
          >
            Draft moved to “Approval requested”.
          </p>
        ) : null}
      </Surface>
    </>
  );
}

export function LguScreen({ segments }: { segments: string[] }) {
  const [screen, detail] = segments;
  if (!screen) return <LguHome />;
  if (screen === "map") return <LguOutlook initialView="map" />;
  if (screen === "locations") return <LguLocations />;
  if (screen === "outlook") return <LguOutlook />;
  if (screen === "reviews") return <ReviewQueue detail={detail} />;
  if (screen === "alerts") return <LguAlerts detail={detail} />;
  return <LguHome />;
}

function AdminHome() {
  return (
    <>
      <PageHeading
        title="System overview"
        eyebrow="Administrator workspace"
        description="Review users, configuration readiness, provider status, and audit activity."
        actions={
          <ActionLink href="/admin/requests">Review access requests</ActionLink>
        }
      />
      <Notice title="Access controls">
        Account roles and location assignments require authorized administrator
        review.
      </Notice>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Pending requests"
          value="3"
          detail="Two require review"
          tone="warning"
        />
        <Metric
          label="Active users"
          value="3"
          detail="Across resident, LGU, and admin"
          tone="primary"
        />
        <Metric
          label="Supported cities"
          value="4"
          detail="City-level coverage"
          tone="secondary"
        />
        <Metric
          label="System readiness"
          value="Partial"
          detail="Backend disconnected"
          tone="warning"
        />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Surface title="Configuration status">
          <div className="grid gap-2">
            {[
              ["Weather provider", "Configuration pending", "warning"],
              ["Model version", "Experimental selected", "info"],
              ["Hazard layers", "Source verification pending", "warning"],
              ["Convex deployment", "Not connected", "danger"],
            ].map(([label, value, tone]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-control border border-line px-3 py-2"
              >
                <span className="text-body">{label}</span>
                <StatusBadge tone={tone as "warning" | "info" | "danger"}>
                  {value}
                </StatusBadge>
              </div>
            ))}
          </div>
        </Surface>
        <Surface title="Recent audit activity">
          <p className="text-body text-muted">
            No audit events are recorded. Nothing in this prototype writes an
            audit trail, so this panel is intentionally empty rather than
            illustrative.
          </p>
        </Surface>
      </div>
    </>
  );
}

function AccessRequests({ detail }: { detail?: string }) {
  if (detail) return <RequestReview />;
  return (
    <>
      <PageHeading
        title="User access requests"
        eyebrow="Administrator review"
        description="Review verified identity, organization, requested role, location scope, and reason before assigning access."
      />
      <Surface title="Pending requests">
        <p className="text-body text-muted">
          No access requests are recorded. Account provisioning is not wired to
          a backend in this prototype.
        </p>
      </Surface>
    </>
  );
}

function RequestReview() {
  const [result, setResult] = useState("");
  return (
    <>
      <PageHeading
        title="Review access request"
        eyebrow="Marco Santos · Marikina DRRMO"
        description="Assign the minimum approved role and location scope after verification."
        actions={
          <ActionLink href="/admin/requests" variant="quiet">
            Back to requests
          </ActionLink>
        }
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Surface title="Decision">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectControl id="approved-role" label="Approved role">
              <option>LGU operator</option>
            </SelectControl>
            <SelectControl id="approved-location" label="Permitted locations">
              <option>Marikina only</option>
              <option>No assignment</option>
            </SelectControl>
            <TextField
              id="review-date"
              label="Review date"
              type="date"
              defaultValue="2026-11-11"
            />
            <TextField
              id="access-expiry"
              label="Optional review date"
              type="date"
            />
            <div className="sm:col-span-2">
              <TextAreaField
                id="decision-note"
                label="Decision note"
                placeholder="Record verification and scope rationale…"
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button
              size="small"
              variant="quiet"
              onClick={() => setResult("More information requested")}
            >
              Request information
            </Button>
            <Button
              size="small"
              variant="danger"
              onClick={() => setResult("Request rejected")}
            >
              Reject
            </Button>
            <Button
              size="small"
              variant="secondary"
              onClick={() => setResult("Request approved for Marikina")}
            >
              Approve
            </Button>
          </div>
          {result ? (
            <p
              className="text-metadata mt-2 text-right text-success"
              role="status"
            >
              {result}.
            </p>
          ) : null}
        </Surface>
        <Surface title="Request evidence">
          <dl className="text-body grid grid-cols-[110px_1fr] gap-2">
            <dt className="text-muted">Identity</dt>
            <dd>Verified</dd>
            <dt className="text-muted">Organization</dt>
            <dd>Marikina DRRMO</dd>
            <dt className="text-muted">Requested role</dt>
            <dd>LGU operator</dd>
            <dt className="text-muted">Location</dt>
            <dd>Marikina</dd>
            <dt className="text-muted">Submitted</dt>
            <dd>Nov 10, 16:05</dd>
          </dl>
        </Surface>
      </div>
    </>
  );
}

function UsersRoles() {
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState<"invite" | null>(null);
  return (
    <>
      <PageHeading
        title="Users and roles"
        eyebrow="Access administration"
        description="Inspect role, account status, assigned locations, MFA state, and recent access."
        actions={
          <Button
            size="small"
            onClick={() => {
              setMessage("");
              setModal("invite");
            }}
          >
            <UserPlus size={14} /> Invite user
          </Button>
        }
      />
      <Surface title="Approved users">
        <p className="text-body text-muted">
          No user records are available. Authentication and user administration
          are outside this research prototype, so no names are shown.
        </p>
      </Surface>
      {message ? (
        <p className="text-metadata mt-2 text-success" role="status">
          {message}.
        </p>
      ) : null}
      {modal ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/25 px-4 pt-[10vh] backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={() => setModal(null)}
        >
          <section
            className="w-full max-w-xl rounded-panel border border-line bg-canvas p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
              <div>
                <h2 id="user-modal-title" className="text-section">
                  Invite user
                </h2>
                <p className="text-metadata mt-0.5 text-muted">
                  Send an invitation for a RiverGuard workspace account.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                className="inline-flex size-8 items-center justify-center rounded-control text-muted hover:bg-canvas-soft hover:text-ink"
                onClick={() => setModal(null)}
              >
                <X size={17} />
              </button>
            </div>
            <form
              className="mt-4 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                setModal(null);
                setMessage("Invitation queued (not delivered — no backend)");
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  id="user-modal-name"
                  label="Full name"
                  placeholder="Full name"
                  required
                />
                <TextField
                  id="user-modal-email"
                  label="Email"
                  type="email"
                  placeholder="name@organisation.gov.ph"
                  required
                />
                <TextField
                  id="user-modal-organization"
                  label="Organization"
                  placeholder="Organisation"
                  required
                />
                <SelectControl
                  id="user-modal-role"
                  label="Role"
                  defaultValue="LGU operator"
                >
                  <option>Resident</option>
                  <option>LGU operator</option>
                  <option>Administrator</option>
                </SelectControl>
                <SelectControl
                  id="user-modal-location"
                  label="Assigned locations"
                  defaultValue="Supported NCR cities"
                >
                  <option>Supported NCR cities</option>
                  <option>Marikina</option>
                  <option>Quezon City</option>
                  <option>Manila</option>
                  <option>Pasig</option>
                  <option>All</option>
                </SelectControl>
                <SelectControl
                  id="user-modal-mfa"
                  label="MFA requirement"
                  defaultValue="Optional"
                >
                  <option>Optional</option>
                  <option>Enabled</option>
                  <option>Required</option>
                </SelectControl>
              </div>
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button
                  type="button"
                  size="small"
                  variant="quiet"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="small">
                  Send invitation
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function ConfigurationTabs({
  kind,
  researchView,
}: {
  kind: string;
  researchView: boolean;
}) {
  if (!["locations", "data-sources", "models"].includes(kind)) return null;
  const researchLabel =
    kind === "locations"
      ? "Research detail"
      : kind === "data-sources"
        ? "Source explorer"
        : "Evaluation";
  return (
    <nav
      aria-label={`${kind} views`}
      className="mb-3 flex flex-wrap gap-1 border-b border-line"
    >
      <Link
        href={`/admin/${kind}`}
        className={cx(
          "text-button border-b-2 px-3 py-2",
          !researchView
            ? "border-brand-primary text-brand-primary"
            : "border-transparent text-muted hover:text-ink",
        )}
      >
        Configuration
      </Link>
      <Link
        href={`/admin/${kind}?view=research`}
        className={cx(
          "text-button border-b-2 px-3 py-2",
          researchView
            ? "border-brand-primary text-brand-primary"
            : "border-transparent text-muted hover:text-ink",
        )}
      >
        {researchLabel}
      </Link>
    </nav>
  );
}

function ConfigurationScreen({
  kind,
  detail,
}: {
  kind: string;
  detail?: string;
}) {
  const [saved, setSaved] = useState(false);
  const searchParams = useSearchParams();
  const researchView =
    searchParams.get("view") === "research" || Boolean(detail);

  if (researchView && kind === "locations") {
    return (
      <>
        <ConfigurationTabs kind={kind} researchView />
        <LocationDetails />
      </>
    );
  }
  if (researchView && kind === "data-sources") {
    return (
      <>
        <ConfigurationTabs kind={kind} researchView />
        <DataSourceCatalog detail={detail} basePath="/admin/data-sources" />
      </>
    );
  }
  if (researchView && kind === "models") {
    return (
      <>
        <ConfigurationTabs kind={kind} researchView />
        <Models detail={detail} basePath="/admin/models" />
      </>
    );
  }
  const config: Record<
    string,
    { title: string; description: string; fields: Array<[string, string]> }
  > = {
    locations: {
      title: "Supported locations",
      description:
        "Configure geographic scope, representative coordinates, compatible models, and limitation text.",
      fields: [
        ["Location name", "Marikina"],
        ["Representative coordinates", "14.6507, 121.1029"],
        ["Support status", "Supported"],
        ["Compatible model", "Current deployed model"],
        ["Boundary asset", "Not supplied"],
        ["Limitation", "City-level only"],
      ],
    },
    "data-sources": {
      title: "Data-source configuration",
      description: "Review catalogue readiness and provenance status.",
      fields: [
        ["Source", "NCR daily rainfall research dataset"],
        ["Provider", "RiverGuard research dataset"],
        ["License", "Not established"],
        ["Coverage", "Four supported cities"],
        ["Interval", "Daily"],
        ["Status", "Unverified"],
      ],
    },
    provider: {
      title: "Weather provider",
      description:
        "Configure the future server-side weather adapter without exposing credentials.",
      fields: [
        ["Provider", "Not selected"],
        ["Product / endpoint", "Pending verification"],
        ["Variables", "Daily rainfall forecast"],
        ["Timezone", "Asia/Manila"],
        ["Credential status", "Not configured"],
        ["Enabled status", "Disabled"],
      ],
    },
    models: {
      title: "Model versions",
      description: "Control model compatibility and readiness labels.",
      fields: [
        ["Version", "See Models and evaluation for the deployed version"],
        ["Responsibility", "Experimental city-level outlook"],
        ["Input schema", "Declared in ml/artifacts/model.json"],
        ["Locations", "Four supported cities"],
        ["Validation reference", "ml/artifacts/metrics.json"],
        ["Status", "Experimental"],
      ],
    },
    "hazard-layers": {
      title: "Hazard layers",
      description:
        "Record source, attribution, geography, version, and visibility separately from forecast output.",
      fields: [
        ["Layer", "Static hazard context"],
        ["Source", "Pending verification"],
        ["License / attribution", "Required"],
        ["Geography", "NCR subset"],
        ["Local asset", "Not available"],
        ["Visibility", "Disabled"],
      ],
    },
  };
  const current = config[kind] ?? config.locations;
  return (
    <>
      <PageHeading
        title={current.title}
        eyebrow="System configuration"
        description={current.description}
      />
      <ConfigurationTabs kind={kind} researchView={false} />
      <Notice title="Configuration security" className="mb-3">
        Secrets are never displayed or stored in this form.
      </Notice>
      <Surface title="Configuration record">
        <div className="grid gap-5 sm:grid-cols-2">
          {current.fields.map(([label, value], index) => (
            <TextField
              key={label}
              id={`config-${index}`}
              label={label}
              defaultValue={value}
            />
          ))}
        </div>
        <Button className="mt-5" size="small" onClick={() => setSaved(true)}>
          <FloppyDisk size={14} /> Save configuration
        </Button>
        {saved ? (
          <p className="text-metadata mt-2 text-success" role="status">
            Configuration saved for this session.
          </p>
        ) : null}
      </Surface>
    </>
  );
}

function AuditLog() {
  return (
    <>
      <PageHeading
        title="Audit log"
        eyebrow="Administrator evidence"
        description="Review who changed what, when, and with what result. Sensitive values remain redacted."
      />
      <Surface className="mb-3" title="Filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TextField
            id="audit-actor"
            label="Actor"
            placeholder="Name or system"
          />
          <SelectControl id="audit-action" label="Action type">
            <option>All actions</option>
            <option>Access</option>
            <option>Configuration</option>
          </SelectControl>
          <TextField id="audit-date" label="Date" type="date" />
          <SelectControl id="audit-outcome" label="Outcome">
            <option>All outcomes</option>
            <option>Success</option>
            <option>Pending information</option>
          </SelectControl>
        </div>
      </Surface>
      <Surface title="Recorded activity">
        <p className="text-body text-muted">
          No audit events are recorded. This prototype does not write an audit
          trail, so the log is empty by design.
        </p>
      </Surface>
    </>
  );
}

function AdminSettings() {
  return (
    <>
      <PageHeading
        title="System settings"
        eyebrow="System controls"
        description="Review safety notices, account policy, and system behavior."
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <Surface title="Safety and terminology">
          <CheckControl
            id="experimental-labels"
            label="Require experimental labels"
            description="Always on for unverified results."
            checked
            readOnly
          />
          <CheckControl
            id="official-reminder"
            label="Show official-source reminder"
            description="Always available from result pages."
            checked
            readOnly
          />
        </Surface>
        <Surface title="Deferred capabilities">
          <div className="grid gap-2">
            <StatusBadge tone="neutral">Dark theme · deferred</StatusBadge>
            <StatusBadge tone="warning">
              Authentication · backend required
            </StatusBadge>
            <StatusBadge tone="warning">
              Alert publishing · governance required
            </StatusBadge>
            <StatusBadge tone="warning">
              Real GIS layers · verified data required
            </StatusBadge>
          </div>
        </Surface>
      </div>
    </>
  );
}

export function AdminScreen({ segments }: { segments: string[] }) {
  const [screen, detail] = segments;
  if (!screen) return <DashboardLayout />;
  if (screen === "research")
    return <ResearcherScreen segments={segments.slice(1)} />;
  if (screen === "requests") return <AccessRequests detail={detail} />;
  if (screen === "users") return <UsersRoles />;
  if (
    [
      "locations",
      "data-sources",
      "provider",
      "models",
      "hazard-layers",
    ].includes(screen)
  )
    return <ConfigurationScreen kind={screen} detail={detail} />;
  if (screen === "audit") return <AuditLog />;
  if (screen === "settings") return <AdminSettings />;
  return <AdminHome />;
}

/**
 * LGU review queue, built from stored runs.
 *
 * A review row exists only because a run exists. This is a separate component so
 * `useQuery` is never called without a ConvexProvider.
 */
function StoredRunReviewQueue() {
  const runs = useQuery(convexFunctions.recentRuns, { limit: 10 });
  if (runs === undefined) {
    return <p className="text-body text-muted">Loading stored runs…</p>;
  }
  if (runs.length === 0) {
    return (
      <p className="text-body text-muted">
        No stored runs yet. Run a forecast from the research workspace to create
        one.
      </p>
    );
  }
  const rows: Array<Record<string, string>> = runs.map((run: RecentRun) => ({
    run: run.runId,
    location: run.locations.length ? run.locations.join(", ") : "—",
    valid: `${run.days} day(s)`,
    quality: run.status === "completed" ? "Complete" : run.status,
    review:
      run.alerts > 0 ? `${run.alerts} elevated day(s)` : "Nothing flagged",
    reviewer: "Unassigned",
    updated: new Date(run.requestedAt).toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Manila",
    }),
  }));
  return (
    <DataTable
      columns={[
        { key: "run", label: "Run" },
        { key: "location", label: "Location" },
        { key: "valid", label: "Valid period" },
        { key: "quality", label: "Quality" },
        { key: "review", label: "Review status" },
        { key: "reviewer", label: "Reviewer" },
        { key: "updated", label: "Updated" },
      ]}
      rows={rows}
      actions={(row) => (
        <ActionLink href={`/lgu/reviews/${row.run}`} variant="quiet">
          Review
        </ActionLink>
      )}
    />
  );
}
