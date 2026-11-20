"use client";

import {
  ArrowClockwise,
  ArrowRight,
  FloppyDisk,
  MapPin,
  Play,
  Plus,
} from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { MonthlyRainfallChart } from "@/components/charts/MonthlyRainfallChart";
import { ObservedHistoryChart } from "@/components/charts/ObservedHistoryChart";
import { convexConfigured } from "@/components/dashboard/OutlookBridge";
import { RiskSummary } from "@/components/dashboard/RiskSummary";
import {
  LOCATIONS,
  locationCodeForName,
  type LocationCode,
} from "@/lib/locations";
import { describePersistence } from "@/lib/persistence";
import { convexErrorHint } from "@/lib/convex-functions";
import { useConvexQueryResult } from "@/lib/convex-query";
import { useOutlookFeed } from "@/lib/outlook";
import { RiverMap } from "@/components/map/RiverMap";
import { ResearcherWorkspaceDashboard } from "@/components/researcher/ResearcherWorkspaceDashboard";
import { Button } from "@/components/ui";
import {
  dataSourceRows,
  modelVersionRows,
  runHistoryRows,
  supportedLocations,
} from "@/data/prototype";
import { convexFunctions } from "@/lib/convex-functions";
import {
  detailFromConvexRun,
  formatMetres,
  formatProbability,
  formatRunTime,
  RUN_SOURCE_LABEL,
  summaryFromConvexRun,
  type StoredRun,
  type StoredRunSummary,
} from "@/lib/runs";
import { useLocalRun, useLocalRuns } from "@/lib/use-runs";
import { useDatasetMeta } from "@/lib/use-dataset-meta";
import { useModelArtifacts } from "@/lib/use-model-artifacts";
import { useGisLayers } from "@/lib/use-gis-layers";
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
  Stepper,
  Surface,
  TextAreaField,
  TextField,
} from "./Primitives";

function DashboardOverview() {
  return <ResearcherWorkspaceDashboard />;
}

function MapWorkspace() {
  const [activeLayer, setActiveLayer] = useState<MapLayerId>("base");
  const [locationCode, setLocationCode] = useState<LocationCode>("marikina");
  const [selectedDay, setSelectedDay] = useState(0);
  const outlook = useOutlookFeed(locationCode);
  const gis = useGisLayers();
  return (
    <>
      <PageHeading
        title="Data & map"
        eyebrow="Spatial explorer"
        description="Explore supported locations and review the data sources behind the research workspace."
        actions={
          <ActionLink href="/admin/locations/marikina?view=research">
            View Marikina details <ArrowRight size={14} />
          </ActionLink>
        }
      />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_320px]">
        <RiverMap
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
          forecast={outlook.snapshot}
          locationCode={locationCode}
          selectedDay={selectedDay}
          onDayChange={setSelectedDay}
          onLocationChange={setLocationCode}
        />
        <div className="grid content-start gap-3 xl:flex xl:h-full xl:flex-col">
          <Surface
            title="Location list"
            description="Accessible alternative to the map"
            className="xl:flex-1"
          >
            <div className="grid gap-2">
              {supportedLocations.map((location) => (
                <div
                  key={location.name}
                  className="rounded-control border border-line p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-button flex items-center gap-1">
                        <MapPin size={14} /> {location.name}
                      </p>
                      <p className="text-metadata mt-1 text-muted">
                        {location.support} · Updated {location.updated}
                      </p>
                    </div>
                    <StatusBadge
                      tone={location.status === "Elevated" ? "warning" : "info"}
                    >
                      {location.status}
                    </StatusBadge>
                  </div>
                  <ActionLink
                    href={`/admin/locations/${location.name.toLowerCase().replace(" ", "-")}?view=research`}
                    variant="quiet"
                    className="mt-3 w-full"
                  >
                    Open details
                  </ActionLink>
                </div>
              ))}
            </div>
          </Surface>
          <Notice title="Map limitation" className="xl:shrink-0">
            {gis.layers.length === 0
              ? "This is a real OpenStreetMap basemap. RiverGuard boundaries, monitoring stations and hazard layers are not loaded: none has passed verification in data/gis yet. The forecast model itself is city-level, so it has no geometry of its own to draw."
              : `This is a real OpenStreetMap basemap plus ${gis.layers.length} verified local layer${
                  gis.layers.length === 1 ? "" : "s"
                } (${gis.layers
                  .map((entry) => entry.title)
                  .join(
                    ", ",
                  )}). The forecast model is city-level, so its predictions appear as numbers per city, never as geometry.`}
          </Notice>
        </div>
      </div>
    </>
  );
}

export function LocationDetails() {
  const { dataset } = useDatasetMeta();
  return (
    <>
      <PageHeading
        title="Marikina"
        eyebrow="Supported sample location"
        description="City-level experimental evidence, historical sample readings, and source limitations."
        actions={
          <>
            <ActionLink href="/researcher/forecast/new">
              Run forecast
            </ActionLink>
            <ActionLink href="/researcher/map" variant="quiet">
              Back to map
            </ActionLink>
          </>
        }
      />
      <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Support"
          value="Available"
          detail="Sample city-level coverage"
          tone="secondary"
        />
        <Metric
          label="Latest index"
          value="No run"
          detail="Run a forecast to score this city"
          tone="warning"
        />
        <Metric
          label="Rainfall"
          value="See history"
          detail="Observed rows from the dataset"
          tone="primary"
        />
        <Metric
          label="Quality"
          value="Research"
          detail="Observed rain; derived water level"
          tone="warning"
        />
      </div>
      <div className="grid gap-3">
        <ObservedHistoryChart
          eyebrow="Observed records"
          location="Marikina"
          limit={14}
        />
        <Surface title="Coverage and provenance">
          <dl className="grid grid-cols-[105px_minmax(0,1fr)] gap-x-3 gap-y-2 text-body">
            <dt className="text-muted">Resolution</dt>
            <dd>City-level, daily</dd>
            <dt className="text-muted">Available period</dt>
            <dd>
              {dataset
                ? `${dataset.dateMin} → ${dataset.dateMax} · ${dataset.rows.toLocaleString()} city-days`
                : "Dataset unavailable"}
            </dd>
            <dt className="text-muted">Forecast horizon</dt>
            <dd>Up to seven days</dd>
            <dt className="text-muted">Provider</dt>
            <dd>RiverGuard research dataset</dd>
            <dt className="text-muted">Limitations</dt>
            <dd>No barangay or street-level inference</dd>
          </dl>
          <ActionLink
            href="/admin/data-sources/daily-rainfall?view=research"
            variant="quiet"
            className="mt-4"
          >
            View source metadata
          </ActionLink>
        </Surface>
      </div>
    </>
  );
}

