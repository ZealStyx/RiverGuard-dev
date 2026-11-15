"use client";

import {
  ArrowRight,
  CheckCircle,
  FloppyDisk,
  Plus,
  ShieldCheck,
  UserPlus,
  Warning,
} from "@phosphor-icons/react";
import { useState } from "react";

import { RainfallChart } from "@/components/charts/RainfallChart";
import { RiskSummary } from "@/components/dashboard/RiskSummary";
import { RiverMap } from "@/components/map/RiverMap";
import { Button } from "@/components/ui";
import {
  accessRequests,
  auditEvents,
  reviewQueue,
  supportedLocations,
  systemUsers,
} from "@/data/prototype";
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

function ResidentHome() {
  const [selectedDay, setSelectedDay] = useState(0);
  return (
    <>
      <PageHeading
        title="My outlook"
        eyebrow="Marikina"
        description="A simplified seven-day experimental outlook with clear links to official information."
        actions={
          <ActionLink href="/official-sources?from=/resident" variant="quiet">
            Open official advisories
          </ActionLink>
        }
      />
      <Notice title="Official guidance" tone="warning">
        RiverGuard does not replace PAGASA advisories, LGU instructions, or
        evacuation guidance.
      </Notice>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <RiskSummary selectedDay={selectedDay} onDayChange={setSelectedDay} />
        <Surface title="What this means">
          <p className="text-body text-muted">
            The elevated index indicates that the experimental model would flag
            this date for closer review. It does not describe household, street,
            or barangay conditions.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionLink href="/resident/outlook">
              View all seven days
            </ActionLink>
            <ActionLink href="/resident/hazard-context" variant="quiet">
              View hazard context
            </ActionLink>
          </div>
        </Surface>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Saved city"
          value="Marikina"
          detail="Supported location"
          tone="secondary"
        />
        <Metric label="Updated" value="09:40" detail="Nov 11, 2026 PHT" />
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
    </>
  );
}

function ResidentLocations() {
  const [saved, setSaved] = useState("Marikina");
  return (
    <>
      <PageHeading
        title="Saved locations"
        eyebrow="Resident preferences"
        description="Choose a supported city for the simplified outlook."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {supportedLocations.map((location) => (
          <Surface
            key={location.name}
            title={location.name}
            description={location.support}
          >
            <StatusBadge tone={location.name === saved ? "success" : "neutral"}>
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
  );
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
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <RainfallChart />
        <Surface title="Selected-day guidance">
          <p className="text-body text-muted">
            Review official weather and local government guidance before making
            decisions. RiverGuard’s category is illustrative and city-level.
          </p>
          <ActionLink href="/official-sources?from=/resident" className="mt-4">
            Check official sources <ArrowRight size={14} />
          </ActionLink>
        </Surface>
      </div>
    </>
  );
}

function HazardContext() {
  const [layer, setLayer] = useState<MapLayerId>("base");
  return (
    <>
      <PageHeading
        title="Hazard context"
        eyebrow="Long-term susceptibility"
        description="The real basemap is ready; verified static susceptibility data is still pending."
      />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_320px]">
        <RiverMap activeLayer={layer} onLayerChange={setLayer} />
        <Surface title="How to read this map">
          <p className="text-body text-muted">
            Static susceptibility describes long-term context. It does not say
            whether flooding will occur today, and it must not be combined with
            forecast categories in one ambiguous legend.
          </p>
          <Notice title="Verified GIS layer required" tone="warning">
            No RiverGuard hazard geometry is loaded. A verified local GIS
            boundary and susceptibility layer must be supplied before this view
            can show static hazard context.
          </Notice>
        </Surface>
      </div>
    </>
  );
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
          value="09:40"
          detail="RG-NCR-041"
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
            <ActionLink href="/lgu/map" variant="quiet">
              Open map
            </ActionLink>
          </div>
        </Surface>
        <Surface title="Review activity">
          <DataTable
            columns={[
              { key: "run", label: "Run" },
              { key: "review", label: "Review" },
              { key: "updated", label: "Updated" },
            ]}
            rows={reviewQueue
              .slice(0, 2)
              .map(({ run, review, updated }) => ({ run, review, updated }))}
          />
        </Surface>
      </div>
    </>
  );
}

