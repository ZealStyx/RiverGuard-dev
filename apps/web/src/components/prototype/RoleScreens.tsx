"use client";

import {
  CalendarDots,
  MapPin,
  Play,
  ShieldWarning,
  FloppyDisk,
  Plus,
  ShieldCheck,
} from "@phosphor-icons/react";
import { AccessPanel } from "../auth/AccessPanel";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

import { useGisLayers } from "@/lib/use-gis-layers";
import { useEffect, useState } from "react";

import { RiverMap } from "@/components/map/RiverMap";
import { Button } from "@/components/ui";
import { cx } from "@/lib/classnames";
import { supportedLocations } from "@/data/prototype";
import {
  DEFAULT_LOCATION,
  getLocation,
  isLocationCode,
  locationCodeForName,
} from "@/lib/locations";
import {
  convexConfigured,
  OutlookBridge,
} from "@/components/dashboard/OutlookBridge";
import {
  convexErrorHint,
  convexFunctions,
  type RemoteRun,
  type RecentRun,
  type LguReview,
} from "@/lib/convex-functions";
import { useConvexQueryResult } from "@/lib/convex-query";
import { useOutlookFeed } from "@/lib/outlook";
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
  WorkspaceHero,
} from "./Primitives";
import { SharedForecastOutlook } from "./SharedForecastOutlook";
import {
  DataSourceCatalog,
  LocationDetails,
  Models,
} from "./ResearcherScreens";

/** The resident's saved city, or the default when they have not chosen one. */
function usePrimaryLocation() {
  const account = useQuery(api.users.getCurrent, {});
  // `primaryLocation` is new in the schema; the generated types catch up on the
  // next deploy, so read it through a narrow cast and validate the value.
  const stored = (
    account as { primaryLocation?: string | null } | null | undefined
  )?.primaryLocation;
  const chosen = Boolean(stored && isLocationCode(stored));
  const code =
    chosen && stored && isLocationCode(stored) ? stored : DEFAULT_LOCATION;
  return {
    code,
    name: getLocation(code)?.name ?? "Marikina",
    /** True once the resident has actually chosen a city. */
    chosen,
  };
}

function ResidentHome() {
  const primary = usePrimaryLocation();
  const outlook = useOutlookFeed(primary.code);
  const snapshot = outlook.snapshot;

  return (
    <div className="mx-auto max-w-[96rem]">
      {convexConfigured ? (
        <OutlookBridge locationCode={primary.code} onSnapshot={outlook.adopt} />
      ) : null}
      <WorkspaceHero
        eyebrow={primary.name}
        title="My flood outlook"
        description="A simplified seven-day experimental outlook for your saved city, with official guidance kept clearly separate."
        notice={
          <Notice title="Safety reminder" tone="warning">
            RiverGuard does not replace PAGASA advisories, LGU instructions, or
            evacuation guidance.
          </Notice>
        }
        actions={
          <Button
            loading={outlook.isRunning}
            loadingLabel="Running forecast"
            onClick={() => void outlook.run()}
            className="min-h-11 px-5"
          >
            <Play size={16} weight="fill" />
            Run forecast
          </Button>
        }
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Saved city",
            value: primary.name,
            detail: "Primary location",
            icon: <MapPin size={18} />,
          },
          {
            label: "Forecast status",
            value: snapshot
              ? "Run complete"
              : outlook.isRunning
                ? "Running"
                : "Not yet run",
            detail: snapshot ? "Seven-day forecast ready" : "Use Run forecast",
            icon: <CalendarDots size={18} />,
          },
          {
            label: "Data quality",
            value: snapshot?.degraded ? "Degraded" : "Research",
            detail: snapshot?.provider ?? "Review provenance",
            icon: <ShieldCheck size={18} />,
          },
          {
            label: "Official status",
            value: "Check sources",
            detail: "No RiverGuard warning",
            icon: <ShieldWarning size={18} />,
          },
        ].map((metric) => (
          <Metric
            key={metric.label}
            icon={metric.icon}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
          />
        ))}
      </div>

      <SharedForecastOutlook
        snapshot={snapshot}
        error={outlook.error}
        onRun={() => void outlook.run()}
      />
    </div>
  );
}

