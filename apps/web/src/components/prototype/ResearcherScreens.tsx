"use client";

import {
  ArrowClockwise,
  ArrowRight,
  FloppyDisk,
  MapPin,
  Play,
  Plus,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { RainfallChart } from "@/components/charts/RainfallChart";
import { ModelContributionPanel } from "@/components/dashboard/ModelContributionPanel";
import { RiskSummary } from "@/components/dashboard/RiskSummary";
import { RiverMap } from "@/components/map/RiverMap";
import { StationDetails } from "@/components/stations/StationDetails";
import { Button } from "@/components/ui";
import {
  dataSources,
  forecastRuns,
  modelVersions,
  supportedLocations,
} from "@/data/prototype";
import type { MapLayerId } from "@/types";

import {
  ActionLink,
  CheckControl,
  DataTable,
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
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState(
    "Updated Nov 11, 2026 · 09:40 PHT",
  );

  function refreshPreview() {
    setRefreshing(true);
    setRefreshNote("Updating view…");
    window.setTimeout(() => {
      setRefreshing(false);
      setRefreshNote("Updated just now");
    }, 700);
  }

  return (
    <>
      <PageHeading
        title="Researcher dashboard"
        eyebrow="Research workspace"
        description={`NCR experimental flood-risk workspace · ${refreshNote}`}
        actions={
          <>
            <ActionLink href="/researcher/forecast/new">
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
          <RiskSummary selectedDay={selectedDay} onDayChange={setSelectedDay} />
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
        title="Map and locations"
        eyebrow="Spatial explorer"
        description="Explore the four supported sample cities. Forecast output and static hazard context remain separate layers."
        actions={
          <ActionLink href="/researcher/locations/marikina">
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
                    href={`/researcher/locations/${location.name.toLowerCase().replace(" ", "-")}`}
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

function LocationDetails() {
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
          value="Elevated"
          detail="Nov 11, 2026"
          tone="warning"
        />
        <Metric
          label="Rainfall"
          value="36 mm"
          detail="Illustrative daily total"
          tone="primary"
        />
        <Metric
          label="Quality"
          value="Unverified"
          detail="Research use only"
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
            <dd>Nov 5–11, 2026 sample</dd>
            <dt className="text-muted">Forecast horizon</dt>
            <dd>Up to seven days</dd>
            <dt className="text-muted">Provider</dt>
            <dd>RiverGuard research dataset</dd>
            <dt className="text-muted">Limitations</dt>
            <dd>No barangay or street-level inference</dd>
          </dl>
          <ActionLink
            href="/researcher/data-sources/daily-rainfall"
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
  return (
    <>
      <PageHeading
        title="Historical data"
        eyebrow="Evidence explorer"
        description="Filter the available readings without converting missing values into zero."
        actions={
          <ActionLink href="/researcher/data-sources" variant="quiet">
            Review sources
          </ActionLink>
        }
      />
      <Surface className="mb-3" title="Filters">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SelectControl
            id="history-location"
            label="Location"
            defaultValue="Marikina"
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
            defaultValue="2026-11-05"
          />
          <TextField
            id="date-to"
            label="To"
            type="date"
            defaultValue="2026-11-11"
          />
          <SelectControl
            id="history-variable"
            label="Variable"
            defaultValue="Rainfall"
          >
            <option>Rainfall</option>
            <option>Water level sample</option>
          </SelectControl>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="small" onClick={() => setApplied(true)}>
            Apply filters
          </Button>
          <Button
            size="small"
            variant="quiet"
            onClick={() => setApplied(false)}
          >
            Reset
          </Button>
        </div>
        {applied ? (
          <p className="text-metadata mt-2 text-success" role="status">
            Filters applied to the illustrative sample.
          </p>
        ) : null}
      </Surface>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <RainfallChart />
        <Surface title="Displayed data">
          <DataTable
            columns={[
              { key: "date", label: "Date" },
              { key: "rainfall", label: "Rainfall" },
              { key: "water", label: "Water level" },
            ]}
            rows={[
              { date: "Nov 11", rainfall: "36 mm", water: "15.9 m (sample)" },
              { date: "Nov 10", rainfall: "82 mm", water: "16.4 m (sample)" },
              { date: "Nov 9", rainfall: "48 mm", water: "15.8 m (sample)" },
              { date: "Nov 8", rainfall: "28 mm", water: "Missing" },
            ]}
          />
        </Surface>
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
        eyebrow="Step 1 of 4"
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
            label="Issue period"
            value="Nov 11, 2026 · current sample"
            readOnly
          />
          <TextField
            id="weather-provider"
            label="Weather provider"
            value="RiverGuard research dataset"
            readOnly
          />
          <SelectControl
            id="model-version"
            label="Model version"
            defaultValue="RG-NCR v0.4"
          >
            <option>RG-NCR v0.4</option>
            <option>RG-NCR v0.3</option>
          </SelectControl>
          <TextField
            id="coverage"
            label="Data coverage"
            value="City-level daily sample"
            readOnly
          />
        </div>
        <div className="mt-3">
          <CheckControl
            id="include-explanation"
            label="Include model explanation"
            description="Show supported feature contributions and limitations in results."
            checked={includeExplanation}
            onChange={(event) => setIncludeExplanation(event.target.checked)}
          />
        </div>
        <Notice title="Review before running" tone="info">
          Confirm the selected location, horizon, provider, and model version.
        </Notice>
        <div className="mt-4 flex justify-end gap-2">
          <ActionLink href="/researcher" variant="quiet">
            Cancel
          </ActionLink>
          <Button
            size="small"
            onClick={() =>
              router.push(
                `/researcher/forecast/review?location=${encodeURIComponent(location)}&explain=${includeExplanation}`,
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
  return (
    <>
      <PageHeading
        title="Review forecast inputs"
        eyebrow="Step 2 of 4"
        description="Confirm the sample request before starting the simulated forecast workflow."
      />
      <Surface className="mx-auto max-w-4xl" title="Request summary">
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ["Locations", "Marikina"],
            ["Horizon", "Seven days"],
            ["Issue period", "Nov 11, 2026"],
            ["Weather provider", "RiverGuard research dataset"],
            ["Model", "RG-NCR v0.4"],
            ["Explanation", "Included"],
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
          <ActionLink href="/researcher/forecast/new" variant="quiet">
            Edit inputs
          </ActionLink>
          <ActionLink href="/researcher/forecast/progress">
            <Play size={14} /> Run experimental forecast
          </ActionLink>
        </div>
      </Surface>
    </>
  );
}

function ForecastProgress() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const steps = [
    "Requesting weather",
    "Validating inputs",
    "Running models",
    "Saving snapshot",
  ];
  useEffect(() => {
    if (step >= steps.length) {
      const destination = window.setTimeout(
        () => router.push("/researcher/runs/RG-NCR-041"),
        650,
      );
      return () => window.clearTimeout(destination);
    }
    const timer = window.setTimeout(
      () => setStep((current) => current + 1),
      550,
    );
    return () => window.clearTimeout(timer);
  }, [router, step, steps.length]);
  return (
    <>
      <PageHeading
        title="Forecast in progress"
        eyebrow="Step 3 of 4"
        description="Simulating the planned local forecast workflow. You will be redirected when the sample run completes."
      />
      <Surface
        className="mx-auto max-w-4xl"
        title={step >= steps.length ? "Sample run complete" : steps[step]}
        description="Run RG-NCR-041 · Marikina · Seven-day horizon"
      >
        <Stepper steps={steps} current={Math.min(step, steps.length - 1)} />
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-brand-secondary transition-all"
            style={{ width: `${Math.max(12, (step / steps.length) * 100)}%` }}
          />
        </div>
        <p className="text-body mt-3 text-muted">
          {step >= steps.length
            ? "Opening the completed illustrative result…"
            : "Keep this page open while the sample workflow advances."}
        </p>
      </Surface>
    </>
  );
}

function ForecastResults() {
  const [selectedDay, setSelectedDay] = useState(0);
  return (
    <>
      <PageHeading
        title="Forecast results"
        eyebrow="RG-NCR-041 · Complete"
        description="Experimental seven-day city-level result created Nov 11, 2026 at 09:40 PHT."
        actions={
          <>
            <ActionLink href="/researcher/runs/RG-NCR-041/day/2026-11-11">
              View selected day
            </ActionLink>
            <ActionLink href="/researcher/compare" variant="quiet">
              Compare run
            </ActionLink>
          </>
        }
      />
      <Notice title="Experimental result" tone="warning">
        This is an experimental outlook, not an exact flood probability or
        official warning.
      </Notice>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="grid gap-3">
          <RiskSummary selectedDay={selectedDay} onDayChange={setSelectedDay} />
          <RainfallChart />
        </div>
        <div className="grid content-start gap-3">
          <ModelContributionPanel />
          <StationDetails />
          <Surface title="Research note">
            <TextAreaField
              id="research-note"
              label="Note"
              placeholder="Record an observation about this experimental run…"
            />
            <Button size="small" variant="secondary" className="mt-3">
              <FloppyDisk size={14} /> Save note
            </Button>
          </Surface>
        </div>
      </div>
    </>
  );
}

function DayDetail() {
  return (
    <>
      <PageHeading
        title="Marikina · November 11"
        eyebrow="Forecast day detail"
        description="Day-level explanation, uncertainty, quality notes, and separately labeled hazard context."
        actions={
          <ActionLink href="/researcher/runs/RG-NCR-041" variant="quiet">
            Back to run
          </ActionLink>
        }
      />
      <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Experimental index"
          value="Elevated"
          detail="Category, not probability"
          tone="warning"
        />
        <Metric
          label="Forecast rainfall"
          value="73 mm"
          detail="RiverGuard research dataset"
          tone="primary"
        />
        <Metric
          label="Confidence"
          value="Not calibrated"
          detail="Do not infer certainty"
          tone="warning"
        />
        <Metric
          label="Quality"
          value="Sample"
          detail="Not operationally validated"
          tone="secondary"
        />
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <RainfallChart />
        <ModelContributionPanel />
        <Surface title="How this was estimated">
          <p className="text-body text-muted">
            The illustrative result combines forecast rainfall, a sample
            basin-response feature, and antecedent wetness. Contribution
            describes model behavior, not a physical causal claim.
          </p>
          <ActionLink
            href="/researcher/models/rg-ncr-04"
            variant="quiet"
            className="mt-3"
          >
            View model card
          </ActionLink>
        </Surface>
        <Surface title="Static hazard context">
          <p className="text-body text-muted">
            Long-term susceptibility belongs to a separate layer and does not
            change this dated forecast result.
          </p>
          <ActionLink href="/researcher/map" variant="quiet" className="mt-3">
            View separate layers
          </ActionLink>
        </Surface>
      </div>
    </>
  );
}

function RunHistory() {
  const rows = forecastRuns.map((run) => ({ ...run }));
  return (
    <>
      <PageHeading
        title="Forecast runs"
        eyebrow="Research history"
        description="Filter, inspect, and compare forecast runs without hiding partial or failed results."
        actions={
          <ActionLink href="/researcher/forecast/new">
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
            <option>RG-NCR v0.4</option>
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
      <Surface title="Run history" description="Four illustrative records">
        <DataTable
          columns={[
            { key: "id", label: "Run ID" },
            { key: "created", label: "Created" },
            { key: "location", label: "Location" },
            { key: "model", label: "Model" },
            { key: "status", label: "Status" },
            { key: "warning", label: "Warnings" },
          ]}
          rows={rows}
          actions={(row) => (
            <ActionLink href={`/researcher/runs/${row.id}`} variant="quiet">
              View
            </ActionLink>
          )}
        />
      </Surface>
      <div className="mt-3 flex justify-end">
        <ActionLink href="/researcher/compare" variant="secondary">
          Compare selected
        </ActionLink>
      </div>
    </>
  );
}

function CompareRuns() {
  return (
    <>
      <PageHeading
        title="Compare forecast runs"
        eyebrow="Model comparison"
        description="Compare two illustrative runs with aligned locations, valid dates, inputs, and quality warnings."
        actions={
          <ActionLink href="/researcher/runs" variant="quiet">
            Back to history
          </ActionLink>
        }
      />
      <div className="grid gap-3 lg:grid-cols-2">
        {["RG-NCR-041", "RG-NCR-040"].map((id, index) => (
          <Surface
            key={id}
            title={id}
            description={
              index === 0
                ? "Created Nov 11 · RG-NCR v0.4"
                : "Created Nov 10 · RG-NCR v0.4"
            }
          >
            <div className="grid grid-cols-2 gap-2">
              <Metric
                label="Peak category"
                value={index === 0 ? "Elevated" : "Moderate"}
                detail="Experimental index"
                tone={index === 0 ? "warning" : "secondary"}
              />
              <Metric
                label="Peak rainfall"
                value={index === 0 ? "82 mm" : "61 mm"}
                detail="Sample input"
                tone="primary"
              />
            </div>
            <dl className="text-body mt-3 grid grid-cols-[110px_1fr] gap-2">
              <dt className="text-muted">Location</dt>
              <dd>Marikina</dd>
              <dt className="text-muted">Quality</dt>
              <dd>Sample · unverified</dd>
              <dt className="text-muted">Warnings</dt>
              <dd>{index === 0 ? "None recorded" : "One missing reading"}</dd>
            </dl>
          </Surface>
        ))}
      </div>
      <Surface className="mt-3" title="Comparison interpretation">
        <Notice title="Do not over-interpret differences">
          Changes between runs may reflect provider inputs, missing
          observations, model version, or issue time. They are not direct
          evidence of changing ground conditions.
        </Notice>
      </Surface>
    </>
  );
}

function DataSourceCatalog({ detail }: { detail?: string }) {
  if (detail === "new") return <DataSourceForm />;
  if (detail) return <DataSourceDetail />;
  return (
    <>
      <PageHeading
        title="Data sources"
        eyebrow="Catalogue and provenance"
        description="Review coverage, licensing, resolution, quality, and limitations before using any source."
        actions={
          <ActionLink href="/researcher/data-sources/new">
            <Plus size={14} /> Add metadata
          </ActionLink>
        }
      />
      <Surface title="Source catalogue">
        <DataTable
          columns={[
            { key: "name", label: "Source" },
            { key: "provider", label: "Provider" },
            { key: "coverage", label: "Coverage" },
            { key: "status", label: "Provenance status" },
          ]}
          rows={dataSources.map((source) => ({ ...source }))}
          actions={(row) => (
            <ActionLink
              href={`/researcher/data-sources/${dataSources.find((source) => source.name === row.name)?.id ?? "daily-rainfall"}`}
              variant="quiet"
            >
              View
            </ActionLink>
          )}
        />
      </Surface>
    </>
  );
}

function DataSourceDetail() {
  return (
    <>
      <PageHeading
        title="NCR daily rainfall sample"
        eyebrow="Data-source metadata"
        description="Unverified research dataset used for experimental forecast analysis."
        actions={
          <>
            <ActionLink href="/researcher/data-sources/new" variant="secondary">
              Edit metadata
            </ActionLink>
            <ActionLink href="/researcher/data-sources" variant="quiet">
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
            ["Type", "Daily rainfall sample"],
            ["Geography", "Quezon City, Marikina, Manila, Pasig"],
            ["Time coverage", "Nov 5–11, 2026"],
            ["Resolution", "City-level, daily"],
            ["Units", "Millimetres"],
            ["License", "Not established"],
            ["Access date", "Nov 11, 2026"],
            ["Provenance status", "Unverified"],
            ["Local reference", "data/samples/sensor_readings.csv"],
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

function DataSourceForm() {
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
          <ActionLink href="/researcher/data-sources" variant="quiet">
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

function Models({ detail }: { detail?: string }) {
  if (detail) return <ModelDetail />;
  return (
    <>
      <PageHeading
        title="Models and evaluation"
        eyebrow="Experimental methodology"
        description="Review responsibility, supported coverage, evaluation status, and readiness before selecting a model."
      />
      <div className="grid gap-3 lg:grid-cols-3">
        {modelVersions.map((model) => (
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
                    tone={model.status === "Experimental" ? "info" : "neutral"}
                  >
                    {model.status}
                  </StatusBadge>
                </dd>
              </div>
            </dl>
            <ActionLink
              href={`/researcher/models/${model.id}`}
              variant="quiet"
              className="mt-4 w-full"
            >
              View model card
            </ActionLink>
          </Surface>
        ))}
      </div>
    </>
  );
}

function ModelDetail() {
  return (
    <>
      <PageHeading
        title="RG-NCR v0.4"
        eyebrow="Experimental model card"
        description="Model responsibility, feature contract, evaluation status, and known limitations."
        actions={
          <ActionLink href="/researcher/models" variant="quiet">
            Back to models
          </ActionLink>
        }
      />
      <Notice title="Experimental status" tone="warning">
        This version has not been calibrated or validated for operational
        flood-warning decisions.
      </Notice>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Surface title="Responsibility">
          <dl className="text-body grid grid-cols-[125px_1fr] gap-2">
            <dt className="text-muted">Target</dt>
            <dd>Experimental city-level risk category</dd>
            <dt className="text-muted">Locations</dt>
            <dd>Four supported sample cities</dd>
            <dt className="text-muted">Horizon</dt>
            <dd>Up to seven days</dd>
            <dt className="text-muted">Inputs</dt>
            <dd>Rainfall forecast, basin response, antecedent wetness</dd>
            <dt className="text-muted">Dataset</dt>
            <dd>RiverGuard research dataset v0.1</dd>
          </dl>
        </Surface>
        <Surface title="Evaluation">
          <dl className="text-body grid grid-cols-[125px_1fr] gap-2">
            <dt className="text-muted">Method</dt>
            <dd>Draft historical holdout</dd>
            <dt className="text-muted">Metrics</dt>
            <dd>Not approved for display</dd>
            <dt className="text-muted">Calibration</dt>
            <dd>Not complete</dd>
            <dt className="text-muted">Readiness</dt>
            <dd>Research evaluation required</dd>
            <dt className="text-muted">Limitations</dt>
            <dd>Coarse spatial resolution; incomplete provenance</dd>
          </dl>
        </Surface>
      </div>
    </>
  );
}

export function ResearcherScreen({ segments }: { segments: string[] }) {
  const [first, second, third] = segments;
  if (!first) return <DashboardOverview />;
  if (first === "map") return <MapWorkspace />;
  if (first === "locations") return <LocationDetails />;
  if (first === "history") return <HistoricalData />;
  if (first === "forecast" && second === "new") return <ForecastForm />;
  if (first === "forecast" && second === "review") return <ForecastReview />;
  if (first === "forecast" && second === "progress")
    return <ForecastProgress />;
  if (first === "runs" && !second) return <RunHistory />;
  if (first === "runs" && second && third === "day") return <DayDetail />;
  if (first === "runs" && second) return <ForecastResults />;
  if (first === "compare") return <CompareRuns />;
  if (first === "data-sources") return <DataSourceCatalog detail={second} />;
  if (first === "models") return <Models detail={second} />;
  return <DashboardOverview />;
}
