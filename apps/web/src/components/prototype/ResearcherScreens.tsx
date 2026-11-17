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

import { RainfallChart } from "@/components/charts/RainfallChart";
import { MonthlyRainfallChart } from "@/components/charts/MonthlyRainfallChart";
import {
  TremorHistoricalCharts,
  TremorMonthlyRainfallChart,
} from "@/components/charts/TremorHistoricalCharts";
import { ModelContributionPanel } from "@/components/dashboard/ModelContributionPanel";
import {
  convexConfigured,
  OutlookBridge,
} from "@/components/dashboard/OutlookBridge";
import { RiskSummary } from "@/components/dashboard/RiskSummary";
import {
  DEFAULT_LOCATION,
  LOCATIONS,
  locationCodeForName,
} from "@/lib/locations";
import { convexErrorHint } from "@/lib/convex-functions";
import { useConvexQueryResult } from "@/lib/convex-query";
import { useOutlookFeed } from "@/lib/outlook";
import { RiverMap } from "@/components/map/RiverMap";
import { StationDetails } from "@/components/stations/StationDetails";
import { Button } from "@/components/ui";
import {
  dataSourceRows,
  modelVersionRows,
  runHistoryRows,
  supportedLocations,
} from "@/data/prototype";
import { convexFunctions } from "@/lib/convex-functions";
import { useDatasetMeta } from "@/lib/use-dataset-meta";
import { useModelArtifacts } from "@/lib/use-model-artifacts";
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
  const [activeLayer, setActiveLayer] = useState<MapLayerId>("base");
  const [selectedDay, setSelectedDay] = useState(0);
  const outlook = useOutlookFeed(DEFAULT_LOCATION);
  const refreshing = outlook.isRunning;
  const refreshNote = outlook.error
    ? `Forecast failed: ${outlook.error}`
    : outlook.snapshot
      ? `Updated ${new Date(outlook.snapshot.updatedAt).toLocaleTimeString(
          "en-PH",
          {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Manila",
          },
        )} PHT · ${outlook.snapshot.provider} · model ${outlook.snapshot.modelVersion ?? "unknown"}`
      : "No run yet · press Refresh to fetch weather, run the model, and store the result";

  function refreshPreview() {
    void outlook.run();
  }

  return (
    <>
      {convexConfigured ? (
        <OutlookBridge
          locationCode={DEFAULT_LOCATION}
          onSnapshot={outlook.adopt}
        />
      ) : null}
      <PageHeading
        title="Research workspace"
        eyebrow="Administrator tools"
        description={`NCR experimental flood-risk workspace · ${refreshNote}`}
        actions={
          <>
            <ActionLink href="/admin/research/forecast/new">
              <Play size={14} weight="fill" /> Run forecast
            </ActionLink>
            <Button
              variant="quiet"
              size="small"
              loading={refreshing}
              loadingLabel="Refreshing"
              onClick={refreshPreview}
            >
              <ArrowClockwise size={15} /> Refresh
            </Button>
          </>
        }
      />

      <div className="grid gap-3 min-[1180px]:grid-cols-[minmax(0,1.38fr)_minmax(390px,1fr)]">
        <RiverMap activeLayer={activeLayer} onLayerChange={setActiveLayer} />
        <div className="grid content-start gap-3">
          <RiskSummary
            selectedDay={selectedDay}
            onDayChange={setSelectedDay}
            days={outlook.snapshot?.days}
            source={outlook.snapshot?.source}
            note={
              outlook.snapshot?.warnings[0] ??
              (outlook.snapshot
                ? `Weather via ${outlook.snapshot.provider}`
                : undefined)
            }
          />
          <RainfallChart />
          <ModelContributionPanel />
          <StationDetails />
        </div>
      </div>
    </>
  );
}