function HistoricalData() {
  const [applied, setApplied] = useState(false);
  const [filters, setFilters] = useState({
    location: "Marikina",
    startDate: "2026-11-05",
    endDate: "2026-11-11",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [readings, setReadings] = useState<
    Array<{
      isoDate: string;
      date: string;
      rainfall: number;
      waterLevel: number;
      rainSource: string;
      qualityStatus: string;
    }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      location: appliedFilters.location,
      limit: "14",
      start: appliedFilters.startDate,
      end: appliedFilters.endDate,
    });
    fetch(`/api/historical?${params.toString()}`)
      .then((response) => {
        if (!response.ok) throw new Error("Historical data unavailable");
        return response.json();
      })
      .then((payload: { readings?: typeof readings }) => {
        if (!cancelled) setReadings(payload.readings ?? []);
      })
      .catch(() => {
        if (!cancelled) setReadings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [appliedFilters]);

  return (
    <>
      <PageHeading
        title="Historical data"
        eyebrow="Evidence explorer"
        description="Filter the available readings without converting missing values into zero."
        actions={
          <ActionLink href="/admin/data-sources?view=research" variant="quiet">
            Review sources
          </ActionLink>
        }
      />
      <Surface className="mb-3" title="Filters">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SelectControl
            id="history-location"
            label="Location"
            value={filters.location}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                location: event.target.value,
              }))
            }
          >
            <option>Marikina</option>
            <option>Quezon City</option>
            <option>Manila</option>
            <option>Pasig</option>
          </SelectControl>
          <TextField
            id="date-from"
            label="From"
            type="date"
            value={filters.startDate}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                startDate: event.target.value,
              }))
            }
          />
          <TextField
            id="date-to"
            label="To"
            type="date"
            value={filters.endDate}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                endDate: event.target.value,
              }))
            }
          />
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            size="small"
            onClick={() => {
              setAppliedFilters(filters);
              setApplied(true);
            }}
          >
            Apply filters
          </Button>
          <Button
            size="small"
            variant="quiet"
            onClick={() => {
              const reset = {
                location: "Marikina",
                startDate: "2026-11-05",
                endDate: "2026-11-11",
              };
              setFilters(reset);
              setAppliedFilters(reset);
              setApplied(false);
            }}
          >
            Reset
          </Button>
        </div>
        {applied ? (
          <p className="text-metadata mt-2 text-success" role="status">
            Filters applied to the selected Dataset v2 location.
          </p>
        ) : null}
      </Surface>
      <ObservedHistoryChart
        eyebrow="Observed records"
        location={appliedFilters.location}
        startDate={appliedFilters.startDate}
        endDate={appliedFilters.endDate}
        limit={14}
      />
      <div className="mt-3">
        <Surface title={`Displayed data · ${appliedFilters.location}`}>
          <DataTable
            columns={[
              { key: "date", label: "Date" },
              { key: "rainfall", label: "Rainfall" },
              { key: "water", label: "Water level" },
            ]}
            rows={readings.map((reading) => ({
              date: reading.isoDate,
              rainfall:
                reading.rainfall === null
                  ? "Missing"
                  : `${reading.rainfall.toFixed(1)} mm`,
              water:
                reading.waterLevel === null
                  ? "Missing"
                  : `${reading.waterLevel.toFixed(2)} m · ${reading.rainSource}`,
            }))}
          />
          <p className="text-metadata mt-2">
            RiverGuard NCR Dataset v2 · values retain their source and quality
            status; water level is a derived proxy where documented.
          </p>
        </Surface>
      </div>
      <div className="mt-3">
        <MonthlyRainfallChart location={appliedFilters.location} />
      </div>
    </>
  );
}

type ForecastHorizonDays = 3 | 7;

function parseForecastHorizon(value: string | null): ForecastHorizonDays {
  return value === "3" ? 3 : 7;
}

function horizonLabel(days: ForecastHorizonDays): string {
  return days === 3 ? "Three days" : "Seven days";
}

function ForecastForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedLocation = locationCodeForName(
    searchParams.get("location") ?? "Marikina",
  );
  const [location, setLocation] = useState(LOCATIONS[requestedLocation].name);
  const [horizonDays, setHorizonDays] = useState<ForecastHorizonDays>(() =>
    parseForecastHorizon(searchParams.get("horizonDays")),
  );
  const [includeExplanation, setIncludeExplanation] = useState(
    searchParams.get("explain") !== "false",
  );
  return (
    <>
      <PageHeading
        title="Run experimental forecast"
        eyebrow="Step 1 of 3"
        description="Choose a supported location and a three- or seven-day model horizon."
      />
      <Surface
        className="mx-auto max-w-4xl"
        title="Forecast inputs"
        description="Required fields are validated before review."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectControl
            id="forecast-location"
            label="Location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          >
            <option>Marikina</option>
            <option>Quezon City</option>
            <option>Manila</option>
            <option>Pasig</option>
          </SelectControl>
          <SelectControl
            id="forecast-horizon"
            label="Horizon"
            value={String(horizonDays)}
            onChange={(event) =>
              setHorizonDays(parseForecastHorizon(event.target.value))
            }
          >
            <option value="3">Three days</option>
            <option value="7">Seven days</option>
          </SelectControl>
          <TextField
            id="issue-period"
            label="Issue date"
            value="Set automatically when the run starts (Asia/Manila)"
            readOnly
          />
          <TextField
            id="weather-provider"
            label="Model input"
            value="Open-Meteo forecast API (30 past days + up to 7 future days)"
            readOnly
          />
          <TextField
            id="model-version"
            label="Model"
            value="Read from ml/artifacts/model.json at run time"
            readOnly
          />
          <TextField
            id="coverage"
            label="Data coverage"
            value="City-level daily grid points, Asia/Manila"
            readOnly
          />
        </div>
        <div className="mt-3">
          <CheckControl
            id="include-explanation"
            label="Include model explanation"
            description="Show the sensitivity sweep and limitations alongside results."
            checked={includeExplanation}
            onChange={(event) => setIncludeExplanation(event.target.checked)}
          />
        </div>
        <Notice title="Review before running" tone="info" className="mt-3">
          Confirm the selected location and horizon. The model input is the
          weather provider&apos;s own window: today&apos;s rain, the antecedent
          3/7/30-day sums and soil moisture. RiverGuard will score the selected
          {` ${horizonLabel(horizonDays).toLowerCase()} `}
          from the provider&apos;s future window.
        </Notice>
        <div className="mt-4 flex justify-end gap-2">
          <ActionLink href="/researcher" variant="quiet">
            Cancel
          </ActionLink>
          <Button
            size="small"
            onClick={() =>
              router.push(
                `/researcher/forecast/review?location=${encodeURIComponent(location)}&horizonDays=${horizonDays}&explain=${includeExplanation}`,
              )
            }
          >
            Review inputs <ArrowRight size={14} />
          </Button>
        </div>
      </Surface>
    </>
  );
}