function LguMap() {
  const [layer, setLayer] = useState<MapLayerId>("base");
  return (
    <>
      <PageHeading
        title="Assigned-area risk map"
        eyebrow="Marikina"
        description="Review dated experimental output and static hazard context through separate layers."
      />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_320px]">
        <RiverMap activeLayer={layer} onLayerChange={setLayer} />
        <Surface title="Assigned location">
          <p className="text-major-status">Marikina</p>
          <p className="text-body mt-1 text-muted">
            City-level research coverage · One run needs review
          </p>
          <ActionLink href="/lgu/reviews/RG-NCR-041" className="mt-4">
            Start review
          </ActionLink>
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

function LguOutlook() {
  const [day, setDay] = useState(0);
  return (
    <>
      <PageHeading
        title="Forecast outlook"
        eyebrow="Marikina · RG-NCR-041"
        description="Review the latest seven-day outlook, evidence quality, and day-level details."
        actions={
          <ActionLink href="/lgu/reviews/RG-NCR-041">
            Review this run
          </ActionLink>
        }
      />
      <div className="grid gap-3 xl:grid-cols-2">
        <RiskSummary selectedDay={day} onDayChange={setDay} />
        <RainfallChart />
      </div>
      <Notice
        title="Official assessment required"
        tone="warning"
        className="mt-4"
      >
        Escalate concerns through the established LGU process. Do not publish
        this experimental output as an official advisory.
      </Notice>
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
      <Surface title="Queue">
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
          rows={reviewQueue.map((item) => ({ ...item }))}
          actions={(row) => (
            <ActionLink href={`/lgu/reviews/${row.run}`} variant="quiet">
              Review
            </ActionLink>
          )}
        />
      </Surface>
    </>
  );
}

function ReviewForm() {
  const [status, setStatus] = useState("In review");
  const [saved, setSaved] = useState(false);
  return (
    <>
      <PageHeading
        title="Forecast review"
        eyebrow="RG-NCR-041 · Marikina"
        description="Record an internal assessment without converting the model output into an official warning."
        actions={
          <ActionLink href="/lgu/reviews" variant="quiet">
            Back to queue
          </ActionLink>
        }
      />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Surface title="Review form">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id="reviewer"
              label="Reviewer"
              value="Liza Torres"
              readOnly
            />
            <TextField
              id="review-time"
              label="Review time"
              value="Nov 11, 2026 · 10:05 PHT"
              readOnly
            />
            <SelectControl
              id="review-status"
              label="Review status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option>In review</option>
              <option>Reviewed with limitations</option>
              <option>Escalated for official assessment</option>
            </SelectControl>
            <TextField
              id="follow-owner"
              label="Follow-up owner"
              placeholder="Assign when required"
            />
            <TextAreaField
              id="review-notes"
              label="Internal notes"
              placeholder="Describe evidence checked, limitations, and next steps…"
              className="sm:col-span-2"
            />
            <TextField
              id="support-reference"
              label="Supporting reference"
              placeholder="Official reference or internal ticket"
            />
            <SelectControl id="follow-status" label="Follow-up status">
              <option>Not required</option>
              <option>Open</option>
              <option>Complete</option>
            </SelectControl>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="quiet" size="small" onClick={() => setSaved(true)}>
              Save draft
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={() => {
                setStatus("Reviewed with limitations");
                setSaved(true);
              }}
            >
              <CheckCircle size={14} /> Mark reviewed
            </Button>
            <Button
              variant="danger"
              size="small"
              onClick={() => {
                setStatus("Escalated for official assessment");
                setSaved(true);
              }}
            >
              <Warning size={14} /> Escalate
            </Button>
          </div>
          {saved ? (
            <p
              className="text-metadata mt-2 text-right text-success"
              role="status"
            >
              Review updated: {status}.
            </p>
          ) : null}
        </Surface>
        <Surface title="Evidence summary">
          <p className="text-major-status text-warning">
            Elevated experimental index
          </p>
          <dl className="text-body mt-3 grid grid-cols-[95px_1fr] gap-2">
            <dt className="text-muted">Quality</dt>
            <dd>Research · unverified</dd>
            <dt className="text-muted">Valid period</dt>
            <dd>Nov 11–17</dd>
            <dt className="text-muted">Model</dt>
            <dd>RG-NCR v0.4</dd>
            <dt className="text-muted">Limitation</dt>
            <dd>City-level only</dd>
          </dl>
          <Notice
            title="Not an approval to publish"
            tone="warning"
            className="mt-4"
          >
            Review completion records an internal assessment only.
          </Notice>
        </Surface>
      </div>
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
        <Surface
          title="Approval-state preview"
          description="Draft awaiting an authorized review"
        >
          <p className="text-body text-muted">
            RG-ALERT-001 · Marikina · Publication disabled
          </p>
          <ActionLink
            href="/lgu/alerts/approval"
            variant="quiet"
            className="mt-4 w-full"
          >
            Open approval review
          </ActionLink>
        </Surface>
      </div>
    </>
  );
}

function AlertApproval() {
  const [decision, setDecision] = useState("");
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
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Surface
          title="Draft RG-ALERT-001"
          description="Approval requested · Marikina"
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ["Affected area", "Marikina (city-level)"],
              ["Valid period", "Nov 11, 2026"],
              ["Draft severity", "For official assessment"],
              ["Supporting run", "RG-NCR-041"],
              ["Official reference", "Not attached"],
              ["Expiration", "Nov 11, 18:00 PHT"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-control bg-canvas-soft p-3">
                <dt className="text-metadata text-muted">{label}</dt>
                <dd className="text-body mt-1">{value}</dd>
              </div>
            ))}
          </dl>
          <TextAreaField
            id="approval-note"
            label="Decision note"
            className="mt-3"
            placeholder="Record required revisions or the authorization basis…"
          />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              size="small"
              variant="quiet"
              onClick={() => setDecision("Returned for revision")}
            >
              Return for revision
            </Button>
            <Button
              size="small"
              variant="danger"
              onClick={() => setDecision("Rejected")}
            >
              Reject
            </Button>
            <Button
              size="small"
              variant="secondary"
              onClick={() => setDecision("Approved")}
            >
              Approve draft
            </Button>
          </div>
          {decision ? (
            <p
              className="text-metadata mt-2 text-right text-success"
              role="status"
            >
              {decision}.
            </p>
          ) : null}
        </Surface>
        <Surface title="Publication control">
          <Notice title="Publish remains disabled" tone="danger">
            Approval and publication are separate high-consequence actions.
            Publication requires an authorized channel.
          </Notice>
          <Button className="mt-4 w-full" size="small" disabled>
            Publish through approved channel
          </Button>
        </Surface>
      </div>
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
            defaultValue="Nov 11, 2026"
          />
          <SelectControl id="alert-severity" label="Draft severity">
            <option>For assessment</option>
            <option>Heightened attention</option>
          </SelectControl>
          <TextField
            id="alert-run"
            label="Supporting run"
            defaultValue="RG-NCR-041"
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
  if (screen === "map") return <LguMap />;
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
          detail="Across three roles"
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
          <DataTable
            columns={[
              { key: "time", label: "Time" },
              { key: "action", label: "Action" },
              { key: "outcome", label: "Outcome" },
            ]}
            rows={auditEvents.map(({ time, action, outcome }) => ({
              time,
              action,
              outcome,
            }))}
          />
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
        <DataTable
          columns={[
            { key: "name", label: "Name" },
            { key: "organization", label: "Organization" },
            { key: "role", label: "Requested role" },
            { key: "locations", label: "Locations" },
            { key: "submitted", label: "Submitted" },
            { key: "status", label: "Verification" },
          ]}
          rows={accessRequests.map((request) => ({ ...request }))}
          actions={(row) => (
            <ActionLink
              href={`/admin/requests/${row.name.toLowerCase().replace(" ", "-")}`}
              variant="quiet"
            >
              Review
            </ActionLink>
          )}
        />
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
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectControl id="approved-role" label="Approved role">
              <option>LGU operator</option>
              <option>Researcher</option>
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
            <TextAreaField
              id="decision-note"
              label="Decision note"
              placeholder="Record verification and scope rationale…"
              className="sm:col-span-2"
            />
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
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
  return (
    <>
      <PageHeading
        title="Users and roles"
        eyebrow="Access administration"
        description="Inspect role, account status, assigned locations, MFA state, and recent access."
        actions={
          <Button
            size="small"
            onClick={() => setMessage("Invitation form opened")}
          >
            <UserPlus size={14} /> Invite user
          </Button>
        }
      />
      <Surface title="Approved users">
        <DataTable
          columns={[
            { key: "name", label: "Name" },
            { key: "organization", label: "Organization" },
            { key: "role", label: "Role" },
            { key: "status", label: "Status" },
            { key: "locations", label: "Assigned locations" },
            { key: "mfa", label: "MFA" },
            { key: "lastAccess", label: "Last access" },
          ]}
          rows={systemUsers.map((user) => ({ ...user }))}
          actions={(row) => (
            <Button
              size="small"
              variant="quiet"
              onClick={() => setMessage(`Access editor opened for ${row.name}`)}
            >
              Edit
            </Button>
          )}
        />
      </Surface>
      {message ? (
        <p className="text-metadata mt-2 text-success" role="status">
          {message}.
        </p>
      ) : null}
    </>
  );
}