function MapWorkspace() {
  const [activeLayer, setActiveLayer] = useState<MapLayerId>("base");
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
        <RiverMap activeLayer={activeLayer} onLayerChange={setActiveLayer} />
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
            This is a real OpenStreetMap basemap. RiverGuard boundaries,
            monitoring stations, hazard layers, and predictions are not loaded
            until verified local GIS and model data are supplied.
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
            <ActionLink href="/admin/research/forecast/new">
              Run forecast
            </ActionLink>
            <ActionLink href="/admin/research/map" variant="quiet">
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
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <RainfallChart />
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
  const [chartMode, setChartMode] = useState<"riverguard" | "tremor">(
    "riverguard",
  );
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-section">Visualization comparison</h2>
          <p className="text-metadata mt-0.5 text-muted">
            Compare the current RiverGuard chart with the Tremor Raw-style
            experiment.
          </p>
        </div>
        <div className="flex gap-1 rounded-control border border-line bg-canvas-soft p-1">
          <Button
            size="small"
            variant={chartMode === "riverguard" ? "secondary" : "quiet"}
            onClick={() => setChartMode("riverguard")}
          >
            RiverGuard
          </Button>
          <Button
            size="small"
            variant={chartMode === "tremor" ? "secondary" : "quiet"}
            onClick={() => setChartMode("tremor")}
          >
            Tremor trial
          </Button>
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        {chartMode === "tremor" ? (
          <TremorHistoricalCharts
            location={appliedFilters.location}
            startDate={appliedFilters.startDate}
            endDate={appliedFilters.endDate}
          />
        ) : (
          <RainfallChart
            location={appliedFilters.location}
            startDate={appliedFilters.startDate}
            endDate={appliedFilters.endDate}
          />
        )}
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
        {chartMode === "tremor" ? (
          <TremorMonthlyRainfallChart location={appliedFilters.location} />
        ) : (
          <MonthlyRainfallChart location={appliedFilters.location} />
        )}
      </div>
    </>
  );
}