function ResidentLocationsWorkspace({}: {
  initialView?: "hazard" | "locations";
} = {}) {
  const primary = usePrimaryLocation();
  const setPrimaryLocation = useMutation(convexFunctions.setPrimaryLocation);
  const [layer, setLayer] = useState<MapLayerId>("base");
  const [selectedDay, setSelectedDay] = useState(0);
  const outlook = useOutlookFeed(primary.code);
  const gis = useGisLayers();

  return (
    <div className="mx-auto max-w-[96rem]">
      <section className="mb-4 rounded-[1.75rem] bg-[#e7f0f5] px-5 py-6 ring-1 ring-[#0b3358]/8 sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#147384]">
          Resident spatial context
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-[#092847] sm:text-4xl">
          Locations &amp; hazard
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#53697d]">
          Choose a supported city and review long-term hazard context.
        </p>
        <div className="mt-4 flex min-h-11 max-w-2xl items-start gap-2.5 rounded-[0.75rem] border border-[#e8cdbd] bg-[#fff9f5] px-3.5 py-2.5 text-[#733d2d]">
          <ShieldWarning size={18} className="shrink-0" />
          <p className="text-sm leading-5">
            <strong>Coverage limitation:</strong> Current coverage includes
            Quezon City, Marikina, Manila, and Pasig.
          </p>
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_320px] xl:items-stretch">
        <RiverMap
          activeLayer={layer}
          onLayerChange={setLayer}
          forecast={outlook.snapshot}
          locationCode={primary.code}
          selectedDay={selectedDay}
          onDayChange={setSelectedDay}
          className="!h-[610px]"
          hideChrome
        />
        <div className="grid h-[610px] gap-3 xl:grid-rows-[auto_minmax(0,1fr)]">
          <div className="grid grid-cols-2 gap-3">
            {supportedLocations.map((location) => (
              <Surface
                key={location.name}
                title={location.name}
                description={location.support}
                className="p-3"
              >
                <div className="mt-3">
                  <StatusBadge
                    tone={
                      location.name === primary.name ? "success" : "neutral"
                    }
                  >
                    {location.name === primary.name ? "Primary" : "Available"}
                  </StatusBadge>
                  <Button
                    size="small"
                    variant={
                      location.name === primary.name ? "quiet" : "secondary"
                    }
                    className="mt-3 w-full"
                    onClick={() =>
                      void setPrimaryLocation({
                        locationCode: locationCodeForName(location.name),
                      })
                    }
                  >
                    {location.name === primary.name
                      ? "Selected"
                      : "Set primary"}
                  </Button>
                </div>
              </Surface>
            ))}
          </div>
          <Surface
            title="How to read this map"
            description="Static context only"
            className="flex min-h-0 flex-col"
          >
            <p className="text-body text-muted">
              Static susceptibility describes long-term context. It does not say
              whether flooding will occur today.
            </p>
            {gis.layers.length === 0 ? (
              <Notice
                title="No verified hazard layer yet"
                tone="warning"
                className="mt-3"
              >
                No RiverGuard hazard geometry is loaded. No verified hazard
                layer is currently available for this map.
              </Notice>
            ) : (
              <p className="text-metadata mt-3 text-muted">
                {gis.layers.length} verified local layer
                {gis.layers.length === 1 ? "" : "s"}:{" "}
                {gis.layers.map((entry) => entry.title).join(", ")}.
              </p>
            )}
          </Surface>
        </div>
      </div>
    </div>
  );
}

function ResidentLocations() {
  return <ResidentLocationsWorkspace />;
}

function HazardContext() {
  return <ResidentLocationsWorkspace initialView="hazard" />;
}