function ConfigurationScreen({ kind }: { kind: string }) {
  const [saved, setSaved] = useState(false);
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
        ["Compatible model", "RG-NCR v0.4"],
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
        ["Version", "RG-NCR v0.4"],
        ["Responsibility", "Experimental city-level outlook"],
        ["Input schema", "Draft v0.4"],
        ["Locations", "Four supported cities"],
        ["Validation reference", "Research validation pending"],
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
      <Surface className="mx-auto max-w-5xl" title="Configuration record">
        <div className="grid gap-3 sm:grid-cols-2">
          {current.fields.map(([label, value], index) => (
            <TextField
              key={label}
              id={`config-${index}`}
              label={label}
              defaultValue={value}
            />
          ))}
        </div>
        <Notice title="Configuration security" className="mt-4">
          Secrets are never displayed or stored in this form.
        </Notice>
        <Button className="mt-4" size="small" onClick={() => setSaved(true)}>
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
        <DataTable
          columns={[
            { key: "time", label: "Timestamp" },
            { key: "actor", label: "Actor" },
            { key: "action", label: "Action" },
            { key: "resource", label: "Resource" },
            { key: "outcome", label: "Outcome" },
          ]}
          rows={auditEvents.map((event) => ({ ...event }))}
        />
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
  if (!screen) return <AdminHome />;
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
    return <ConfigurationScreen kind={screen} />;
  if (screen === "audit") return <AuditLog />;
  if (screen === "settings") return <AdminSettings />;
  return <AdminHome />;
}