function ForecastReview() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requested = searchParams.get("location") ?? "Marikina";
  const horizonDays = parseForecastHorizon(searchParams.get("horizonDays"));
  const includeExplanation = searchParams.get("explain") !== "false";
  const locationCode = locationCodeForName(requested);
  const locationName = LOCATIONS[locationCode].name;
  const { dataset } = useDatasetMeta();
  const { model } = useModelArtifacts();

  return (
    <>
      <PageHeading
        title="Review forecast inputs"
        eyebrow="Step 2 of 3"
        description="Confirm the request before spending a weather call and a model run."
      />
      <Surface className="mx-auto max-w-4xl" title="Request summary">
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ["Location", locationName],
            ["Horizon", horizonLabel(horizonDays)],
            ["Issue date", "Set at run time (Asia/Manila)"],
            [
              "Observed state",
              dataset
                ? `${dataset.label} · latest row ${dataset.dateMax}`
                : "Dataset unavailable",
            ],
            [
              "Model",
              model
                ? `${model.name} ${model.version}`
                : "Artifacts unavailable",
            ],
            [
              "Explanation",
              includeExplanation
                ? "Sensitivity sweep included"
                : "Not requested",
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-control bg-canvas-soft p-3">
              <dt className="text-metadata text-muted">{label}</dt>
              <dd className="text-body mt-1 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <Notice
          title="Responsible-use confirmation"
          tone="warning"
          className="mt-4"
        >
          The output will be experimental, city-level, and unsuitable as an
          official warning.
        </Notice>
        <div className="mt-4 flex justify-between gap-2">
          <ActionLink
            href={`/researcher/forecast/new?location=${locationCode}&horizonDays=${horizonDays}&explain=${includeExplanation}`}
            variant="quiet"
          >
            Edit inputs
          </ActionLink>
          <Button
            size="small"
            onClick={() =>
              router.push(
                `/researcher/forecast/progress?location=${locationCode}&horizonDays=${horizonDays}&explain=${includeExplanation}`,
              )
            }
          >
            <Play size={14} /> Run experimental forecast
          </Button>
        </div>
      </Surface>
    </>
  );
}

/**
 * Runs the real pipeline and reports what it is doing.
 *
 * This used to advance a timer through four invented stages and then redirect to
 * `/runs/RG-NCR-041`. It now makes the actual `POST /api/forecast` and shows the
 * returned run in place: there is no stored-run route to redirect to.
 */