function ResidentPreferences() {
  const primary = usePrimaryLocation();
  const setPrimaryLocation = useMutation(convexFunctions.setPrimaryLocation);
  const [saved, setSaved] = useState(false);
  const [primaryCity, setPrimaryCity] = useState(primary.name);
  const [defaultView, setDefaultView] = useState("Map");
  const [outlookNotify, setOutlookNotify] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps --
     localStorage does not exist during the server render, so these preferences
     can only be read after mount; a lazy initialiser would make the server and
     client markup disagree. The account's saved city is read here once as a
     fallback for an older device value — re-running on every change would fight
     the resident's edits. */
  useEffect(() => {
    try {
      const stored = JSON.parse(
        window.localStorage.getItem("riverguard:resident-preferences") ?? "{}",
      ) as {
        primaryCity?: string;
        defaultView?: string;
        outlookNotify?: boolean;
        reducedMotion?: boolean;
      };
      // The city lives on the account now; localStorage only carries the
      // device-level toggles below. Keep an older stored value as a fallback so
      // the field is not blank for someone who saved it before this change.
      if (!primary.chosen && stored.primaryCity)
        setPrimaryCity(stored.primaryCity);
      if (stored.defaultView) setDefaultView(stored.defaultView);
      setOutlookNotify(Boolean(stored.outlookNotify));
      setReducedMotion(Boolean(stored.reducedMotion));
    } catch {
      // Invalid local preferences are ignored and reset by the next save.
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function savePreferences() {
    window.localStorage.setItem(
      "riverguard:resident-preferences",
      JSON.stringify({ defaultView, outlookNotify, reducedMotion }),
    );
    // The primary city is account data, not device data: it has to survive a
    // reload and follow the resident to another browser.
    void setPrimaryLocation({ locationCode: locationCodeForName(primaryCity) });
    setSaved(true);
  }
  return (
    <div className="mx-auto max-w-[96rem]">
      <section className="mb-4 rounded-[1.75rem] bg-[#e7f0f5] px-5 py-6 ring-1 ring-[#0b3358]/8 sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#147384]">
          Outlook and accessibility
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-[#092847] sm:text-4xl">
          Preferences
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#53697d]">
          Choose location, notification, and accessibility preferences.
        </p>
      </section>
      <Surface
        className="mx-auto max-w-4xl rounded-[1.35rem] shadow-[0_10px_35px_rgba(7,42,76,0.055)]"
        title="Resident preferences"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectControl
            id="resident-city"
            label="Primary city"
            value={primaryCity}
            onChange={(event) => setPrimaryCity(event.target.value)}
          >
            <option>Marikina</option>
            <option>Quezon City</option>
            <option>Manila</option>
            <option>Pasig</option>
          </SelectControl>
          <SelectControl
            id="default-view"
            label="Default spatial view"
            value={defaultView}
            onChange={(event) => setDefaultView(event.target.value)}
          >
            <option>Map</option>
            <option>Accessible list</option>
          </SelectControl>
          <CheckControl
            id="outlook-notify"
            label="Experimental outlook updates"
            description="Choose how RiverGuard should notify you when services are connected."
            checked={outlookNotify}
            onChange={(event) => setOutlookNotify(event.target.checked)}
          />
          <CheckControl
            id="reduced-motion"
            label="Reduce motion"
            description="Respect reduced-motion interactions where supported."
            checked={reducedMotion}
            onChange={(event) => setReducedMotion(event.target.checked)}
          />
        </div>
        <Button className="mt-4" size="small" onClick={savePreferences}>
          <FloppyDisk size={14} /> Save preferences
        </Button>
        {saved ? (
          <p className="text-metadata mt-2 text-success" role="status">
            Preferences saved. Your primary city is stored on your account; the
            display options stay on this device.
          </p>
        ) : null}
      </Surface>
    </div>
  );
}

export function ResidentScreen({ segments }: { segments: string[] }) {
  const [screen] = segments;
  if (!screen) return <ResidentHome />;
  if (screen === "locations") return <ResidentLocations />;
  if (screen === "outlook") return <ResidentHome />;
  if (screen === "hazard-context") return <HazardContext />;
  if (screen === "preferences") return <ResidentPreferences />;
  return <ResidentHome />;
}

function LguHome() {
  const outlook = useOutlookFeed("marikina");
  const snapshot = outlook.snapshot;

  return (
    <>
      {convexConfigured ? (
        <OutlookBridge locationCode="marikina" onSnapshot={outlook.adopt} />
      ) : null}
      <PageHeading
        title="LGU overview"
        eyebrow="Marikina assigned workspace"
        description="Review the latest experimental output, quality warnings, and items awaiting an authorized assessment."
        actions={
          <ActionLink href="/lgu/outlook">
            <Play size={15} weight="fill" /> Run forecast
          </ActionLink>
        }
        notice={
          <Notice title="Review support, not warning authority" tone="warning">
            RiverGuard supports an internal review. It does not issue an
            official warning or evacuation instruction.
          </Notice>
        }
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<ShieldCheck size={18} />}
          label="Needs review"
          value="1"
          detail="Assigned-area run"
          tone="warning"
        />
        <Metric
          icon={<CalendarDots size={18} />}
          label="Latest run"
          value={snapshot ? "Ready" : "None"}
          detail={snapshot ? "Seven-day forecast ready" : "No stored run"}
          tone="primary"
        />
        <Metric
          icon={<ShieldWarning size={18} />}
          label="Quality warnings"
          value={snapshot?.degraded ? "1" : "0"}
          detail={
            snapshot?.degraded ? "Provider degraded" : "No active warning"
          }
          tone="warning"
        />
        <Metric
          icon={<ShieldWarning size={18} />}
          label="Escalated"
          value="1"
          detail="Awaiting assessment"
          tone="danger"
        />
      </div>
      <SharedForecastOutlook
        eyebrow="Assigned seven-day outlook"
        title="Marikina forecast indicators"
        description="The same forecast evidence shown to residents, with LGU review and escalation handled separately."
        snapshot={snapshot}
        error={outlook.error}
        onRun={() => void outlook.run()}
      />
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
              Inspect
            </ActionLink>
          )}
        />
      </Surface>
    </>
  );
}

function LguOutlook() {
  const [layer, setLayer] = useState<MapLayerId>("base");
  const [selectedDay, setSelectedDay] = useState(0);
  const outlook = useOutlookFeed("marikina");

  return (
    <>
      {convexConfigured ? (
        <OutlookBridge locationCode="marikina" onSnapshot={outlook.adopt} />
      ) : null}
      <PageHeading
        title="Forecast outlook"
        eyebrow="Marikina · assigned area"
        description="Review the shared seven-day forecast evidence and its assigned-area geographic context."
        actions={<ActionLink href="/lgu/reviews">Review queue</ActionLink>}
        notice={
          <Notice title="Official assessment required" tone="warning">
            Escalate concerns through the established LGU process. Do not
            publish this experimental output as an official advisory.
          </Notice>
        }
      />
      <SharedForecastOutlook
        eyebrow="Assigned seven-day outlook"
        title="Marikina forecast indicators"
        description="Resident-visible evidence with LGU review responsibilities kept in the review queue."
        snapshot={outlook.snapshot}
        error={outlook.error}
        onRun={() => void outlook.run()}
      />
      <Surface
        className="mt-4"
        title="Assigned-area map"
        description="Geographic context for the same Marikina forecast"
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_320px]">
          <RiverMap
            activeLayer={layer}
            onLayerChange={setLayer}
            forecast={outlook.snapshot}
            locationCode="marikina"
            selectedDay={selectedDay}
            onDayChange={setSelectedDay}
          />
          <div className="h-fit self-start rounded-[1rem] border border-line bg-canvas-soft p-4">
            <h3 className="text-section">Assigned location</h3>
            <p className="text-body mt-0.5 text-muted">
              Current LGU workspace context
            </p>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-major-status mt-4">Marikina</p>
                <p className="text-body mt-1 text-muted">
                  City-level research coverage
                </p>
              </div>
              <StatusBadge tone={outlook.snapshot ? "success" : "warning"}>
                {outlook.snapshot ? "Forecast ready" : "No run stored"}
              </StatusBadge>
            </div>
            <dl className="text-body mt-4 grid gap-2 border-t border-line pt-3 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <dt className="text-metadata text-muted">Latest run</dt>
                <dd>
                  {outlook.snapshot ? "Seven-day outlook" : "None stored"}
                </dd>
              </div>
              <div>
                <dt className="text-metadata text-muted">Map coverage</dt>
                <dd>OpenStreetMap basemap</dd>
              </div>
            </dl>
          </div>
        </div>
      </Surface>
    </>
  );
}

