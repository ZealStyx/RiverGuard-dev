"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

import { RainfallChart } from "@/components/charts/RainfallChart";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { convexConfigured } from "@/components/dashboard/OutlookBridge";
import { RiskSummary } from "@/components/dashboard/RiskSummary";
import { RiverMap } from "@/components/map/RiverMap";
import { Button } from "@/components/ui";
import {
  roleCapabilities,
  roleDefinitions,
  supportedLocations,
  type ProductRole,
} from "@/data/prototype";
import {
  AUDIT_ACTION_LABEL,
  formatAuditTime,
  type AuditAction,
  type AuditOutcome,
} from "@/lib/audit";
import { cx } from "@/lib/classnames";
import { convexErrorHint, convexFunctions } from "@/lib/convex-functions";
import { useConvexQueryResult } from "@/lib/convex-query";
import { LOCATION_CODES, LOCATIONS } from "@/lib/locations";
import { usePreference } from "@/lib/preferences";
import {
  latestReviewByRun,
  REVIEW_DECISION_LABEL,
  type ReviewDecision,
  type RunReview,
} from "@/lib/reviews";
import {
  detailFromConvexRun,
  formatRunTime,
  RUN_SOURCE_LABEL,
  summaryFromConvexRun,
  type StoredRun,
  type StoredRunSummary,
} from "@/lib/runs";
import { WEATHER_PROVIDER_LABEL } from "@/lib/system";
import { useDatasetMeta } from "@/lib/use-dataset-meta";
import { useGisLayers } from "@/lib/use-gis-layers";
import { useModelArtifacts } from "@/lib/use-model-artifacts";
import { useLocalRun, useLocalRuns } from "@/lib/use-runs";
import {
  useAuditEvents,
  useReviews,
  useReviewsForRun,
  useSystemStatus,
} from "@/lib/use-server-data";
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
  const [primaryCity] = usePreference("primary-city", "Marikina");
  return (
    <>
      <PageHeading
        title="My outlook"
        eyebrow={primaryCity}
        description="A simplified seven-day experimental outlook with clear links to official information."
      />
      <Notice title="Official guidance" tone="warning">
        RiverGuard does not replace PAGASA advisories, LGU instructions, or
        evacuation guidance.
      </Notice>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Saved city"
          value={primaryCity}
          detail="Chosen in preferences"
          tone="secondary"
        />
        <ResidentRunMetric />
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

/**
 * "When was this last run" belongs to the stores, not to a literal.
 *
 * The resident overview used to say "Not yet run" whatever the store held. It
 * now reads the newest stored run, through the same two-store split as the LGU
 * screens (a Convex query needs a provider, so it gets its own component).
 */
function ResidentRunMetric() {
  return convexConfigured ? (
    <ConvexResidentRunMetric />
  ) : (
    <LocalResidentRunMetric />
  );
}

function ConvexResidentRunMetric() {
  const { data, error } = useConvexQueryResult(convexFunctions.recentRuns, {
    limit: 1,
  });
  return (
    <RunTimeMetric
      newestAt={data === undefined ? undefined : (data[0]?.requestedAt ?? null)}
      error={error ? convexErrorHint(error) : null}
    />
  );
}

function LocalResidentRunMetric() {
  const { data, error } = useLocalRuns(1);
  return (
    <RunTimeMetric
      newestAt={data === undefined ? undefined : (data[0]?.requestedAt ?? null)}
      error={error ? error.message : null}
    />
  );
}

function RunTimeMetric({
  newestAt,
  error,
}: {
  /** `undefined` while reading, `null` when the store is empty. */
  newestAt: number | null | undefined;
  error: string | null;
}) {
  if (error) {
    return (
      <Metric
        label="Updated"
        value="Unavailable"
        detail="The run store could not be read"
        tone="warning"
      />
    );
  }
  if (newestAt === undefined) {
    return (
      <Metric
        label="Updated"
        value="Reading…"
        detail="Checking the run store"
      />
    );
  }
  if (newestAt === null) {
    return (
      <Metric
        label="Updated"
        value="No run yet"
        detail="Run a forecast to fetch one"
        tone="neutral"
      />
    );
  }
  return (
    <Metric
      label="Updated"
      value={formatRunTime(newestAt)}
      detail="Newest stored run"
      tone="primary"
    />
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
  const [primaryCity, setPrimaryCity] = usePreference(
    "primary-city",
    "Marikina",
  );
  const [layer, setLayer] = useState<MapLayerId>("base");
  const gis = useGisLayers();
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
            {gis.layers.length === 0 ? (
              <Notice
                title="No verified hazard layer yet"
                tone="warning"
                className="mt-3"
              >
                No RiverGuard hazard geometry is loaded. Add a local GeoJSON
                file, describe it in data/gis/manifest.json, and pass npm run
                gis:verify before this view can show static hazard context.
              </Notice>
            ) : (
              <p className="text-metadata mt-3 text-muted">
                {gis.layers.length} verified local layer
                {gis.layers.length === 1 ? "" : "s"}:{" "}
                {gis.layers.map((entry) => entry.title).join(", ")}. Each one
                carries its publisher, licence and retrieval date in the map
                legend.
              </p>
            )}
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
                  tone={location.name === primaryCity ? "success" : "neutral"}
                >
                  {location.name === primaryCity
                    ? "Primary location"
                    : "Available"}
                </StatusBadge>
                <Button
                  size="small"
                  variant={
                    location.name === primaryCity ? "quiet" : "secondary"
                  }
                  className="mt-4 w-full"
                  onClick={() => setPrimaryCity(location.name)}
                >
                  {location.name === primaryCity
                    ? "Selected"
                    : "Set as primary"}
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
  const [primaryCity, setPrimaryCity] = usePreference(
    "primary-city",
    "Marikina",
  );
  const [outlookUpdates, setOutlookUpdates] = usePreference(
    "outlook-updates",
    "false",
  );
  const [reduceMotion, setReduceMotion] = usePreference(
    "reduce-motion",
    "false",
  );

  return (
    <>
      <PageHeading
        title="Preferences"
        eyebrow="Outlook and accessibility"
        description="Choose the city this workspace follows and how the interface behaves."
      />
      <Surface className="mx-auto max-w-4xl" title="Resident preferences">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectControl
            id="resident-city"
            label="Primary city"
            value={primaryCity}
            onChange={(event) => setPrimaryCity(event.target.value)}
          >
            {LOCATION_CODES.map((code) => (
              <option key={code} value={LOCATIONS[code].name}>
                {LOCATIONS[code].name}
              </option>
            ))}
          </SelectControl>
          <div className="grid gap-2 sm:col-span-2">
            <CheckControl
              id="outlook-notify"
              label="Experimental outlook updates"
              description="RiverGuard has no notification delivery yet, so nothing is sent; the choice is remembered for when it exists."
              checked={outlookUpdates === "true"}
              onChange={(event) =>
                setOutlookUpdates(event.target.checked ? "true" : "false")
              }
            />
            <CheckControl
              id="reduce-motion"
              label="Reduce motion"
              description="Shortens interface animation in this browser."
              checked={reduceMotion === "true"}
              onChange={(event) =>
                setReduceMotion(event.target.checked ? "true" : "false")
              }
            />
          </div>
        </div>
        <p className="text-metadata mt-4 text-muted" role="status">
          Saved in this browser as you change each control. There is no account
          to store preferences against, so another browser starts from the
          defaults.
        </p>
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
      {convexConfigured ? <ConvexLguOverview /> : <LocalLguOverview />}
    </>
  );
}

/**
 * The overview counts what the store holds, so it reads the same two stores the
 * queue does. The Convex branch is a separate component because calling a Convex
 * query without a provider throws; the local branch is a plain fetch.
 */
function ConvexLguOverview() {
  const { data, error } = useConvexQueryResult(convexFunctions.recentRuns, {
    limit: 25,
  });
  if (error) {
    return (
      <StoreUnavailable what="Stored runs" reason={convexErrorHint(error)} />
    );
  }
  return (
    <LguOverview runs={data ? data.map(summaryFromConvexRun) : undefined} />
  );
}

function LocalLguOverview() {
  const { data, error } = useLocalRuns(25);
  if (error) {
    return (
      <StoreUnavailable what="The local run store" reason={error.message} />
    );
  }
  return <LguOverview runs={data} />;
}

function StoreUnavailable({ what, reason }: { what: string; reason: string }) {
  return (
    <Notice className="mt-3" title="Stored data unavailable" tone="warning">
      {what} could not be read: {reason}
    </Notice>
  );
}

function LguOverview({ runs }: { runs: StoredRunSummary[] | undefined }) {
  const { data, error } = useReviews(200);
  const reviews = data?.reviews ?? [];
  const latest = latestReviewByRun(reviews);

  if (error) {
    return <StoreUnavailable what="Recorded reviews" reason={error.message} />;
  }
  if (runs === undefined) {
    return <p className="text-body mt-3 text-muted">Reading stored runs…</p>;
  }

  const awaiting = runs.filter((run) => !latest.has(run.runId));
  const degraded = runs.filter(
    (run) => run.providerDegraded || run.status !== "completed",
  );
  const escalated = [...latest.values()].filter(
    (review) => review.decision === "escalated",
  );
  const newest = runs[0];
  const newestReview = newest ? latest.get(newest.runId) : undefined;

  return (
    <>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Needs review"
          value={String(awaiting.length)}
          detail={
            awaiting.length
              ? "Stored runs without a decision"
              : "Every stored run has a decision"
          }
          tone={awaiting.length ? "warning" : "neutral"}
        />
        <Metric
          label="Latest run"
          value={newest ? formatRunTime(newest.requestedAt) : "None"}
          detail={
            newest
              ? `${newest.locations.join(", ") || "No location"} · ${newest.days} day(s)`
              : "Run a forecast to create one"
          }
          tone="primary"
        />
        <Metric
          label="Quality warnings"
          value={String(degraded.length)}
          detail="Degraded input or incomplete run"
          tone={degraded.length ? "warning" : "neutral"}
        />
        <Metric
          label="Escalated"
          value={String(escalated.length)}
          detail="Awaiting assessment"
          tone={escalated.length ? "danger" : "neutral"}
        />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Surface title="Latest stored outlook">
          {newest ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-major-status">
                    {newest.alerts > 0
                      ? `${newest.alerts} elevated day${newest.alerts === 1 ? "" : "s"}`
                      : "Nothing elevated"}
                  </p>
                  <p className="text-body mt-1 text-muted">
                    {newest.locations.join(", ") || "No location"} ·{" "}
                    {newest.days} day(s) · run{" "}
                    {formatRunTime(newest.requestedAt)}
                  </p>
                </div>
                <StatusBadge tone={newest.alerts > 0 ? "warning" : "neutral"}>
                  {newestReview
                    ? REVIEW_DECISION_LABEL[newestReview.decision]
                    : "Awaiting review"}
                </StatusBadge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <ActionLink
                  href={`/lgu/reviews/${encodeURIComponent(newest.runId)}`}
                >
                  Review this run
                </ActionLink>
                <ActionLink
                  href={`/admin/research/runs/${encodeURIComponent(newest.runId)}`}
                  variant="quiet"
                >
                  Open run record
                </ActionLink>
              </div>
            </>
          ) : (
            <EmptyPanel
              title="No stored run yet"
              description="This card shows the newest run in the store. Nothing is stored, so there is no outlook to display."
              actionHref="/admin/research/forecast/new"
              actionLabel="Run a forecast"
            />
          )}
        </Surface>
        <Surface title="Review activity">
          {reviews.length ? (
            <ul className="grid gap-2">
              {reviews.slice(0, 4).map((review) => (
                <li
                  key={review.reviewId}
                  className="flex items-start justify-between gap-3 border-b border-line pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-button">
                      {REVIEW_DECISION_LABEL[review.decision]}
                    </p>
                    <p className="text-metadata mt-0.5 text-muted">
                      {review.reviewer} · {formatRunTime(review.createdAt)} ·{" "}
                      {review.runId}
                    </p>
                  </div>
                  <Link
                    href={`/lgu/reviews/${encodeURIComponent(review.runId)}`}
                    className="text-metadata shrink-0 text-brand-primary hover:underline"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-muted">
              No decisions recorded. A review is written to{" "}
              <code className="rounded bg-canvas px-1 py-0.5">
                .data/reviews.json
              </code>{" "}
              when an operator submits one, so this list is empty until then.
            </p>
          )}
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
            { key: "stored", label: "Stored runs" },
          ]}
          rows={supportedLocations
            .filter((location) => location.name === "Marikina")
            .map((location) => ({
              name: location.name,
              support: location.support,
              stored: "Listed in the review queue",
            }))}
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
              <StatusBadge tone="neutral">City-level run</StatusBadge>
            </div>
            <dl className="text-body mt-4 grid gap-2 border-t border-line pt-3 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <dt className="text-metadata text-muted">Stored runs</dt>
                <dd>Listed in the review queue</dd>
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
  if (detail) return <ReviewForm runId={detail} />;
  return (
    <>
      <PageHeading
        title="Review queue"
        eyebrow="Assigned assessments"
        description="Stored runs, with the decision each one carries."
        actions={
          <ActionLink href="/admin/research/forecast/new">
            Run a forecast
          </ActionLink>
        }
      />
      <Surface title="Queue" description="Stored runs awaiting LGU review">
        {convexConfigured ? <ConvexReviewQueue /> : <LocalReviewQueue />}
      </Surface>
      <Notice className="mt-3" title="What a review is">
        A review records an internal assessment against a stored run. It does
        not publish a warning or reach an official channel, and the decision is
        stored on this machine in{" "}
        <code className="rounded bg-canvas px-1 py-0.5">
          .data/reviews.json
        </code>{" "}
        because this prototype has no shared database.
      </Notice>
    </>
  );
}

function ConvexReviewQueue() {
  const { data, error } = useConvexQueryResult(convexFunctions.recentRuns, {
    limit: 25,
  });
  if (error) {
    return (
      <StoreUnavailable what="Stored runs" reason={convexErrorHint(error)} />
    );
  }
  return (
    <ReviewQueueTable
      runs={data ? data.map(summaryFromConvexRun) : undefined}
    />
  );
}

function LocalReviewQueue() {
  const { data, error } = useLocalRuns(25);
  if (error) {
    return (
      <StoreUnavailable what="The local run store" reason={error.message} />
    );
  }
  return <ReviewQueueTable runs={data} />;
}

function ReviewQueueTable({ runs }: { runs: StoredRunSummary[] | undefined }) {
  const { data, error } = useReviews(200);
  const latest = latestReviewByRun(data?.reviews ?? []);

  if (error) {
    return <StoreUnavailable what="Recorded reviews" reason={error.message} />;
  }
  if (runs === undefined) {
    return <p className="text-body text-muted">Loading stored runs…</p>;
  }
  if (runs.length === 0) {
    return (
      <p className="text-body text-muted">
        No stored runs yet. Run a forecast and it appears here, ready for
        review.
      </p>
    );
  }

  const rows: Array<Record<string, string>> = runs.map((run) => {
    const review = latest.get(run.runId);
    return {
      run: run.runId,
      location: run.locations.join(", ") || "—",
      period: `${run.days} day(s) · issued ${formatRunTime(run.requestedAt)}`,
      quality: run.providerDegraded
        ? "Degraded weather input"
        : run.status === "completed"
          ? "Complete"
          : run.status,
      review: review
        ? REVIEW_DECISION_LABEL[review.decision]
        : "Awaiting review",
      reviewer: review ? review.reviewer : "Unassigned",
      updated: formatRunTime(review ? review.createdAt : run.requestedAt),
    };
  });

  return (
    <DataTable
      columns={[
        { key: "run", label: "Run" },
        { key: "location", label: "Location" },
        { key: "period", label: "Valid period" },
        { key: "quality", label: "Quality" },
        { key: "review", label: "Review status" },
        { key: "reviewer", label: "Reviewer" },
        { key: "updated", label: "Updated" },
      ]}
      rows={rows}
      actions={(row) => (
        <ActionLink href={`/lgu/reviews/${row.run}`} variant="quiet">
          Open
        </ActionLink>
      )}
    />
  );
}

function ReviewForm({ runId }: { runId?: string }) {
  if (!runId) {
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
          description="A review attaches to one stored run. Pick a row in the queue to open its record."
          actionHref="/lgu/reviews"
          actionLabel="Back to queue"
        />
      </>
    );
  }

  return convexConfigured ? (
    <ConvexReviewRun runId={runId} />
  ) : (
    <LocalReviewRun runId={runId} />
  );
}

function ConvexReviewRun({ runId }: { runId: string }) {
  const { data, error } = useConvexQueryResult(convexFunctions.getRun, {
    runId,
  });
  if (error) {
    return <ReviewUnreadable runId={runId} reason={convexErrorHint(error)} />;
  }
  if (data === undefined) {
    return <p className="text-body text-muted">Reading the stored run…</p>;
  }
  if (data === null) return <ReviewMissing runId={runId} />;
  return <ReviewPanel run={detailFromConvexRun(data)} />;
}

function LocalReviewRun({ runId }: { runId: string }) {
  const { data, error } = useLocalRun(runId);
  if (error) return <ReviewUnreadable runId={runId} reason={error.message} />;
  if (data === undefined) {
    return <p className="text-body text-muted">Reading the stored run…</p>;
  }
  if (data === null) return <ReviewMissing runId={runId} />;
  return <ReviewPanel run={data} />;
}

function ReviewUnreadable({
  runId,
  reason,
}: {
  runId: string;
  reason: string;
}) {
  return (
    <>
      <PageHeading
        title="Run could not be read"
        eyebrow="Review queue"
        description={`Run ${runId}`}
        actions={
          <ActionLink href="/lgu/reviews" variant="quiet">
            Back to queue
          </ActionLink>
        }
      />
      <Notice title="Storage problem" tone="danger">
        {reason}
      </Notice>
    </>
  );
}

function ReviewMissing({ runId }: { runId: string }) {
  return (
    <>
      <PageHeading
        title="No such run"
        eyebrow="Review queue"
        description={`Run ${runId}`}
        actions={
          <ActionLink href="/lgu/reviews" variant="quiet">
            Back to queue
          </ActionLink>
        }
      />
      <EmptyPanel
        title="No stored run with that identifier"
        description="The store has no run with this id, so there is nothing to assess. Run a forecast, then open it from the queue."
        actionHref="/lgu/reviews"
        actionLabel="Back to queue"
      />
    </>
  );
}

function ReviewPanel({ run }: { run: StoredRun }) {
  const [reviewer, setReviewer] = useState("");
  const [decision, setDecision] = useState<ReviewDecision>("approved");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<RunReview | null>(null);
  const history = useReviewsForRun(run.runId);

  const recorded = [
    ...(saved ? [saved] : []),
    ...(history.data?.reviews ?? []).filter(
      (review) => review.reviewId !== saved?.reviewId,
    ),
  ];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: run.runId, decision, note, reviewer }),
      });
      const payload = (await response.json()) as {
        review?: RunReview;
        error?: string;
        detail?: string;
      };
      if (!response.ok || !payload.review) {
        throw new Error(
          [payload.error, payload.detail].filter(Boolean).join(" — ") ||
            `Request failed (${response.status})`,
        );
      }
      setSaved(payload.review);
      setNote("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeading
        title="Forecast review"
        eyebrow={`${run.locations.join(", ") || "No location"} · ${run.status}`}
        description="Record an internal assessment against this stored run. Nothing here publishes a warning."
        actions={
          <ActionLink href="/lgu/reviews" variant="quiet">
            Back to queue
          </ActionLink>
        }
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Surface title="Decision">
          <form className="grid gap-3" onSubmit={submit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                id="review-reviewer"
                label="Reviewer"
                placeholder="Name recorded with the decision"
                value={reviewer}
                onChange={(event) => setReviewer(event.target.value)}
                maxLength={80}
                required
              />
              <SelectControl
                id="review-decision"
                label="Decision"
                value={decision}
                onChange={(event) =>
                  setDecision(event.target.value as ReviewDecision)
                }
              >
                <option value="approved">Approve for internal use</option>
                <option value="changes-requested">Request changes</option>
                <option value="escalated">Escalate</option>
              </SelectControl>
            </div>
            <TextAreaField
              id="review-note"
              label={
                decision === "approved" ? "Note (optional)" : "Note (required)"
              }
              placeholder="What the assessment rests on, and what the reader should weigh…"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={5}
              maxLength={2000}
            />
            {error ? (
              <p className="text-metadata text-danger" role="alert">
                {error}
              </p>
            ) : null}
            {saved ? (
              <p className="text-metadata text-success" role="status">
                Recorded: {REVIEW_DECISION_LABEL[saved.decision]}.
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button
                type="submit"
                size="small"
                loading={submitting}
                loadingLabel="Recording"
              >
                Record decision
              </Button>
            </div>
          </form>
        </Surface>
        <Surface
          title="The run this assesses"
          description={RUN_SOURCE_LABEL[run.source]}
        >
          <dl className="text-body grid grid-cols-[130px_1fr] gap-2">
            <dt className="text-muted">Run</dt>
            <dd className="break-all">{run.runId}</dd>
            <dt className="text-muted">Location</dt>
            <dd>{run.locations.join(", ") || "—"}</dd>
            <dt className="text-muted">Issued</dt>
            <dd>{run.issueDate}</dd>
            <dt className="text-muted">Days</dt>
            <dd>{run.days}</dd>
            <dt className="text-muted">Elevated days</dt>
            <dd>{run.alerts}</dd>
            <dt className="text-muted">Provider</dt>
            <dd>
              {run.provider}
              {run.providerDegraded ? " (degraded input)" : ""}
            </dd>
            <dt className="text-muted">Model</dt>
            <dd>{run.modelVersion ?? "—"}</dd>
            <dt className="text-muted">Threshold</dt>
            <dd>{run.operatingThreshold.toFixed(2)}</dd>
          </dl>
          <ActionLink
            href={`/admin/research/runs/${encodeURIComponent(run.runId)}`}
            variant="quiet"
            className="mt-4 w-full"
          >
            Open full run record
          </ActionLink>
        </Surface>
      </div>
      <Surface className="mt-3" title="Recorded decisions">
        {history.error ? (
          <p className="text-body text-muted">
            The recorded decisions could not be read: {history.error.message}
          </p>
        ) : recorded.length ? (
          <ul className="grid gap-3">
            {recorded.map((review) => (
              <li
                key={review.reviewId}
                className="border-b border-line pb-3 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-button">
                    {REVIEW_DECISION_LABEL[review.decision]}
                  </p>
                  <p className="text-metadata text-muted">
                    {review.reviewer} · {formatRunTime(review.createdAt)}
                  </p>
                </div>
                {review.note ? (
                  <p className="text-body mt-1 whitespace-pre-line text-muted">
                    {review.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-muted">
            No decision has been recorded for this run yet.
          </p>
        )}
      </Surface>
    </>
  );
}

/**
 * Alerts are deliberately absent, not unfinished.
 *
 * RiverGuard has no publication authority, and this prototype has no approved
 * channel to publish through, so a draft form that ended at "approval requested"
 * was a workflow that could never finish. The screen now says what the system
 * does instead of offering a composer that cannot send anything.
 */
function LguAlerts() {
  return (
    <>
      <PageHeading
        title="Alerts and notes"
        eyebrow="Not part of this prototype"
        description="RiverGuard does not draft, approve, or publish warnings."
      />
      <Notice title="No publication authority" tone="warning">
        Official rainfall warnings and evacuation instructions come from PAGASA
        and the affected local government unit. A model result is never an
        official advisory, and this application cannot send one.
      </Notice>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Surface title="Where official guidance comes from">
          <ul className="text-body grid gap-2 text-muted">
            <li>PAGASA — rainfall and river-level warnings.</li>
            <li>NCR local government units — evacuation and road guidance.</li>
            <li>MMDA — metro-wide traffic and flood advisories.</li>
          </ul>
          <ActionLink
            href="/official-sources"
            variant="quiet"
            className="mt-4 w-full"
          >
            Open official sources
          </ActionLink>
        </Surface>
        <Surface title="What this workspace does instead">
          <p className="text-body text-muted">
            A stored forecast run can be assessed in the review queue. The
            decision is recorded internally and never leaves this machine.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionLink href="/lgu/reviews">Open review queue</ActionLink>
            <ActionLink href="/lgu/outlook" variant="quiet">
              Review forecast
            </ActionLink>
          </div>
        </Surface>
      </div>
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
  if (screen === "alerts") return <LguAlerts />;
  return <LguHome />;
}

function AccessRequests({ detail }: { detail?: string }) {
  if (detail) {
    return (
      <>
        <PageHeading
          title="Access request"
          eyebrow="Administrator review"
          description="Account provisioning is handled by the identity service, which this prototype does not include."
          actions={
            <ActionLink href="/admin/requests" variant="quiet">
              Back to requests
            </ActionLink>
          }
        />
        <EmptyPanel
          title="No request with that identifier"
          description="Nothing here stores access requests, so no applicant record exists for this id. There is no identity to verify and no decision to record."
          actionHref="/admin/requests"
          actionLabel="Back to requests"
        />
      </>
    );
  }
  return (
    <>
      <PageHeading
        title="User access requests"
        eyebrow="Administrator review"
        description="Account provisioning is handled by the identity service, which this prototype does not include."
      />
      <Notice title="Nothing to review here" tone="warning">
        Requests are created by the identity service when someone asks for an
        account. This application never receives them, so it cannot approve,
        reject, or assign a role.
      </Notice>
      <Surface className="mt-3" title="Pending requests">
        <p className="text-body text-muted">
          No access requests are recorded, and none can be created from this
          build.
        </p>
      </Surface>
    </>
  );
}

function UsersRoles() {
  const roles: ProductRole[] = ["admin", "lgu", "resident"];
  const rows = roles.map((role) => ({
    role: roleDefinitions[role].label,
    description: roleDefinitions[role].description,
    capabilities:
      roleCapabilities[role].length > 0
        ? roleCapabilities[role].join(", ")
        : "No administrative capabilities",
  }));

  return (
    <>
      <PageHeading
        title="Users and roles"
        eyebrow="Access administration"
        description="The roles this build defines, and what each one may do."
      />
      <Notice title="No accounts are stored here" tone="warning">
        Sign-in and account administration belong to the identity service, which
        this local prototype does not include. Nothing on this screen creates,
        invites, or edits an account.
      </Notice>
      <Surface className="mt-3" title="Roles defined by this build">
        <DataTable
          columns={[
            { key: "role", label: "Role" },
            { key: "description", label: "Scope" },
            { key: "capabilities", label: "Administrative capabilities" },
          ]}
          rows={rows}
        />
      </Surface>
      <Surface className="mt-3" title="Approved users">
        <p className="text-body text-muted">
          No user records are available, so no names, e-mail addresses, or
          locations are shown.
        </p>
      </Surface>
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

const CONFIGURATION_COPY: Record<
  string,
  { title: string; description: string }
> = {
  locations: {
    title: "Supported locations",
    description:
      "The cities this build can score, with the representative point and alarm levels the model reports against.",
  },
  "data-sources": {
    title: "Data-source configuration",
    description:
      "What the bundled history covers, and what it is allowed to be used for.",
  },
  provider: {
    title: "Weather provider",
    description:
      "The live adapter the server calls, and whether the offline fixture is permitted as a fallback.",
  },
  models: {
    title: "Model versions",
    description:
      "The artifacts this build loaded, and the operating threshold they were tuned to.",
  },
  "hazard-layers": {
    title: "Hazard layers",
    description:
      "Verified static hazard geometry available to the map, with its provenance.",
  },
};

/**
 * Configuration used to be a form of `defaultValue` fields with a Save button
 * that set a session flag — the values were literals and nothing could be
 * stored. Nothing in this prototype can be configured at runtime, so the screen
 * reports what the running service is set to instead of pretending to edit it.
 */
function ConfigurationScreen({
  kind,
  detail,
}: {
  kind: string;
  detail?: string;
}) {
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

  const copy = CONFIGURATION_COPY[kind] ?? CONFIGURATION_COPY.locations;
  return (
    <>
      <PageHeading
        title={copy.title}
        eyebrow="System configuration"
        description={copy.description}
      />
      <ConfigurationTabs kind={kind} researchView={false} />
      <Notice className="mb-3" title="Read-only in this build">
        Every value below is read from the running service, its artifacts, or
        its environment variables. There is no configuration endpoint, so there
        is nothing here to edit or save.
      </Notice>
      <Surface title="Current configuration">
        <ConfigurationRecord kind={kind} />
      </Surface>
    </>
  );
}

function ConfigurationRecord({ kind }: { kind: string }) {
  if (kind === "locations") return <LocationConfiguration />;
  if (kind === "data-sources") return <DataSourceConfiguration />;
  if (kind === "provider") return <ProviderConfiguration />;
  if (kind === "models") return <ModelConfiguration />;
  if (kind === "hazard-layers") return <HazardLayerConfiguration />;
  return <LocationConfiguration />;
}

function DefinitionList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="border-b border-line pb-2">
          <dt className="text-metadata text-muted">{label}</dt>
          <dd className="text-body mt-0.5 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Reading({ what }: { what: string }) {
  return <p className="text-body text-muted">Reading {what}…</p>;
}

function Unavailable({ title, reason }: { title: string; reason: string }) {
  return (
    <Notice title={title} tone="warning">
      {reason}
    </Notice>
  );
}

function LocationConfiguration() {
  return (
    <DataTable
      columns={[
        { key: "city", label: "City" },
        { key: "river", label: "River" },
        { key: "point", label: "Representative point" },
        { key: "elevation", label: "Elevation" },
        { key: "alarms", label: "Alarm levels" },
        { key: "source", label: "Alarm source" },
      ]}
      rows={LOCATION_CODES.map((code) => {
        const location = LOCATIONS[code];
        return {
          city: location.name,
          river: location.river,
          point: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
          elevation: `${location.elevationM} m`,
          alarms: location.alarmLevelsM
            .map((level) => `${level} m`)
            .join(" / "),
          source: location.alarmsVerified
            ? "Published (PAGASA / LGU)"
            : "Indicative, not published",
        };
      })}
    />
  );
}

function DataSourceConfiguration() {
  const { dataset, error, loading } = useDatasetMeta();
  if (loading) return <Reading what="the dataset metadata" />;
  if (error || !dataset) {
    return (
      <Unavailable
        title="Dataset metadata unavailable"
        reason={error ?? "The dataset returned no metadata."}
      />
    );
  }
  return (
    <DefinitionList
      rows={[
        ["Coverage", `${dataset.rows.toLocaleString()} city-days`],
        ["Date range", `${dataset.dateMin} → ${dataset.dateMax}`],
        ["Rainfall sources", dataset.rainSources.join(", ") || "Not declared"],
        ["Recorded rainfall from", dataset.realRainFrom ?? "Not recorded"],
        [
          "Role in the system",
          "Training history and charts only. Never a forecast input — the model reads the weather provider.",
        ],
      ]}
    />
  );
}

function ProviderConfiguration() {
  const { data, error } = useSystemStatus();
  if (error) {
    return (
      <Unavailable title="Service status unavailable" reason={error.message} />
    );
  }
  // Rows render immediately with a reading placeholder, so the labels exist
  // before the status request lands (and in the server-rendered HTML).
  const status = data;
  return (
    <DefinitionList
      rows={[
        [
          "Weather provider",
          status ? WEATHER_PROVIDER_LABEL[status.weather.provider] : "Reading…",
        ],
        [
          "Offline fixture fallback",
          status
            ? status.weather.fixtureAllowed
              ? "Permitted — runs that use it are labelled degraded"
              : "Disabled"
            : "Reading…",
        ],
        [
          "Selected by",
          "WEATHER_PROVIDER and WEATHER_ALLOW_FIXTURE in the server environment",
        ],
        ["Variables", "Daily rainfall, antecedent sums, soil moisture"],
        [
          "Soil moisture",
          "Open-Meteo hourly soil_moisture_0_to_7cm (0–7 cm, volumetric). The water-balance bucket is used when the model returns none.",
        ],
        [
          "Rain gauge file",
          !status
            ? "Reading…"
            : status.riverGauge.error
              ? status.riverGauge.error
              : status.riverGauge.configured
                ? `${status.riverGauge.rows.toLocaleString()} reading(s) from ${status.riverGauge.file}. Gauge days replace the provider's rainfall.`
                : "Not configured — the provider's 30-day history is the only rainfall source.",
        ],
        [
          "River context",
          "GloFAS daily river discharge from the Open-Meteo Flood API, shown beside the result. Not a model input and not stored.",
        ],
        [
          "Run storage",
          status
            ? status.convex.configured
              ? "Convex deployment"
              : "This machine — .data/runs.json"
            : "Reading…",
        ],
      ]}
    />
  );
}

function ModelConfiguration() {
  const { model, error, loading } = useModelArtifacts();
  if (loading) return <Reading what="the model artifacts" />;
  if (error || !model) {
    return (
      <Unavailable
        title="Model artifacts unavailable"
        reason={error ?? "No model artifacts were loaded."}
      />
    );
  }
  const verified = model.cities
    .filter((city) => city.alarmsVerified)
    .map((city) => city.name);
  return (
    <DefinitionList
      rows={[
        ["Model", `${model.name} ${model.version}`],
        ["Kind", model.kind],
        ["Trained", model.trainedAt],
        ["Operating threshold", model.operatingThreshold.toFixed(2)],
        ["Target", model.target],
        ["Cities", model.cities.map((city) => city.name).join(", ")],
        [
          "Alarm levels verified",
          verified.length ? verified.join(", ") : "None — treat as indicative",
        ],
      ]}
    />
  );
}

function HazardLayerConfiguration() {
  const gis = useGisLayers();
  if (gis.loading) return <Reading what="the verified layer list" />;
  if (gis.status !== "ok") {
    return (
      <Unavailable
        title="Layer list unavailable"
        reason={gis.error ?? "The verified layer list could not be read."}
      />
    );
  }
  if (!gis.layers.length) {
    return (
      <p className="text-body text-muted">
        No verified hazard layer is loaded. Add a local GeoJSON file, describe
        it in{" "}
        <code className="rounded bg-canvas px-1 py-0.5">
          data/gis/manifest.json
        </code>{" "}
        and run{" "}
        <code className="rounded bg-canvas px-1 py-0.5">
          npm run gis:verify
        </code>
        .
      </p>
    );
  }
  return (
    <DataTable
      columns={[
        { key: "layer", label: "Layer" },
        { key: "publisher", label: "Publisher" },
        { key: "license", label: "Licence" },
        { key: "retrieved", label: "Retrieved" },
      ]}
      rows={gis.layers.map((layer) => ({
        layer: layer.title,
        publisher: layer.source.publisher,
        license: layer.source.license,
        retrieved: layer.source.retrievedAt,
      }))}
    />
  );
}

/**
 * The audit log reads what the service actually recorded.
 *
 * Filters are applied by the reader (`GET /api/audit`), so an empty table always
 * means "nothing matches", never "the filter is decorative".
 */
function AuditLog() {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState<AuditAction | "all">("all");
  const [outcome, setOutcome] = useState<AuditOutcome | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtersActive =
    Boolean(actor.trim() || from || to) ||
    action !== "all" ||
    outcome !== "all";

  const { data, error } = useAuditEvents({
    actor,
    action,
    outcome,
    from: from || undefined,
    to: to || undefined,
    limit: 100,
  });

  const events = data?.events ?? [];
  const rows = events.map((event) => ({
    time: formatAuditTime(event.at),
    actor: event.actor,
    action: AUDIT_ACTION_LABEL[event.action],
    target: event.target,
    outcome: event.outcome === "success" ? "Success" : "Failed",
    detail: event.detail,
  }));

  function resetFilters() {
    setActor("");
    setAction("all");
    setOutcome("all");
    setFrom("");
    setTo("");
  }

  return (
    <>
      <PageHeading
        title="Audit log"
        eyebrow="Administrator evidence"
        description="What this service recorded, when, and with what result."
      />
      <Notice className="mb-3" title="What this log is" tone="warning">
        Entries are written to{" "}
        <code className="rounded bg-canvas px-1 py-0.5">.data/audit.json</code>{" "}
        on this machine when a forecast run is stored or a review decision is
        recorded. There is no sign-in, so the actor is the local operator; this
        is an activity log, not a compliance-grade trail.
      </Notice>
      <Surface
        className="mb-3"
        title="Filters"
        description="Dates are Manila days"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TextField
            id="audit-actor"
            label="Actor"
            placeholder="Name or system"
            value={actor}
            onChange={(event) => setActor(event.target.value)}
          />
          <SelectControl
            id="audit-action"
            label="Action type"
            value={action}
            onChange={(event) =>
              setAction(event.target.value as AuditAction | "all")
            }
          >
            <option value="all">All actions</option>
            <option value="forecast.run">Forecast run</option>
            <option value="review.recorded">Review recorded</option>
          </SelectControl>
          <TextField
            id="audit-from"
            label="From"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <TextField
            id="audit-to"
            label="To"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
          <SelectControl
            id="audit-outcome"
            label="Outcome"
            value={outcome}
            onChange={(event) =>
              setOutcome(event.target.value as AuditOutcome | "all")
            }
          >
            <option value="all">All outcomes</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </SelectControl>
          <div className="flex items-end">
            <Button
              size="small"
              variant="quiet"
              onClick={resetFilters}
              disabled={!filtersActive}
            >
              Reset filters
            </Button>
          </div>
        </div>
      </Surface>
      <Surface title="Recorded activity">
        {error ? (
          <Unavailable title="Audit store unavailable" reason={error.message} />
        ) : data === undefined ? (
          <Reading what="the audit store" />
        ) : events.length === 0 ? (
          <p className="text-body text-muted">
            {filtersActive
              ? "No recorded event matches these filters."
              : "No events are recorded yet. Storing a forecast run or recording a review decision adds one."}
          </p>
        ) : (
          <>
            <DataTable
              columns={[
                { key: "time", label: "Time" },
                { key: "actor", label: "Actor" },
                { key: "action", label: "Action" },
                { key: "target", label: "Target" },
                { key: "outcome", label: "Outcome" },
                { key: "detail", label: "Detail" },
              ]}
              rows={rows}
            />
            <p className="text-metadata mt-2 text-muted">
              {events.length} event{events.length === 1 ? "" : "s"} shown
              {filtersActive ? " (filtered)" : ""}.
            </p>
          </>
        )}
      </Surface>
    </>
  );
}

function AdminSettings() {
  const system = useSystemStatus();
  const model = useModelArtifacts();
  const gis = useGisLayers();
  const status = system.data;

  const counted = (value: number | null | undefined) => {
    if (status === undefined) return "Reading…";
    if (value === null) return "Store unreadable";
    return value === undefined ? "—" : value.toLocaleString();
  };

  return (
    <>
      <PageHeading
        title="System settings"
        eyebrow="System controls"
        description="Safety notices, the live status of this service, and the capabilities this build does not have."
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <Surface title="Safety and terminology">
          <CheckControl
            id="experimental-labels"
            label="Require experimental labels"
            description="Always on for unverified results; not switchable here."
            checked
            readOnly
          />
          <CheckControl
            id="official-reminder"
            label="Show official-source reminder"
            description="Always shown on result screens; not switchable here."
            checked
            readOnly
          />
        </Surface>
        <Surface
          title="Live service status"
          description="Read from this process on each request"
        >
          {system.error ? (
            <Unavailable
              title="Status unavailable"
              reason={system.error.message}
            />
          ) : (
            <DefinitionList
              rows={[
                [
                  "Weather provider",
                  status
                    ? WEATHER_PROVIDER_LABEL[status.weather.provider]
                    : "Reading…",
                ],
                [
                  "Offline weather fixture",
                  status
                    ? status.weather.fixtureAllowed
                      ? "Permitted — runs are labelled degraded"
                      : "Disabled"
                    : "Reading…",
                ],
                [
                  "Convex deployment",
                  status
                    ? status.convex.configured
                      ? "Configured"
                      : "Not configured — runs stay on this machine"
                    : "Reading…",
                ],
                ["Stored runs", counted(status?.storage.runs)],
                ["Recorded reviews", counted(status?.storage.reviews)],
                ["Audit events", counted(status?.storage.auditEvents)],
                [
                  "Model",
                  model.loading
                    ? "Reading…"
                    : model.model
                      ? `${model.model.version} (${model.model.kind})`
                      : (model.error ?? "Unavailable"),
                ],
                [
                  "Rain gauge file",
                  status
                    ? status.riverGauge.error
                      ? "Unusable — see provider configuration"
                      : status.riverGauge.configured
                        ? `${status.riverGauge.rows.toLocaleString()} reading(s)`
                        : "Not configured"
                    : "Reading…",
                ],
                [
                  "Verified hazard layers",
                  gis.loading
                    ? "Reading…"
                    : gis.status !== "ok"
                      ? (gis.error ?? "Unavailable")
                      : String(gis.layers.length),
                ],
              ]}
            />
          )}
        </Surface>
      </div>
      <Surface className="mt-3" title="Deferred capabilities">
        <div className="grid gap-2">
          <StatusBadge tone="neutral">Dark theme · deferred</StatusBadge>
          <StatusBadge tone="warning">
            Authentication · identity service required
          </StatusBadge>
          <StatusBadge tone="warning">
            Alert publishing · governance and channel required
          </StatusBadge>
          <StatusBadge tone="warning">
            Real GIS layers · verified data required
          </StatusBadge>
        </div>
      </Surface>
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
  return <DashboardLayout />;
}