function ForecastProgress() {
  const searchParams = useSearchParams();
  const locationCode = locationCodeForName(
    searchParams.get("location") ?? "Marikina",
  );
  const horizonDays = parseForecastHorizon(searchParams.get("horizonDays"));
  const feed = useOutlookFeed(locationCode, horizonDays);
  const started = useRef(false);
  const { run } = feed;

  const stages = [
    "Fetching the weather window",
    `Scoring ${horizonDays} days`,
    "Storing the run",
  ];

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  const snapshot = feed.snapshot;
  const stageIndex = snapshot ? stages.length - 1 : feed.isRunning ? 1 : 0;
  // The seven day chips are the panel's only control: clicking one shows that
  // day's probability, level and reasons. It used to be wired to a no-op, so
  // the chips looked interactive and did nothing.
  const [selectedDay, setSelectedDay] = useState(0);
  // Where the run actually went, from the response — not inferred from
  // `source`, which is "live" for every run this tab just performed.
  const storageLine = snapshot
    ? describePersistence(snapshot.persistence, {
        restored: snapshot.source === "convex",
      })
    : null;

  return (
    <>
      <PageHeading
        title={
          feed.error
            ? "Forecast failed"
            : snapshot
              ? "Forecast complete"
              : "Forecast in progress"
        }
        eyebrow="Step 3 of 3"
        description={
          feed.error
            ? "The pipeline stopped before it produced an outlook."
            : snapshot
              ? `${horizonDays} days scored. Pick a day below to read its numbers.`
              : "Running the weather → model → storage pipeline."
        }
        actions={
          <ActionLink href="/researcher/runs" variant="quiet">
            Run history
          </ActionLink>
        }
      />
      <Surface
        className="mx-auto max-w-4xl"
        title={
          feed.error
            ? "Run failed"
            : snapshot
              ? "Run complete"
              : (stages[stageIndex] ?? "Starting")
        }
        description={`${LOCATIONS[locationCode].name} · ${horizonLabel(horizonDays).toLowerCase()} horizon`}
      >
        <Stepper steps={stages} current={stageIndex} />

        {feed.error ? (
          <div className="mt-4" role="alert">
            <Notice title="The run did not complete" tone="danger">
              {feed.error}
            </Notice>
            {feed.errorDetail ? (
              <p className="text-metadata mt-2 text-muted">
                {feed.errorDetail}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="small" onClick={() => void run()}>
                <ArrowClockwise size={14} /> Try again
              </Button>
              <ActionLink
                href={`/researcher/forecast/new?location=${locationCode}&horizonDays=${horizonDays}`}
                variant="quiet"
              >
                Edit inputs
              </ActionLink>
            </div>
          </div>
        ) : null}

        {snapshot ? (
          <div className="mt-4 grid gap-2">
            <dl className="grid gap-2 sm:grid-cols-2">
              {[
                ["Model", snapshot.modelVersion ?? "unknown"],
                ["Weather provider", snapshot.provider],
                [
                  "Model input",
                  snapshot.observed
                    ? `${snapshot.provider} through ${snapshot.observed.asOfDate}`
                    : "unknown",
                ],
                [
                  "Outcome",
                  snapshot.degraded ? "Degraded weather inputs" : "Completed",
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-control bg-canvas-soft p-3">
                  <dt className="text-metadata text-muted">{label}</dt>
                  <dd className="text-body mt-1 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {snapshot.warnings.length ? (
              <ul className="grid gap-1 rounded-control border border-line px-3 py-2">
                {snapshot.warnings.map((warning) => (
                  <li key={warning} className="text-metadata text-warning">
                    · {warning}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-2">
              <RiskSummary
                selectedDay={selectedDay}
                onDayChange={setSelectedDay}
                locationCode={locationCode}
                days={snapshot.days}
                source={snapshot.source}
                note={
                  snapshot.observed
                    ? `Model input: ${snapshot.provider}, rain through ${snapshot.observed.asOfDate}`
                    : undefined
                }
                degraded={snapshot.degraded}
              />
            </div>
            {storageLine ? (
              <p
                className={`text-metadata ${
                  storageLine.tone === "warning" ? "text-warning" : "text-muted"
                }`}
              >
                {storageLine.text}
              </p>
            ) : null}
          </div>
        ) : feed.isRunning ? (
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full w-1/2 animate-pulse bg-brand-secondary" />
          </div>
        ) : null}
      </Surface>
    </>
  );
}

/* ------------------------------------------------------- stored run views */

/**
 * Run history, run detail and run comparison.
 *
 * Two stores, one set of screens: Convex when `NEXT_PUBLIC_CONVEX_URL` is set,
 * the local `.data/runs.json` fallback otherwise. Only the small wrappers switch
 * on storage; the table, the detail record and the diff are shared, so the two
 * paths cannot drift apart.
 */

function RunHistoryTable({ runs }: { runs: StoredRunSummary[] }) {
  const rows: Array<Record<string, string>> = runHistoryRows(runs);
  return (
    <DataTable
      columns={[
        { key: "run", label: "Run ID" },
        { key: "created", label: "Created" },
        { key: "location", label: "Location" },
        { key: "model", label: "Model" },
        { key: "status", label: "Status" },
        { key: "warning", label: "Elevated" },
      ]}
      rows={rows}
      actions={(row) => (
        <ActionLink href={`/researcher/runs/${row.run}`} variant="quiet">
          Inspect
        </ActionLink>
      )}
    />
  );
}

function RunHistorySurface({
  description,
  runs,
}: {
  description: string;
  runs: StoredRunSummary[];
}) {
  const [location, setLocation] = useState("all");
  const [status, setStatus] = useState("all");

  const locations = Array.from(
    new Set(runs.flatMap((run) => run.locations)),
  ).sort();
  const filtered = runs.filter(
    (run) =>
      (location === "all" || run.locations.includes(location)) &&
      (status === "all" || run.status === status),
  );

  return (
    <>
      <Surface
        className="mb-3"
        title="Filters"
        description={`${filtered.length} of ${runs.length} stored run(s) shown`}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SelectControl
            id="run-location"
            label="Location"
            onChange={(event) => setLocation(event.target.value)}
            value={location}
          >
            <option value="all">All supported locations</option>
            {locations.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </SelectControl>
          <SelectControl
            id="run-status"
            label="Status"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="requested">Requested</option>
          </SelectControl>
        </div>
      </Surface>
      <Surface title="Run history" description={description}>
        {runs.length === 0 ? (
          <p className="text-body text-muted">
            No runs stored yet — run a forecast to create one.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-body text-muted">No runs match these filters.</p>
        ) : (
          <RunHistoryTable runs={filtered} />
        )}
      </Surface>
    </>
  );
}

function ConvexRunHistory() {
  const { data: runs, error } = useConvexQueryResult(
    convexFunctions.recentRuns,
    { limit: 25 },
  );

  if (error) {
    return (
      <Surface title="Run history" description="The deployment did not answer">
        <p className="text-body text-muted">{convexErrorHint(error)}</p>
      </Surface>
    );
  }
  if (runs === undefined) {
    return (
      <Surface title="Run history" description="Loading stored runs…">
        <p className="text-body text-muted">Reading the deployment…</p>
      </Surface>
    );
  }

  return (
    <RunHistorySurface
      description={`Read from the Convex deployment · ${runs.length} stored run(s)`}
      runs={runs.map(summaryFromConvexRun)}
    />
  );
}

function LocalRunHistory() {
  const { data: runs, error } = useLocalRuns(25);

  if (error) {
    return (
      <Surface
        title="Run history"
        description="The local store could not be read"
      >
        <p className="text-body text-muted">{error.message}</p>
      </Surface>
    );
  }
  if (runs === undefined) {
    return (
      <Surface title="Run history" description="Loading stored runs…">
        <p className="text-body text-muted">Reading this machine’s store…</p>
      </Surface>
    );
  }

  return (
    <RunHistorySurface
      description={`Read from this machine (.data/runs.json) · ${runs.length} stored run(s)`}
      runs={runs}
    />
  );
}

function RunHistory() {
  return (
    <>
      <PageHeading
        title="Forecast runs"
        eyebrow="Research history"
        description="Filter, inspect, and compare forecast runs without hiding partial or failed results."
        actions={
          <ActionLink href="/researcher/compare" variant="secondary">
            Compare two runs
          </ActionLink>
        }
      />
      {convexConfigured ? <ConvexRunHistory /> : <LocalRunHistory />}
    </>
  );
}

/**
 * A run URL that does not resolve to a stored run.
 *
 * These routes used to render a fixed "RG-NCR-041 · Complete" narrative for any
 * id in the path, so every link looked like a real run. Now an id only renders
 * if it came from storage.
 */
function RunDetailNotFound({ runId }: { runId: string }) {
  return (
    <>
      <PageHeading
        title="Run not found"
        eyebrow="Forecast runs"
        description="This workspace has no stored run with that identifier."
      />
      <EmptyPanel
        title={`No run “${runId}”`}
        description="A run exists only after someone presses Run forecast. It is read from the Convex deployment when one is configured, and from this machine’s .data/runs.json otherwise."
        actionHref="/researcher/runs"
        actionLabel="Back to run history"
      />
    </>
  );
}

function RunReading({ runId }: { runId: string }) {
  return (
    <Surface title="Reading run" description={runId}>
      <p className="text-body text-muted">Loading the stored run…</p>
    </Surface>
  );
}

function RunUnreadable({ runId, reason }: { runId: string; reason: string }) {
  return (
    <>
      <PageHeading
        title="Run could not be read"
        eyebrow="Forecast runs"
        description={`Run ${runId}`}
        actions={
          <ActionLink href="/researcher/runs" variant="quiet">
            Back to run history
          </ActionLink>
        }
      />
      <Notice title="Storage problem" tone="danger">
        {reason}
      </Notice>
    </>
  );
}

function RunDetailView({ run }: { run: StoredRun }) {
  const dayRows: Array<Record<string, string>> = run.dayRows.map((day) => ({
    date: day.date,
    horizon: `+${day.horizonDays}d`,
    rain: `${day.rainfallMm.toFixed(1)} mm`,
    probability: formatProbability(day.probability),
    waterLevel: formatMetres(day.waterLevelM),
    risk: day.riskLevel,
    alert: day.alertLevel,
    threshold: day.exceedsOperatingThreshold ? "above" : "below",
  }));

  return (
    <>
      <PageHeading
        title={`Run ${run.runId}`}
        eyebrow="Forecast runs"
        description={`Stored in the ${RUN_SOURCE_LABEL[run.source]}. Every number below is what the model wrote, including its caveats.`}
        actions={
          <ActionLink href="/researcher/runs" variant="quiet">
            Back to run history
          </ActionLink>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Location"
          value={run.locations.join(", ") || "—"}
          detail="City-level coverage"
        />
        <Metric
          label="Issue date"
          value={run.issueDate}
          detail="Last day of the provider window"
        />
        <Metric
          label="Days stored"
          value={String(run.days)}
          detail={`Model ${run.modelVersion ?? "unknown"}`}
        />
        <Metric
          label="Elevated days"
          value={String(run.alerts)}
          detail="Risk level elevated"
          tone={run.alerts > 0 ? "warning" : "neutral"}
        />
      </div>

      <Surface className="mt-3" title="Run record">
        <dl className="text-body grid gap-2 sm:grid-cols-[170px_1fr]">
          <dt className="text-muted">Run id</dt>
          <dd className="break-all">{run.runId}</dd>
          <dt className="text-muted">Stored in</dt>
          <dd>{RUN_SOURCE_LABEL[run.source]}</dd>
          <dt className="text-muted">Requested</dt>
          <dd>{formatRunTime(run.requestedAt)}</dd>
          <dt className="text-muted">Completed</dt>
          <dd>{formatRunTime(run.completedAt)}</dd>
          <dt className="text-muted">Weather provider</dt>
          <dd>
            {run.provider}
            {run.providerDegraded
              ? " — degraded: the labelled offline fixture, not a forecast"
              : ""}
          </dd>
          <dt className="text-muted">Provider data retrieved</dt>
          <dd>{formatRunTime(run.retrievedAt)}</dd>
          <dt className="text-muted">Model</dt>
          <dd>
            {run.modelVersion ?? "unknown"}
            {run.modelKind ? ` · ${run.modelKind}` : ""}
          </dd>
          <dt className="text-muted">Operating threshold</dt>
          <dd>
            {run.operatingThreshold > 0
              ? run.operatingThreshold.toFixed(4)
              : "not stored"}
          </dd>
          <dt className="text-muted">Feature schema</dt>
          <dd>{run.featureSchemaVersion}</dd>
        </dl>
      </Surface>

      <Surface
        className="mt-3"
        title="Stored output"
        description="Every day the run wrote, with its risk level and alarm crossing."
      >
        {dayRows.length === 0 ? (
          <p className="text-body text-muted">
            This run stored no forecast days.
          </p>
        ) : (
          <DataTable
            columns={[
              { key: "date", label: "Date" },
              { key: "horizon", label: "Horizon" },
              { key: "rain", label: "Rain" },
              { key: "probability", label: "Probability" },
              { key: "waterLevel", label: "Water level" },
              { key: "risk", label: "Risk" },
              { key: "alert", label: "Alarm" },
              { key: "threshold", label: "Threshold" },
            ]}
            rows={dayRows}
          />
        )}
      </Surface>

      <Surface
        className="mt-3"
        title="Why the model said this"
        description="The reason lines stored with each day."
      >
        {run.dayRows.length === 0 ? (
          <p className="text-body text-muted">No reason lines were stored.</p>
        ) : (
          <ul className="grid gap-2">
            {run.dayRows.map((day) => (
              <li key={day.date} className="text-body">
                <span className="font-semibold">{day.date}</span>
                <span className="text-muted">
                  {" — "}
                  {day.reasons.length
                    ? day.reasons.join(" ")
                    : "No reasons stored."}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      {run.warning ? (
        <Notice className="mt-3" title="Model caveat" tone="warning">
          {run.warning}
        </Notice>
      ) : null}
    </>
  );
}

function ConvexRunDetail({ runId }: { runId: string }) {
  const { data, error } = useConvexQueryResult(convexFunctions.getRun, {
    runId,
  });

  if (error) {
    return <RunUnreadable reason={convexErrorHint(error)} runId={runId} />;
  }
  if (data === undefined) return <RunReading runId={runId} />;
  if (data === null) return <RunDetailNotFound runId={runId} />;
  return <RunDetailView run={detailFromConvexRun(data)} />;
}

function LocalRunDetail({ runId }: { runId: string }) {
  const { data, error } = useLocalRun(runId);

  if (error) return <RunUnreadable reason={error.message} runId={runId} />;
  if (data === undefined) return <RunReading runId={runId} />;
  if (data === null) return <RunDetailNotFound runId={runId} />;
  return <RunDetailView run={data} />;
}

function RunDetail({ runId }: { runId: string }) {
  return convexConfigured ? (
    <ConvexRunDetail runId={runId} />
  ) : (
    <LocalRunDetail runId={runId} />
  );
}

function runOptionLabel(run: StoredRunSummary): string {
  return `${run.runId} · ${formatRunTime(run.requestedAt)} · ${run.locations.join(", ") || "no location"}`;
}

function ComparePickers({
  a,
  b,
  runs,
}: {
  a: string;
  b: string;
  runs: StoredRunSummary[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function choose(key: "a" | "b", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set(key, value);
    router.replace(`/researcher/compare?${next.toString()}`);
  }

  return (
    <Surface
      className="mb-3"
      title="Runs to compare"
      description="Pick two stored runs. The choice is kept in the URL, so a comparison can be linked or bookmarked."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectControl
          id="compare-a"
          label="Run A"
          onChange={(event) => choose("a", event.target.value)}
          value={a}
        >
          {runs.map((run) => (
            <option key={run.runId} value={run.runId}>
              {runOptionLabel(run)}
            </option>
          ))}
        </SelectControl>
        <SelectControl
          id="compare-b"
          label="Run B"
          onChange={(event) => choose("b", event.target.value)}
          value={b}
        >
          {runs.map((run) => (
            <option key={run.runId} value={run.runId}>
              {runOptionLabel(run)}
            </option>
          ))}
        </SelectControl>
      </div>
    </Surface>
  );
}

function CompareTable({ runA, runB }: { runA: StoredRun; runB: StoredRun }) {
  const byDate = new Map<
    string,
    { a?: StoredRun["dayRows"][number]; b?: StoredRun["dayRows"][number] }
  >();
  for (const day of runA.dayRows) {
    byDate.set(day.date, { ...(byDate.get(day.date) ?? {}), a: day });
  }
  for (const day of runB.dayRows) {
    byDate.set(day.date, { ...(byDate.get(day.date) ?? {}), b: day });
  }

  const rows: Array<Record<string, string>> = [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, pair]) => {
      const dProbability =
        pair.a && pair.b
          ? `${((pair.b.probability - pair.a.probability) * 100).toFixed(1)} pp`
          : "—";
      const dLevel =
        pair.a && pair.b
          ? `${(pair.b.waterLevelM - pair.a.waterLevelM).toFixed(2)} m`
          : "—";
      return {
        date,
        probabilityA: pair.a ? formatProbability(pair.a.probability) : "—",
        probabilityB: pair.b ? formatProbability(pair.b.probability) : "—",
        dProbability,
        levelA: pair.a ? formatMetres(pair.a.waterLevelM) : "—",
        levelB: pair.b ? formatMetres(pair.b.waterLevelM) : "—",
        dLevel,
        risk: `${pair.a?.riskLevel ?? "—"} → ${pair.b?.riskLevel ?? "—"}`,
      };
    });

  const metadata: Array<[string, string, string]> = [
    ["Run id", runA.runId, runB.runId],
    ["Stored in", RUN_SOURCE_LABEL[runA.source], RUN_SOURCE_LABEL[runB.source]],
    ["Location", runA.locations.join(", "), runB.locations.join(", ")],
    ["Issue date", runA.issueDate, runB.issueDate],
    [
      "Provider",
      `${runA.provider}${runA.providerDegraded ? " (degraded)" : ""}`,
      `${runB.provider}${runB.providerDegraded ? " (degraded)" : ""}`,
    ],
    ["Model", runA.modelVersion ?? "unknown", runB.modelVersion ?? "unknown"],
    [
      "Operating threshold",
      runA.operatingThreshold > 0 ? runA.operatingThreshold.toFixed(4) : "—",
      runB.operatingThreshold > 0 ? runB.operatingThreshold.toFixed(4) : "—",
    ],
    ["Days stored", String(runA.days), String(runB.days)],
    ["Elevated days", String(runA.alerts), String(runB.alerts)],
  ];

  const comparable =
    runA.provider === runB.provider &&
    runA.modelVersion === runB.modelVersion &&
    !runA.providerDegraded &&
    !runB.providerDegraded;

  return (
    <>
      {comparable ? null : (
        <Notice title="These runs are not like-for-like" tone="warning">
          The two runs differ in provider, model version, or input quality, so
          part of every difference below is that change rather than the
          forecast. The table is still the stored record — it is not a model
          comparison.
        </Notice>
      )}
      <Surface
        className="mt-3"
        title="Run records"
        description="A is the left column, B the right."
      >
        <DataTable
          columns={[
            { key: "field", label: "Field" },
            { key: "a", label: "Run A" },
            { key: "b", label: "Run B" },
          ]}
          rows={metadata.map(([field, a, b]) => ({ field, a, b }))}
        />
      </Surface>
      <Surface
        className="mt-3"
        title="Day by day"
        description="Differences are B minus A. A date stored by only one run shows dashes for the other."
      >
        {rows.length === 0 ? (
          <p className="text-body text-muted">Neither run stored any days.</p>
        ) : (
          <DataTable
            columns={[
              { key: "date", label: "Date" },
              { key: "probabilityA", label: "A probability" },
              { key: "probabilityB", label: "B probability" },
              { key: "dProbability", label: "Δ probability" },
              { key: "levelA", label: "A level" },
              { key: "levelB", label: "B level" },
              { key: "dLevel", label: "Δ level" },
              { key: "risk", label: "Risk A → B" },
            ]}
            rows={rows}
          />
        )}
      </Surface>
      <p className="text-metadata mt-3 text-muted">
        Both runs are read from {RUN_SOURCE_LABEL[runA.source]}. Nothing on this
        page is recomputed or interpolated: a date the model did not store stays
        blank.
      </p>
    </>
  );
}

function ConvexCompareDiff({ a, b }: { a: string; b: string }) {
  const runA = useConvexQueryResult(convexFunctions.getRun, { runId: a });
  const runB = useConvexQueryResult(convexFunctions.getRun, { runId: b });

  if (runA.error || runB.error) {
    return (
      <Notice title="A run could not be read" tone="danger">
        {convexErrorHint((runA.error ?? runB.error) as Error)}
      </Notice>
    );
  }
  if (runA.data === undefined || runB.data === undefined) {
    return (
      <Surface title="Reading runs" description="Loading both stored runs…">
        <p className="text-body text-muted">Fetching from the deployment…</p>
      </Surface>
    );
  }
  if (runA.data === null || runB.data === null) {
    return (
      <Notice title="A run is missing" tone="warning">
        One of the selected runs is no longer stored in the deployment. Pick
        another pair.
      </Notice>
    );
  }

  return (
    <CompareTable
      runA={detailFromConvexRun(runA.data)}
      runB={detailFromConvexRun(runB.data)}
    />
  );
}

function LocalCompareDiff({ a, b }: { a: string; b: string }) {
  const runA = useLocalRun(a);
  const runB = useLocalRun(b);

  if (runA.error || runB.error) {
    return (
      <Notice title="A run could not be read" tone="danger">
        {(runA.error ?? runB.error)?.message ?? "unknown error"}
      </Notice>
    );
  }
  if (runA.data === undefined || runB.data === undefined) {
    return (
      <Surface title="Reading runs" description="Loading both stored runs…">
        <p className="text-body text-muted">Reading this machine’s store…</p>
      </Surface>
    );
  }
  if (runA.data === null || runB.data === null) {
    return (
      <Notice title="A run is missing" tone="warning">
        One of the selected runs is no longer in .data/runs.json. Pick another
        pair.
      </Notice>
    );
  }

  return <CompareTable runA={runA.data} runB={runB.data} />;
}

function CompareContent({
  a,
  b,
  runs,
}: {
  a: string;
  b: string;
  runs: StoredRunSummary[];
}) {
  if (runs.length < 2) {
    return (
      <>
        <PageHeading
          title="Compare forecast runs"
          eyebrow="Model comparison"
          description="Side-by-side comparison of stored runs."
          actions={
            <ActionLink href="/researcher/forecast/new">
              <Plus size={14} /> New forecast
            </ActionLink>
          }
        />
        <EmptyPanel
          title="Nothing to compare"
          description={`Comparison needs at least two stored runs; this store has ${runs.length}. This page previously showed two invented runs and called the difference a model comparison.`}
          actionHref="/researcher/runs"
          actionLabel="Back to run history"
        />
      </>
    );
  }

  const newest = runs[0];
  const older = runs[1];
  const selectedA = runs.some((run) => run.runId === a) ? a : older.runId;
  const selectedB = runs.some(
    (run) => run.runId === b && run.runId !== selectedA,
  )
    ? b
    : newest.runId === selectedA
      ? older.runId
      : newest.runId;

  return (
    <>
      <PageHeading
        title="Compare forecast runs"
        eyebrow="Model comparison"
        description="Two stored runs side by side, exactly as the model wrote them."
        actions={
          <ActionLink href="/researcher/runs" variant="quiet">
            Run history
          </ActionLink>
        }
      />
      <ComparePickers a={selectedA} b={selectedB} runs={runs} />
      {selectedA === selectedB ? (
        <Notice title="Pick two different runs" tone="warning">
          Both selects point at the same run, so there is nothing to compare.
        </Notice>
      ) : convexConfigured ? (
        <ConvexCompareDiff a={selectedA} b={selectedB} />
      ) : (
        <LocalCompareDiff a={selectedA} b={selectedB} />
      )}
    </>
  );
}

function ConvexCompare() {
  const searchParams = useSearchParams();
  const { data: runs, error } = useConvexQueryResult(
    convexFunctions.recentRuns,
    { limit: 25 },
  );

  if (error) {
    return (
      <Surface
        title="Comparison unavailable"
        description="The deployment did not answer"
      >
        <p className="text-body text-muted">{convexErrorHint(error)}</p>
      </Surface>
    );
  }
  if (runs === undefined) {
    return (
      <Surface title="Comparison" description="Loading stored runs…">
        <p className="text-body text-muted">Reading the deployment…</p>
      </Surface>
    );
  }

  return (
    <CompareContent
      a={searchParams.get("a") ?? ""}
      b={searchParams.get("b") ?? ""}
      runs={runs.map(summaryFromConvexRun)}
    />
  );
}

function LocalCompare() {
  const searchParams = useSearchParams();
  const { data: runs, error } = useLocalRuns(25);

  if (error) {
    return (
      <Surface
        title="Comparison unavailable"
        description="The local store could not be read"
      >
        <p className="text-body text-muted">{error.message}</p>
      </Surface>
    );
  }
  if (runs === undefined) {
    return (
      <Surface title="Comparison" description="Loading stored runs…">
        <p className="text-body text-muted">Reading this machine’s store…</p>
      </Surface>
    );
  }

  return (
    <CompareContent
      a={searchParams.get("a") ?? ""}
      b={searchParams.get("b") ?? ""}
      runs={runs}
    />
  );
}

function CompareRuns() {
  return convexConfigured ? <ConvexCompare /> : <LocalCompare />;
}

export function DataSourceCatalog({
  detail,
  embedded = false,
  basePath = "/admin/data-sources",
}: {
  detail?: string;
  embedded?: boolean;
  basePath?: string;
}) {
  return (
    <DataSourceCatalogInner
      detail={detail}
      embedded={embedded}
      basePath={basePath}
    />
  );
}

function DataSourceCatalogInner({
  detail,
  embedded = false,
  basePath = "/admin/data-sources",
}: {
  detail?: string;
  embedded?: boolean;
  basePath?: string;
}) {
  const { dataset } = useDatasetMeta();
  if (detail === "new") return <DataSourceForm basePath={basePath} />;
  if (detail) return <DataSourceDetail basePath={basePath} />;
  const catalog = (
    <Surface
      title="Source catalogue"
      action={
        <ActionLink href={`${basePath}/new?view=research`}>
          <Plus size={14} /> Add metadata
        </ActionLink>
      }
    >
      <DataTable
        columns={[
          { key: "name", label: "Source" },
          { key: "provider", label: "Provider" },
          { key: "role", label: "Used for" },
          { key: "coverage", label: "Coverage" },
          { key: "status", label: "Provenance status" },
        ]}
        rows={dataSourceRows(dataset).map((source) => ({ ...source }))}
        actions={(row) => (
          <ActionLink
            href={`${basePath}/${dataSourceRows(dataset).find((source) => source.name === row.name)?.id ?? "daily-rainfall"}?view=research`}
            variant="quiet"
          >
            View
          </ActionLink>
        )}
      />
    </Surface>
  );

  if (embedded) return catalog;
  return (
    <>
      <PageHeading
        title="Data sources"
        eyebrow="Catalogue and provenance"
        description="Review coverage, licensing, resolution, quality, and limitations before using any source."
      />
      {catalog}
    </>
  );
}

function DataSourceDetail({
  basePath = "/admin/data-sources",
}: {
  basePath?: string;
}) {
  const { dataset } = useDatasetMeta();
  return (
    <>
      <PageHeading
        title="NCR daily observations (dataset v2)"
        eyebrow="Data-source metadata"
        description="The research dataset the model is trained on and the historical charts read. It is not read when a forecast runs."
        actions={
          <>
            <ActionLink
              href={`${basePath}/new?view=research`}
              variant="secondary"
            >
              Edit metadata
            </ActionLink>
            <ActionLink href={`${basePath}?view=research`} variant="quiet">
              Back
            </ActionLink>
          </>
        }
      />
      <Notice title="Unverified source" tone="warning">
        Do not cite or interpret this fixture as a measured operational dataset.
      </Notice>
      <Surface className="mt-3" title="Metadata">
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ["Provider", "RiverGuard research dataset"],
            ["Role", "Model training data + historical charts"],
            [
              "Runtime input",
              "No — each forecast is scored from the weather provider, never from these rows",
            ],
            [
              "Consumed by",
              "Model training · GET /api/historical · GET /api/dataset",
            ],
            ["Type", "Daily observations (dataset v2)"],
            ["Geography", "Quezon City, Marikina, Manila, Pasig"],
            [
              "Time coverage",
              dataset
                ? `${dataset.dateMin} → ${dataset.dateMax}`
                : "Unavailable",
            ],
            ["Resolution", "City-level, daily"],
            ["Units", "Millimetres (rain), metres (water level)"],
            ["License", "Not established"],
            [
              "Real rain segment (dataset)",
              dataset?.realRainFrom
                ? `ERA5 reanalysis from ${dataset.realRainFrom}; synthetic before that. These are training rows and chart history, never a forecast input.`
                : "Not reported",
            ],
            ["Provenance status", "Research use only"],
            ["Local reference", "data/daily_observations.csv"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-control bg-canvas-soft p-3">
              <dt className="text-metadata text-muted">{label}</dt>
              <dd className="text-body mt-1">{value}</dd>
            </div>
          ))}
        </dl>
      </Surface>
    </>
  );
}

function DataSourceForm({
  basePath = "/admin/data-sources",
}: {
  basePath?: string;
}) {
  const [saved] = useState(false);
  return (
    <>
      <PageHeading
        title="Data-source metadata"
        eyebrow="Catalogue form"
        description="Record provenance and limitations before a source becomes available to the application."
      />
      <Surface className="mx-auto max-w-5xl" title="Source details">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            id="source-name"
            label="Source name"
            defaultValue="NCR daily rainfall sample"
          />
          <TextField
            id="source-provider"
            label="Provider"
            defaultValue="RiverGuard research dataset"
          />
          <SelectControl id="source-type" label="Type">
            <option>Observation</option>
            <option>Forecast</option>
            <option>Geographic layer</option>
          </SelectControl>
          <TextField
            id="source-reference"
            label="Source URL or reference"
            placeholder="Documented source reference"
          />
          <TextField
            id="source-license"
            label="License"
            placeholder="Required before operational use"
          />
          <TextField
            id="source-coverage"
            label="Coverage"
            defaultValue="Four supported NCR cities"
          />
          <TextField
            id="source-resolution"
            label="Resolution"
            defaultValue="City-level daily"
          />
          <TextField id="source-units" label="Units" defaultValue="mm" />
          <TextAreaField
            id="source-limitations"
            label="Limitations"
            defaultValue="Unverified research dataset; validate before operational use."
            className="sm:col-span-2"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <ActionLink href={`${basePath}?view=research`} variant="quiet">
            Cancel
          </ActionLink>
          <Button
            size="small"
            disabled
            title="Source metadata editing requires a Convex-backed workspace"
          >
            <FloppyDisk size={14} /> Editing unavailable
          </Button>
        </div>
        {saved ? (
          <p
            className="text-metadata mt-2 text-right text-success"
            role="status"
          >
            Metadata saved.
          </p>
        ) : null}
      </Surface>
    </>
  );
}

export function Models({
  detail,
  basePath = "/admin/models",
}: {
  detail?: string;
  basePath?: string;
}) {
  return <ModelsInner detail={detail} basePath={basePath} />;
}

function ModelsInner({
  detail,
  basePath = "/admin/models",
}: {
  detail?: string;
  basePath?: string;
}) {
  const artifacts = useModelArtifacts();
  const dataset = useDatasetMeta();
  const researcherView = basePath.startsWith("/researcher");
  const modelRows = modelVersionRows(artifacts.model, artifacts.metrics);
  const primaryModel = modelRows[0];
  if (detail) return <ModelDetail basePath={basePath} />;
  return (
    <>
      <PageHeading
        title={researcherView ? "Model & data" : "Models and evaluation"}
        eyebrow={
          researcherView ? "Research reference" : "Experimental methodology"
        }
        description={
          researcherView
            ? "Read how RiverGuard turns weather data into a city-level flood-risk outlook."
            : "Review responsibility, supported coverage, evaluation status, and readiness before selecting a model."
        }
      />
      {artifacts.loading ? (
        <p className="text-body text-muted">Reading model artifacts…</p>
      ) : artifacts.error ? (
        <Notice title="Model artifacts unavailable" tone="warning">
          {artifacts.error}
        </Notice>
      ) : researcherView && primaryModel ? (
        <div className="grid items-stretch gap-3 lg:grid-cols-2">
          <Surface
            className="flex h-full flex-col"
            title="Model reference"
            description="The active model, its operating thresholds, and the limitation that governs interpretation."
            action={
              primaryModel ? (
                <ActionLink
                  href={`${basePath}/${primaryModel.id}?view=research`}
                  variant="quiet"
                >
                  View model card
                </ActionLink>
              ) : null
            }
          >
            <div className="flex flex-1 flex-col divide-y divide-line">
              {modelRows.map((model, index) => (
                <section
                  key={model.id}
                  className={`flex flex-1 flex-col justify-center ${
                    index === 0 ? "pb-4" : "py-4"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-body font-semibold">{model.name}</h3>
                      <p className="text-metadata mt-1 text-muted">
                        {model.responsibility}
                      </p>
                    </div>
                    <StatusBadge
                      tone={
                        model.status === "Experimental"
                          ? "info"
                          : model.status === "Research use only"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {model.status}
                    </StatusBadge>
                  </div>
                  <dl className="mt-3 text-body">
                    <dt className="text-metadata text-muted">Validation</dt>
                    <dd className="mt-0.5">{model.validation}</dd>
                  </dl>
                </section>
              ))}
            </div>
          </Surface>

          <div className="grid h-full gap-3 lg:grid-rows-2">
            <Surface
              className="h-full"
              title="Dataset provenance"
              description="The training and historical dataset is separate from live forecast input."
            >
              {dataset.loading ? (
                <p className="text-body text-muted">
                  Reading dataset metadata…
                </p>
              ) : dataset.error || !dataset.dataset ? (
                <Notice title="Dataset metadata unavailable" tone="warning">
                  {dataset.error ?? "The dataset metadata could not be read."}
                </Notice>
              ) : (
                <dl className="grid gap-3 text-body sm:grid-cols-2">
                  <div>
                    <dt className="text-metadata text-muted">Dataset</dt>
                    <dd>{dataset.dataset.label}</dd>
                  </div>
                  <div>
                    <dt className="text-metadata text-muted">Rows</dt>
                    <dd>{dataset.dataset.rows.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-metadata text-muted">Coverage</dt>
                    <dd>
                      {dataset.dataset.dateMin} → {dataset.dataset.dateMax}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-metadata text-muted">Resolution</dt>
                    <dd>City-level daily</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-metadata text-muted">
                      Runtime distinction
                    </dt>
                    <dd className="text-muted">
                      This dataset supports training and historical charts. A
                      live forecast uses the weather provider&apos;s current
                      window instead.
                    </dd>
                  </div>
                </dl>
              )}
            </Surface>

            <Surface
              className="h-full"
              title="How a forecast is produced"
              description="Four traceable stages turn weather inputs into a stored research outlook."
            >
              <ol className="grid gap-2 text-body sm:grid-cols-2">
                {[
                  [
                    "01",
                    "Weather window",
                    "Open-Meteo supplies current, antecedent, and future rainfall values.",
                  ],
                  [
                    "02",
                    "Feature calculation",
                    "RiverGuard derives rainfall totals, soil moisture, temperature, month, and elevation.",
                  ],
                  [
                    "03",
                    "Model scoring",
                    "The classifier and regressor estimate probability and a water-level proxy.",
                  ],
                  [
                    "04",
                    "Research outlook",
                    "The result is stored with provider, model version, quality status, and limitations.",
                  ],
                ].map(([step, title, description]) => (
                  <li
                    key={step}
                    className="flex gap-3 rounded-control bg-canvas-soft p-3"
                  >
                    <span className="text-metadata font-semibold text-accent">
                      {step}
                    </span>
                    <span>
                      <strong className="font-medium">{title}</strong>
                      <span className="mt-0.5 block text-muted">
                        {description}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Surface>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modelRows.map((model) => (
            <Surface
              key={model.id}
              className="flex h-full flex-col"
              title={model.name}
              description={model.responsibility}
              action={
                <ActionLink
                  href={`${basePath}/${model.id}?view=research`}
                  variant="quiet"
                >
                  View model card
                </ActionLink>
              }
            >
              <dl className="text-body grid gap-2">
                <div>
                  <dt className="text-metadata text-muted">Validation</dt>
                  <dd>{model.validation}</dd>
                </div>
                <div>
                  <dt className="text-metadata text-muted">Status</dt>
                  <dd>
                    <StatusBadge
                      tone={
                        model.status === "Experimental"
                          ? "info"
                          : model.status === "Research use only"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {model.status}
                    </StatusBadge>
                  </dd>
                </div>
              </dl>
            </Surface>
          ))}
        </div>
      )}
    </>
  );
}

function ModelDetail({ basePath = "/admin/models" }: { basePath?: string }) {
  const { model, metrics, loading, error } = useModelArtifacts();

  if (loading) {
    return <p className="text-body text-muted">Reading model artifacts…</p>;
  }
  if (error || !model) {
    return (
      <Notice title="Model artifacts unavailable" tone="warning">
        {error ??
          "ml/artifacts/model.json is missing. Train the model to write it."}
      </Notice>
    );
  }

  return (
    <>
      <PageHeading
        title={`${model.name} ${model.version}`}
        eyebrow="Experimental model card"
        description="Model responsibility, feature contract, evaluation status, and known limitations."
        actions={
          <ActionLink href={`${basePath}?view=research`} variant="quiet">
            Back to models
          </ActionLink>
        }
      />
      <Notice title="Experimental status" tone="warning">
        {metrics?.caveat || model.warning}
      </Notice>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Surface title="Responsibility">
          <dl className="text-body grid grid-cols-[125px_1fr] gap-2">
            <dt className="text-muted">Target</dt>
            <dd>{model.target}</dd>
            <dt className="text-muted">Model</dt>
            <dd>{model.kind}</dd>
            <dt className="text-muted">Cities</dt>
            <dd>{model.cities.map((city) => city.name).join(", ")}</dd>
            <dt className="text-muted">Inputs</dt>
            <dd>
              Forecast rain, observed antecedent rain (3/7/30 d), soil moisture,
              temperature, month, elevation
            </dd>
            <dt className="text-muted">Dataset</dt>
            <dd>{model.dataset}</dd>
            <dt className="text-muted">Trained on</dt>
            <dd>{model.trainedOn}</dd>
            <dt className="text-muted">Threshold tuned on</dt>
            <dd>{model.thresholdTunedOn}</dd>
          </dl>
        </Surface>
        <Surface title="Evaluation">
          <dl className="text-body grid grid-cols-[125px_1fr] gap-2">
            <dt className="text-muted">Evaluated on</dt>
            <dd>{model.evaluatedOn}</dd>
            {metrics ? (
              <>
                <dt className="text-muted">Test rows</dt>
                <dd>
                  {metrics.samples.test.toLocaleString()} ·{" "}
                  {metrics.samples.positives.test} positive
                </dd>
                <dt className="text-muted">Classifier</dt>
                <dd>
                  AP {metrics.classifier.averagePrecision.toFixed(3)} · ROC-AUC{" "}
                  {metrics.classifier.rocAuc.toFixed(4)} · Brier{" "}
                  {metrics.classifier.brier.toFixed(4)}
                </dd>
                <dt className="text-muted">At threshold</dt>
                <dd>
                  {metrics.classifier.precision.toFixed(3)} precision ·{" "}
                  {metrics.classifier.recall.toFixed(3)} recall ·{" "}
                  {metrics.classifier.falsePositives} false alarms
                </dd>
                <dt className="text-muted">Regressor</dt>
                <dd>
                  MAE {metrics.regressor.maeM.toFixed(3)} m · persistence{" "}
                  {metrics.regressor.persistenceMaeM.toFixed(3)} m
                </dd>
                <dt className="text-muted">Calibration</dt>
                <dd>
                  Not calibrated — scores rank risk, not observed frequency
                </dd>
              </>
            ) : (
              <>
                <dt className="text-muted">Metrics</dt>
                <dd>metrics.json is missing</dd>
              </>
            )}
            <dt className="text-muted">Limitations</dt>
            <dd>
              Coarse spatial resolution; water level and flood labels are
              derived from rainfall in dataset v2.
            </dd>
          </dl>
        </Surface>
      </div>
    </>
  );
}

export function ResearcherScreen({ segments }: { segments: string[] }) {
  const [first, second] = segments;
  if (!first) return <DashboardOverview />;
  if (first === "map") return <MapWorkspace />;
  if (first === "locations") return <LocationDetails />;
  if (first === "history") return <HistoricalData />;
  if (first === "forecast" && second === "new") return <ForecastForm />;
  if (first === "forecast" && second === "review") return <ForecastReview />;
  if (first === "forecast" && second === "progress")
    return <ForecastProgress />;
  if (first === "runs" && !second) return <RunHistory />;
  if (first === "runs" && second) return <RunDetail runId={second} />;
  if (first === "compare") return <CompareRuns />;
  if (first === "data-sources") return <DataSourceCatalog detail={second} />;
  if (first === "models")
    return <Models detail={second} basePath="/researcher/models" />;
  return <DashboardOverview />;
}