function ForecastForm() {
  const router = useRouter();
  const [location, setLocation] = useState("Marikina");
  const [includeExplanation, setIncludeExplanation] = useState(true);
  return (
    <>
      <PageHeading
        title="Run experimental forecast"
        eyebrow="Step 1 of 3"
        description="Configure a manual seven-day forecast for supported locations."
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
            defaultValue="Seven days"
          >
            <option>Three days</option>
            <option>Seven days</option>
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
            value="Open-Meteo forecast API (30 past days + 7 forecast days)"
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
          3/7/30-day sums and soil moisture, followed by its seven-day forecast.
        </Notice>
        <div className="mt-4 flex justify-end gap-2">
          <ActionLink href="/admin/research" variant="quiet">
            Cancel
          </ActionLink>
          <Button
            size="small"
            onClick={() =>
              router.push(
                `/admin/research/forecast/review?location=${encodeURIComponent(location)}&explain=${includeExplanation}`,
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
            ["Horizon", "Seven days"],
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
            ["Explanation", "Sensitivity sweep included"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-control bg-canvas-soft p-3">
              <dt className="text-metadata text-muted">{label}</dt>
              <dd className="text-body mt-1 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <Notice title="Responsible-use confirmation" tone="warning">
          The output will be experimental, city-level, and unsuitable as an
          official warning.
        </Notice>
        <div className="mt-4 flex justify-between gap-2">
          <ActionLink
            href={`/admin/research/forecast/new?location=${locationCode}`}
            variant="quiet"
          >
            Edit inputs
          </ActionLink>
          <Button
            size="small"
            onClick={() =>
              router.push(
                `/admin/research/forecast/progress?location=${locationCode}`,
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
  const feed = useOutlookFeed(locationCode);
  const started = useRef(false);
  const { run } = feed;

  const stages = [
    "Fetching the weather window",
    "Scoring seven days",
    "Storing the run",
  ];

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  const snapshot = feed.snapshot;
  const stageIndex = snapshot ? stages.length - 1 : feed.isRunning ? 1 : 0;

  return (
    <>
      <PageHeading
        title="Forecast in progress"
        eyebrow="Step 3 of 3"
        description="Running the weather → model → storage pipeline."
        actions={
          <ActionLink href="/admin/research/runs" variant="quiet">
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
        description={`${LOCATIONS[locationCode].name} · seven-day horizon`}
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
              <ActionLink href="/admin/research/forecast/new" variant="quiet">
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
                selectedDay={0}
                onDayChange={() => undefined}
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
            <p className="text-metadata text-muted">
              {snapshot.source === "convex"
                ? "Stored in Convex and restored on reload."
                : "Convex is not configured, so this run exists only on this page. Set NEXT_PUBLIC_CONVEX_URL to keep it."}
            </p>
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

/**
 * A run URL that does not resolve to a stored run.
 *
 * These routes used to render a fixed "RG-NCR-041 · Complete" narrative for any
 * id in the path, so every link looked like a real run. Now an id only renders if
 * it came from storage, and until Convex is configured nothing does.
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
        description="Run results are read from the database. A run exists only after someone presses Run forecast, and only while a Convex deployment is configured."
        actionHref="/admin/research/runs"
        actionLabel="Back to run history"
      />
    </>
  );
}

function CompareRunsUnavailable() {
  return (
    <>
      <PageHeading
        title="Compare forecast runs"
        eyebrow="Model comparison"
        description="Side-by-side comparison of stored runs."
      />
      <EmptyPanel
        title="Nothing to compare"
        description="Comparison needs at least two stored runs. This page previously showed two invented runs and called the difference a model comparison."
        actionHref="/admin/research/runs"
        actionLabel="Back to run history"
      />
    </>
  );
}

/**
 * Stored runs. Kept in a separate component so the query is never called when
 * no deployment is configured — it needs a ConvexProvider.
 */
function StoredRunTable() {
  const { data: runs, error } = useConvexQueryResult(
    convexFunctions.recentRuns,
    { limit: 25 },
  );
  const rows: Array<Record<string, string>> = runHistoryRows(runs ?? []);
  return (
    <Surface
      title="Run history"
      description={
        error
          ? `Unavailable — ${convexErrorHint(error)}`
          : runs === undefined
            ? "Loading stored runs…"
            : runs.length === 0
              ? "No runs stored yet — run a forecast to create one"
              : `${runs.length} stored run(s)`
      }
    >
      <DataTable
        columns={[
          { key: "run", label: "Run ID" },
          { key: "created", label: "Created" },
          { key: "location", label: "Location" },
          { key: "model", label: "Model" },
          { key: "status", label: "Status" },
          { key: "warning", label: "Warnings" },
        ]}
        rows={rows}
        actions={(row) => (
          <ActionLink href={`/admin/research/runs/${row.run}`} variant="quiet">
            View
          </ActionLink>
        )}
      />
    </Surface>
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
          <ActionLink href="/admin/research/forecast/new">
            <Plus size={14} /> New forecast
          </ActionLink>
        }
      />
      <Surface className="mb-3" title="Filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectControl id="run-location" label="Location">
            <option>All supported locations</option>
            <option>Marikina</option>
            <option>Quezon City</option>
          </SelectControl>
          <SelectControl id="run-model" label="Model">
            <option>All models</option>
            <option>Current deployed model</option>
          </SelectControl>
          <SelectControl id="run-status" label="Status">
            <option>All statuses</option>
            <option>Complete</option>
            <option>Partial</option>
            <option>Failed</option>
          </SelectControl>
          <TextField id="run-date" label="Created after" type="date" />
        </div>
      </Surface>
      {convexConfigured ? (
        <StoredRunTable />
      ) : (
        <Surface title="Run history" description="No deployment configured">
          <p className="text-body text-muted">
            Forecast runs are stored in Convex. Set{" "}
            <code className="rounded bg-canvas px-1 py-0.5">
              NEXT_PUBLIC_CONVEX_URL
            </code>{" "}
            to list them here; until then a run exists only in the response that
            produced it.
          </p>
        </Surface>
      )}
      <div className="mt-3 flex justify-end">
        <ActionLink href="/admin/research/compare" variant="secondary">
          Compare selected
        </ActionLink>
      </div>
    </>
  );
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
              "Real rain segment",
              dataset?.realRainFrom
                ? `ERA5 reanalysis from ${dataset.realRainFrom}; synthetic before that`
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
  const [saved, setSaved] = useState(false);
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
          <Button size="small" onClick={() => setSaved(true)}>
            <FloppyDisk size={14} /> Save metadata
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
  if (detail) return <ModelDetail basePath={basePath} />;
  return (
    <>
      <PageHeading
        title="Models and evaluation"
        eyebrow="Experimental methodology"
        description="Review responsibility, supported coverage, evaluation status, and readiness before selecting a model."
      />
      {artifacts.loading ? (
        <p className="text-body text-muted">Reading model artifacts…</p>
      ) : artifacts.error ? (
        <Notice title="Model artifacts unavailable" tone="warning">
          {artifacts.error}
        </Notice>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          {modelVersionRows(artifacts.model, artifacts.metrics).map((model) => (
            <Surface
              key={model.id}
              title={model.name}
              description={model.responsibility}
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
              <ActionLink
                href={`${basePath}/${model.id}?view=research`}
                variant="quiet"
                className="mt-4 w-full"
              >
                View model card
              </ActionLink>
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
  if (first === "runs" && second) return <RunDetailNotFound runId={second} />;
  if (first === "compare") return <CompareRunsUnavailable />;
  if (first === "data-sources") return <DataSourceCatalog detail={second} />;
  if (first === "models") return <Models detail={second} />;
  return <DashboardOverview />;
}
