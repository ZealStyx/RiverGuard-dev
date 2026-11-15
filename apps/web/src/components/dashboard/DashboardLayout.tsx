"use client";

import {
  ArrowClockwise,
  Bell,
  ChartLineUp,
  Database,
  GearSix,
  MagnifyingGlass,
  MapTrifold,
  Moon,
  Play,
  SignOut,
  Sun,
  UserCircle,
  WaveSine,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { RainfallChart } from "@/components/charts/RainfallChart";
import { RiverMap } from "@/components/map/RiverMap";
import { StationDetails } from "@/components/stations/StationDetails";
import { Button, IconButton, Tooltip } from "@/components/ui";
import type { MapLayerId } from "@/types";

import { ModelContributionPanel } from "./ModelContributionPanel";
import { RiskSummary } from "./RiskSummary";

const navigation = [
  { id: "dashboard", label: "Dashboard", href: "#dashboard" },
  { id: "map-workspace", label: "Map workspace", href: "#map-workspace" },
  { id: "historical-context", label: "History", href: "#historical-context" },
  { id: "data-provenance", label: "Data catalogue", href: "#data-provenance" },
  { id: "model-contribution", label: "Models", href: "#model-contribution" },
];

const railActions = [
  { label: "Search", Icon: MagnifyingGlass },
  { label: "Map layers", Icon: MapTrifold },
  { label: "Station data", Icon: Database },
  { label: "Settings", Icon: GearSix },
];

export function DashboardLayout() {
  const [activeLayer, setActiveLayer] = useState<MapLayerId>("base");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedDay, setSelectedDay] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [runNote, setRunNote] = useState("Updated Nov 11, 2026 · 09:40 PHT");

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
    setIsRunning(true);
    setRunNote("Updating view…");
    window.setTimeout(() => {
      setIsRunning(false);
      setRunNote("Updated just now");
    }, 700);
  }

  return (
    <main id="dashboard" className="min-h-screen bg-canvas">
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
          <div className="hidden items-center gap-2 lg:flex">
            <div className="flex rounded-full bg-canvas-soft p-1">
              <button
                type="button"
                aria-label="Use light theme"
                aria-pressed="true"
                className="rounded-full bg-white p-2 text-ink"
              >
                <Sun aria-hidden="true" size={17} weight="fill" />
              </button>
              <button
                type="button"
                aria-label="Use dark theme"
                aria-pressed="false"
                className="rounded-full p-2 text-muted"
              >
                <Moon aria-hidden="true" size={17} />
              </button>
            </div>
            <IconButton label="Notifications">
              <Bell size={18} />
            </IconButton>
            <IconButton label="Researcher profile">
              <UserCircle size={21} weight="duotone" />
            </IconButton>
          </div>
        </nav>

        <div className="grid min-h-[calc(100vh-5rem)] md:grid-cols-[64px_minmax(0,1fr)]">
          <aside className="hidden border-r border-line px-2 py-6 md:flex md:flex-col md:items-center md:justify-between">
            <div className="grid gap-3">
              {railActions.map(({ label, Icon }) => (
                <Tooltip key={label} content={label} side="right">
                  <IconButton label={label}>
                    <Icon size={19} />
                  </IconButton>
                </Tooltip>
              ))}
            </div>
            <Tooltip content="Sign out" side="right">
              <IconButton label="Sign out">
                <SignOut size={19} />
              </IconButton>
            </Tooltip>
          </aside>

          <div className="min-w-0 p-4 sm:p-6 lg:p-7">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-page-title tracking-[-0.03em]">
                  Researcher dashboard
                </h1>
                <p className="text-navigation mt-1 text-muted">
                  NCR experimental flood-risk research workspace
                </p>
                <p className="text-metadata mt-2 text-muted" aria-live="polite">
                  {runNote}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="small"
                  loading={isRunning}
                  loadingLabel="Refreshing preview"
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

            <div className="grid gap-3 min-[1180px]:grid-cols-[minmax(0,1.38fr)_minmax(410px,1fr)]">
              <RiverMap
                activeLayer={activeLayer}
                onLayerChange={setActiveLayer}
              />
              <div className="grid content-start gap-3">
                <RiskSummary
                  selectedDay={selectedDay}
                  onDayChange={setSelectedDay}
                />
                <RainfallChart />
                <ModelContributionPanel />
                <StationDetails />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-control border border-brand-secondary/25 bg-brand-secondary-soft px-4 py-3 text-brand-primary">
              <ChartLineUp aria-hidden="true" size={18} />
              <p className="text-metadata">
                Experimental research output—verify official PAGASA and LGU
                sources before taking action.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