function ReviewQueue({ detail }: { detail?: string }) {
  if (detail) return <ReviewForm runId={detail} />;
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

function ReviewForm({ runId }: { runId?: string }) {
  if (!convexConfigured || !runId) {
    return (
      <EmptyPanel
        title="No run selected"
        description="A review needs a stored run to attach to. Pick one from the queue once a Convex deployment is configured and a forecast has been run."
        actionHref="/lgu/reviews"
        actionLabel="Back to queue"
      />
    );
  }
  return <RemoteReviewForm runId={runId} />;
}

function RemoteReviewForm({ runId }: { runId: string }) {
  const { data: run, error: runError } = useConvexQueryResult(
    convexFunctions.getRun,
    { runId },
  );
  const { data: savedReview, error: reviewError } = useConvexQueryResult(
    convexFunctions.getLguReview,
    { runId },
  );
  if (runError || reviewError) {
    return (
      <EmptyPanel
        title="Review unavailable"
        description={convexErrorHint(runError ?? reviewError!)}
        actionHref="/lgu/reviews"
        actionLabel="Back to queue"
      />
    );
  }
  if (!run) {
    return (
      <EmptyPanel
        title="Loading forecast review"
        description="Reading the stored run and its existing LGU assessment."
      />
    );
  }
  if (savedReview === undefined) {
    return (
      <EmptyPanel
        title="Loading existing assessment"
        description="Reading whether this run has already been reviewed."
      />
    );
  }

  return <ReviewEditor runId={runId} run={run} savedReview={savedReview} />;
}

function ReviewEditor({
  runId,
  run,
  savedReview,
}: {
  runId: string;
  run: RemoteRun;
  savedReview: LguReview | null;
}) {
  const submitReview = useMutation(convexFunctions.submitLguReview);
  const [status, setStatus] = useState<LguReview["status"]>(
    savedReview?.status ?? "reviewed",
  );
  const [notes, setNotes] = useState(savedReview?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!notes.trim()) {
      setMessage("Add review notes before saving the assessment.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await submitReview({ runId, status, notes });
      setMessage("Assessment saved to Convex.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Assessment failed.");
    } finally {
      setSubmitting(false);
    }
  }

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
      <Surface title="Run evidence" description={`Run ${runId}`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Location"
            value={run.days[0]?.locationCode ?? "—"}
            detail="Assigned area"
          />
          <Metric
            label="Forecast days"
            value={String(run.days.length)}
            detail={run.provider}
          />
          <Metric
            label="Model"
            value={run.modelVersion ?? "—"}
            detail={run.status}
          />
        </div>
        <div className="mt-4 overflow-x-auto rounded-control border border-line">
          <table className="w-full min-w-[640px] text-left text-body">
            <thead className="bg-canvas-soft text-metadata text-muted">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Rainfall</th>
                <th className="px-3 py-2">Probability</th>
                <th className="px-3 py-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {run.days.map((day) => (
                <tr key={day.date} className="border-t border-line">
                  <td className="px-3 py-2">{day.date}</td>
                  <td className="px-3 py-2">{day.rainfallMm.toFixed(1)} mm</td>
                  <td className="px-3 py-2">
                    {(day.probability * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 capitalize">{day.riskLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>
      <Surface
        className="mt-3"
        title="LGU assessment"
        description="This internal assessment does not publish an official warning."
      >
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <SelectControl
            id="review-status"
            label="Assessment status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as LguReview["status"])
            }
          >
            <option value="reviewed">Reviewed — no escalation</option>
            <option value="escalated">
              Escalated for authorized assessment
            </option>
            <option value="returned">Returned for more evidence</option>
          </SelectControl>
          <TextAreaField
            id="review-notes"
            label="Review notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Describe what was checked and what should happen next."
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-metadata text-muted" role="status">
              {message ??
                (savedReview
                  ? `Previously saved by ${savedReview.reviewerName}.`
                  : "Not yet reviewed.")}
            </p>
            <Button size="small" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save assessment"}
            </Button>
          </div>
        </form>
      </Surface>
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
            disabled
            title="Alert submission requires a governed backend workflow"
          >
            <ShieldCheck size={14} /> Approval unavailable
          </Button>
        </div>
      </Surface>
    </>
  );
}

export function LguScreen({ segments }: { segments: string[] }) {
  const [screen, detail] = segments;
  if (!screen) return <LguHome />;
  if (screen === "map") return <LguOutlook />;
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
        notice={
          <Notice title="Access controls">
            Account roles and location assignments require authorized
            administrator review.
          </Notice>
        }
      />
      <div className="mt-3 grid gap-3">
        <Surface title="Workspace invitations">
          <p>
            Invite a verified recipient to a role, assign an LGU city, or check
            delivery.
          </p>
          <ActionLink href="/admin/users">Manage invitations</ActionLink>
        </Surface>
        <AccessPanel view="audit" />
      </div>
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
  // `saved` is read for the "saved" confirmation; nothing in this screen sets
  // it because the form is not wired to a backend yet.
  const [saved] = useState(false);
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
        notice={
          <Notice title="Configuration security" tone="info">
            Secrets are never displayed or stored in this form.
          </Notice>
        }
      />
      <ConfigurationTabs kind={kind} researchView={false} />
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
        <Button
          className="mt-5"
          size="small"
          disabled
          title="Configuration writes require a Convex-backed admin workflow"
        >
          <FloppyDisk size={14} /> Configuration unavailable
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

function AdminResearchSeparation() {
  return (
    <>
      <PageHeading
        title="Research workspace is role-specific"
        eyebrow="Administrator boundary"
        description="Forecast execution, run analysis, and model evidence now belong to approved researcher accounts."
      />
      <Notice title="Why this route changed" tone="info">
        Administrators verify access and configure the system; they do not use
        the researcher workflow as their primary workspace. Sign in with an
        approved researcher account to open /researcher.
      </Notice>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Surface
          title="Users and access"
          description="Approve researcher and LGU requests, then assign role and status."
        >
          <ActionLink href="/admin/users">Manage users</ActionLink>
        </Surface>
        <Surface
          title="System configuration"
          description="Review supported locations, providers, data sources, and active model configuration."
        >
          <ActionLink href="/admin/locations">Open configuration</ActionLink>
        </Surface>
        <Surface
          title="Audit evidence"
          description="Review administrative changes without entering the research workflow."
        >
          <ActionLink href="/admin/audit">Open audit log</ActionLink>
        </Surface>
      </div>
    </>
  );
}

export function AdminScreen({ segments }: { segments: string[] }) {
  const [screen, detail] = segments;
  if (!screen) return <AdminHome />;
  if (screen === "research") return <AdminResearchSeparation />;
  if (screen === "requests")
    return <AccessPanel view="queue" detail={detail} />;
  if (screen === "users") return <AccessPanel view="invite" />;
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
  if (screen === "audit") return <AccessPanel view="audit" />;
  if (screen === "settings") return <AdminSettings />;
  return <AdminHome />;
}

/**
 * LGU review queue, built from stored runs.
 *
 * A review row exists only because a run exists. This is a separate component so
 * the Convex query is never called without a ConvexProvider.
 */
function StoredRunReviewQueue() {
  const { data: runs, error } = useConvexQueryResult(
    convexFunctions.recentRuns,
    { limit: 10 },
  );
  if (error) {
    // A deployment that has not been pushed yet must say so, not pretend the
    // queue is empty.
    return (
      <p className="text-body text-muted">
        Stored runs are unavailable: {convexErrorHint(error)}.
      </p>
    );
  }
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
      run.reviewStatus === "pending"
        ? run.alerts > 0
          ? `${run.alerts} elevated day(s)`
          : "Nothing flagged"
        : run.reviewStatus,
    reviewer: run.reviewerName ?? "Unassigned",
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
