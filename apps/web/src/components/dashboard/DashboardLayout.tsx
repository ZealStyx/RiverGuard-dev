"use client";

import { ArrowClockwise, Play } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { ObservedHistoryChart } from "@/components/charts/ObservedHistoryChart";
import { RiverMap } from "@/components/map/RiverMap";
import { StationDetails } from "@/components/stations/StationDetails";
import { Button } from "@/components/ui";
import { Notice, WorkspaceHero } from "@/components/prototype/Primitives";
import type { DatasetMeta, MapLayerId } from "@/types";

import { DEFAULT_LOCATION, LOCATIONS } from "@/lib/locations";
import { useOutlookFeed } from "@/lib/outlook";

import { ModelContributionPanel } from "./ModelContributionPanel";

import { describeStorageShort } from "@/lib/persistence";

import { convexConfigured, OutlookBridge } from "./OutlookBridge";
import { RiskSummary } from "./RiskSummary";

export function DashboardLayout() {
  const [activeLayer, setActiveLayer] = useState<MapLayerId>("base");
  const [selectedDay, setSelectedDay] = useState(0);
  const location = LOCATIONS[DEFAULT_LOCATION];
  const outlook = useOutlookFeed(DEFAULT_LOCATION);
  const [dataset, setDataset] = useState<DatasetMeta | null>(null);
  const [datasetError, setDatasetError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/dataset")
      .then(async (response) => {
        const payload = (await response.json()) as DatasetMeta & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(payload.error ?? "Dataset unavailable");
        if (active) setDataset(payload);
      })
      .catch((error: unknown) => {
        if (active)
          setDatasetError(
            error instanceof Error ? error.message : "Dataset unavailable",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const isRunning = outlook.isRunning;
  const snapshot = outlook.snapshot;
  const storageShort = snapshot
    ? describeStorageShort(snapshot.persistence)
    : null;
  const runNote = outlook.error
    ? `Forecast failed: ${outlook.error}`
    : snapshot
      ? `Updated ${new Date(snapshot.updatedAt).toLocaleTimeString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Manila",
        })} PHT · ${snapshot.provider} · model ${snapshot.modelVersion ?? "unknown"}${
          snapshot.source === "convex"
            ? " · restored from Convex"
            : storageShort
              ? ` · ${storageShort}`
              : ""
        }`
      : "No run yet · press Run forecast to fetch weather and score the next seven days";

  function runPreview() {
    void outlook.run();
  }

  // Tell the reader what the model was fed: the weather provider's window, as
  // of the day the run started. Never the CSV — it is history for the charts.
  const inputNote = snapshot?.observed
    ? `Model input: ${snapshot.provider}, rain through ${snapshot.observed.asOfDate}`
    : undefined;

  return (
    <main id="dashboard" className="min-h-screen bg-canvas">
      {convexConfigured ? (
        <OutlookBridge
          locationCode={DEFAULT_LOCATION}
          onSnapshot={outlook.adopt}
        />
      ) : null}
      <div className="min-h-screen bg-canvas">
        <div className="min-w-0 p-4 sm:p-6 lg:p-7">
          <WorkspaceHero
            eyebrow="Administrator workspace"
            title="Admin research workspace"
            description="NCR experimental flood-risk research workspace. Run the city-level model, read its seven-day evidence, and check what the pipeline stored."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="small"
                  loading={isRunning}
                  loadingLabel="Running forecast"
                  onClick={runPreview}
                >
                  <Play aria-hidden="true" size={16} weight="fill" />
                  Run forecast
                </Button>
                <Button
                  variant="quiet"
                  size="small"
                  onClick={runPreview}
                  disabled={isRunning}
                >
                  <ArrowClockwise aria-hidden="true" size={17} />
                  Refresh
                </Button>
              </div>
            }
            notice={
              <Notice
                title="Experimental research output"
                tone="info"
                className="flex items-start gap-2"
              >
                Verify official PAGASA and LGU sources before taking action.
                This dashboard is a research workspace, not a warning service.
              </Notice>
            }
          >
            <div className="grid gap-1">
              <p className="text-metadata text-muted" aria-live="polite">
                {runNote}
              </p>
              {dataset ? (
                <p className="text-metadata text-muted">
                  Training dataset: {dataset.label} ·{" "}
                  {dataset.rows.toLocaleString()} city-days · {dataset.dateMin}{" "}
                  → {dataset.dateMax}
                  {dataset.realRainFrom
                    ? ` · real ERA5 rain since ${dataset.realRainFrom}`
                    : ""}
                </p>
              ) : datasetError ? (
                <p className="text-metadata text-warning">
                  Dataset unavailable: {datasetError}
                </p>
              ) : (
                <p className="text-metadata text-muted">Reading the dataset…</p>
              )}
            </div>
          </WorkspaceHero>

          {outlook.error ? (
            <div
              role="alert"
              className="mb-3 rounded-control border border-warning/30 bg-warning/5 px-4 py-3"
            >
              <p className="text-button text-ink">{outlook.error}</p>
              {outlook.errorDetail ? (
                <p className="text-metadata mt-1 text-muted">
                  {outlook.errorDetail}
                </p>
              ) : null}
            </div>
          ) : null}

          {snapshot?.warnings.length ? (
            <ul className="mb-3 grid gap-1 rounded-control border border-line bg-canvas-soft px-4 py-3">
              {snapshot.warnings.map((warning) => (
                <li key={warning} className="text-metadata text-muted">
                  · {warning}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-3 min-[1180px]:grid-cols-12">
            <RiverMap
              activeLayer={activeLayer}
              onLayerChange={setActiveLayer}
              className="min-[1180px]:sticky min-[1180px]:top-[5.5rem] z-0 min-[1180px]:col-span-8"
              cooperativeGestures
            />
            <div className="grid content-start gap-3 min-[1180px]:col-span-4">
              <RiskSummary
                locationName={snapshot?.locationName ?? location.name}
                selectedDay={selectedDay}
                onDayChange={setSelectedDay}
                days={snapshot?.days ?? []}
                source={snapshot?.source ?? "none"}
                degraded={snapshot?.degraded}
                note={inputNote}
                emptyAction={{ href: "#dashboard", label: "Run forecast" }}
              />
              <ObservedHistoryChart
                className="mt-0"
                location={location.name}
                limit={14}
              />
              <ModelContributionPanel locationCode={DEFAULT_LOCATION} />
              {dataset ? (
                <StationDetails
                  dataset={dataset}
                  model={{ version: snapshot?.modelVersion ?? null }}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
