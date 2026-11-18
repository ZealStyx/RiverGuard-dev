"use client";

import {
  ArrowClockwise,
  ChartLineUp,
  Database,
  GearSix,
  MagnifyingGlass,
  MapTrifold,
  Moon,
  Play,
  Question,
  Sun,
  Table,
  WaveSine,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { RainfallChart } from "@/components/charts/RainfallChart";
import { RiverMap } from "@/components/map/RiverMap";
import { StationDetails } from "@/components/stations/StationDetails";
import { Button, IconButton, Tooltip } from "@/components/ui";
import { SearchDialog, type SearchItem } from "@/components/ui/SearchDialog";
import type { DatasetMeta, MapLayerId } from "@/types";

import { DEFAULT_LOCATION, LOCATIONS } from "@/lib/locations";
import { formatRunTime } from "@/lib/runs";
import { useTheme } from "@/lib/theme";
import { useLocalRuns } from "@/lib/use-runs";
import { useOutlookFeed } from "@/lib/outlook";

import { ModelContributionPanel } from "./ModelContributionPanel";
import { BuildStamp } from "@/components/BuildStamp";

import { describeStorageShort } from "@/lib/persistence";

import { ActivityMenu, ProfileMenu } from "./WorkspaceMenus";
import { convexConfigured, OutlookBridge } from "./OutlookBridge";
import { RiskSummary } from "./RiskSummary";

const navigation = [
  { id: "dashboard", label: "Dashboard", href: "#dashboard" },
  { id: "map-workspace", label: "Map workspace", href: "#map-workspace" },
  { id: "historical-context", label: "History", href: "#historical-context" },
  { id: "data-provenance", label: "Data catalogue", href: "#data-provenance" },
  { id: "model-contribution", label: "Models", href: "#model-contribution" },
];

/** Section anchors, in the order the page reads. Used by search and the rail. */
const sectionIcons: Record<string, ReactNode> = {
  dashboard: <ChartLineUp size={16} aria-hidden="true" />,
  "map-workspace": <MapTrifold size={16} aria-hidden="true" />,
  "historical-context": <ChartLineUp size={16} aria-hidden="true" />,
  "data-provenance": <Database size={16} aria-hidden="true" />,
  "model-contribution": <Table size={16} aria-hidden="true" />,
};

const iconButtonClass =
  "inline-flex size-8 items-center justify-center rounded-control border border-line bg-canvas-soft text-ink hover:bg-canvas";

/**
 * Search for this workspace: the page's own sections, the four supported cities,
 * the admin screens that are worth jumping to, and stored runs.
 *
 * It filters a list this component can navigate to — no index, no network call
 * of its own. Runs come from the same store the rest of the screen reads, and
 * only when that store is the local one; with a Convex deployment the run
 * history screen is the entry point instead of a stale local copy.
 */
function DashboardSearch({ onClose }: { onClose: () => void }) {
  const { data: runs } = useLocalRuns(8);

  const items = useMemo<SearchItem[]>(() => {
    const sections: SearchItem[] = navigation.map((item) => ({
      href: item.href,
      label: item.label,
      meta: "Section on this page",
      icon: sectionIcons[item.id],
    }));

    const screens: SearchItem[] = [
      {
        href: "/admin/research/runs",
        label: "Forecast runs",
        meta: "Every stored run, newest first",
        icon: <Table size={16} aria-hidden="true" />,
      },
      {
        href: "/admin/provider",
        label: "Provider configuration",
        meta: "Weather provider, soil moisture, rain gauge, river context",
        icon: <GearSix size={16} aria-hidden="true" />,
      },
      {
        href: "/admin/hazard-layers",
        label: "Hazard layers",
        meta: "What data/gis verification accepts",
        icon: <MapTrifold size={16} aria-hidden="true" />,
      },
    ];

    const cities: SearchItem[] = Object.values(LOCATIONS).map((city) => ({
      href: "/admin/locations",
      label: `${city.name} · city`,
      meta: `${city.river} · alarms ${city.alarmLevelsM.join(" / ")} m${
        city.alarmsVerified ? "" : " (indicative)"
      }`,
      icon: <MapTrifold size={16} aria-hidden="true" />,
    }));

    const storedRuns: SearchItem[] =
      !convexConfigured && runs
        ? runs.map((run) => ({
            href: `/admin/research/runs/${encodeURIComponent(run.runId)}`,
            label: `${run.locations.join(", ") || "Run"} · ${formatRunTime(run.requestedAt)}`,
            meta: `Stored run ${run.runId}`,
            icon: <Table size={16} aria-hidden="true" />,
          }))
        : [];

    return [...sections, ...screens, ...cities, ...storedRuns];
  }, [runs]);

  return (
    <SearchDialog
      items={items}
      onClose={onClose}
      footnote={
        convexConfigured
          ? "Search covers this page's sections, admin screens, and the four supported cities."
          : "Search covers this page's sections, admin screens, the four supported cities, and stored runs."
      }
    />
  );
}

export function DashboardLayout() {
  const [activeLayer, setActiveLayer] = useState<MapLayerId>("base");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedDay, setSelectedDay] = useState(0);
  const [layersOpen, setLayersOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, setTheme } = useTheme();
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

  useEffect(() => {
    function syncActiveSection() {
      const section = window.location.hash.slice(1);
      setActiveSection(
        navigation.some((item) => item.id === section) ? section : "dashboard",
      );
    }

    syncActiveSection();
    window.addEventListener("hashchange", syncActiveSection);
    return () => window.removeEventListener("hashchange", syncActiveSection);
  }, []);

  function runPreview() {
    void outlook.run();
  }

  // Tell the reader what the model was fed: the weather provider's window, as
  // of the day the run started. Never the CSV — it is history for the charts.
  const inputNote = snapshot?.observed
    ? `Model input: ${snapshot.observed.rainSource}, rain through ${snapshot.observed.asOfDate}`
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
        <nav
          aria-label="Primary navigation"
          className="sticky top-0 z-40 flex min-h-20 items-center gap-5 border-b border-line bg-canvas/95 px-5 backdrop-blur-sm md:px-7"
        >
          <WaveSine
            aria-hidden="true"
            size={36}
            weight="bold"
            className="hidden shrink-0 sm:block"
          />
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto sm:gap-2">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                aria-current={activeSection === item.id ? "page" : undefined}
                onClick={() => setActiveSection(item.id)}
                className={`text-navigation shrink-0 rounded-full px-3 py-2.5 transition-colors md:px-4 ${
                  activeSection === item.id
                    ? "bg-brand-primary text-white"
                    : "text-ink hover:bg-canvas-soft"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div
              role="group"
              aria-label="Colour theme"
              className="hidden rounded-full bg-canvas-soft p-1 sm:flex"
            >
              <button
                type="button"
                aria-label="Use light theme"
                aria-pressed={theme === "light"}
                title="Use light theme"
                onClick={() => setTheme("light")}
                className={`rounded-full p-2 transition-colors motion-reduce:transition-none ${
                  theme === "light"
                    ? "bg-canvas text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                <Sun aria-hidden="true" size={17} weight="fill" />
              </button>
              <button
                type="button"
                aria-label="Use dark theme"
                aria-pressed={theme === "dark"}
                title="Use dark theme"
                onClick={() => setTheme("dark")}
                className={`rounded-full p-2 transition-colors motion-reduce:transition-none ${
                  theme === "dark"
                    ? "bg-canvas text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                <Moon aria-hidden="true" size={17} />
              </button>
            </div>
            <button
              type="button"
              aria-label="Search this workspace"
              title="Search this workspace"
              onClick={() => setSearchOpen(true)}
              className={iconButtonClass}
            >
              <MagnifyingGlass aria-hidden="true" size={18} />
            </button>
            <ActivityMenu />
            <ProfileMenu />
          </div>
        </nav>

        <div className="grid min-h-[calc(100vh-5rem)] md:grid-cols-[64px_minmax(0,1fr)]">
          <aside className="hidden border-r border-line px-2 py-6 md:flex md:flex-col md:items-center md:justify-between">
            <div className="grid gap-3">
              <Tooltip content="Search" side="right">
                <IconButton
                  label="Search this workspace"
                  onClick={() => setSearchOpen(true)}
                >
                  <MagnifyingGlass size={19} />
                </IconButton>
              </Tooltip>
              <Tooltip
                content={layersOpen ? "Hide map layers" : "Show map layers"}
                side="right"
              >
                <IconButton
                  label={layersOpen ? "Hide map layers" : "Show map layers"}
                  aria-pressed={layersOpen}
                  onClick={() => {
                    setLayersOpen((open) => !open);
                    document
                      .getElementById("map-workspace")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <MapTrifold size={19} />
                </IconButton>
              </Tooltip>
              <Tooltip content="Station data" side="right">
                <IconButton
                  label="Station data"
                  onClick={() =>
                    document
                      .getElementById("data-provenance")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  <Database size={19} />
                </IconButton>
              </Tooltip>
              <Tooltip content="Settings" side="right">
                <Link
                  href="/settings/profile"
                  aria-label="Settings"
                  className={iconButtonClass}
                >
                  <GearSix aria-hidden="true" size={19} />
                </Link>
              </Tooltip>
            </div>
            <Tooltip content="Help and limitations" side="right">
              <Link
                href="/methodology?from=/admin"
                aria-label="Help and limitations"
                className={iconButtonClass}
              >
                <Question aria-hidden="true" size={19} />
              </Link>
            </Tooltip>
          </aside>

          <div className="min-w-0 p-4 sm:p-6 lg:p-7">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-page-title tracking-[-0.03em]">
                  Admin research workspace
                </h1>
                <p className="text-navigation mt-1 text-muted">
                  NCR experimental flood-risk research workspace
                </p>
                <p className="text-metadata mt-2 text-muted" aria-live="polite">
                  {runNote}
                </p>
                {dataset ? (
                  <p className="text-metadata mt-1 text-muted">
                    Training dataset: {dataset.label} ·{" "}
                    {dataset.rows.toLocaleString()} city-days ·{" "}
                    {dataset.dateMin} → {dataset.dateMax}
                    {dataset.realRainFrom
                      ? ` · real ERA5 rain since ${dataset.realRainFrom}`
                      : ""}
                  </p>
                ) : datasetError ? (
                  <p className="text-metadata mt-1 text-warning">
                    Dataset unavailable: {datasetError}
                  </p>
                ) : (
                  <p className="text-metadata mt-1 text-muted">
                    Reading the dataset…
                  </p>
                )}
                <p className="text-metadata mt-1 text-muted">
                  <BuildStamp />
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
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
            </div>

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

            <div className="grid gap-3 min-[1180px]:grid-cols-[minmax(0,1.38fr)_minmax(410px,1fr)]">
              <RiverMap
                activeLayer={activeLayer}
                layersOpen={layersOpen}
                onLayerChange={setActiveLayer}
                onLayersClose={() => setLayersOpen(false)}
                className="min-[1180px]:sticky min-[1180px]:top-[5.5rem] z-0"
                cooperativeGestures
              />
              <div className="grid content-start gap-3">
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
                <RainfallChart location={location.name} limit={14} />
                <ModelContributionPanel locationCode={DEFAULT_LOCATION} />
                {/* Rendered even without a dataset: the header link, the search
                    entry, and the rail's "Station data" button all point at
                    this section, and `StationDetails` owns its own
                    "provenance unavailable" state. */}
                <StationDetails
                  dataset={dataset ?? undefined}
                  model={{ version: snapshot?.modelVersion ?? null }}
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-control border border-brand-secondary/25 bg-brand-secondary-soft px-4 py-3 text-brand-primary-ink">
              <ChartLineUp aria-hidden="true" size={18} />
              <p className="text-metadata">
                Experimental research output—verify official PAGASA and LGU
                sources before taking action.
              </p>
            </div>
          </div>
        </div>
      </div>
      {searchOpen ? (
        <DashboardSearch onClose={() => setSearchOpen(false)} />
      ) : null}
    </main>
  );
}
