export type ProductRole = "lgu" | "resident" | "researcher" | "admin";

export type AdminCapability =
  | "research.read"
  | "research.runForecast"
  | "research.reviewModels"
  | "governance.manageUsers"
  | "governance.configureSystem"
  | "governance.viewAudit";

export interface NavigationItem {
  href: string;
  label: string;
  shortLabel?: string;
  capability?: AdminCapability;
}

export interface RoleDefinition {
  description: string;
  label: string;
  location: string;
  navigation: NavigationItem[];
}

export const roleCapabilities: Record<ProductRole, readonly AdminCapability[]> =
  {
    lgu: [],
    resident: [],
    researcher: [
      "research.read",
      "research.runForecast",
      "research.reviewModels",
    ],
    admin: [
      "governance.manageUsers",
      "governance.configureSystem",
      "governance.viewAudit",
    ],
  };

export function can(role: ProductRole, capability: AdminCapability): boolean {
  return roleCapabilities[role].includes(capability);
}

export const roleDefinitions: Record<ProductRole, RoleDefinition> = {
  lgu: {
    label: "LGU operator",
    location: "Marikina",
    description:
      "Review assigned-area outlooks and record controlled assessments.",
    navigation: [
      { label: "Overview", href: "/lgu" },
      {
        label: "Outlook & map",
        shortLabel: "Outlook",
        href: "/lgu/outlook",
      },
      {
        label: "Reviews & alerts",
        shortLabel: "Reviews",
        href: "/lgu/reviews",
      },
    ],
  },
  resident: {
    label: "Resident",
    location: "Marikina",
    description:
      "Review a simplified experimental outlook and official sources.",
    navigation: [
      { label: "My outlook", shortLabel: "Outlook", href: "/resident" },
      {
        label: "Locations & hazard",
        shortLabel: "Locations",
        href: "/resident/locations",
      },
    ],
  },
  researcher: {
    label: "Researcher",
    location: "NCR research workspace",
    description:
      "Inspect model inputs, forecasts, evaluation evidence, and stored research runs.",
    navigation: [
      {
        label: "Forecast workspace",
        shortLabel: "Workspace",
        href: "/researcher",
      },
      {
        label: "Forecast history",
        shortLabel: "History",
        href: "/researcher/runs",
      },
      {
        label: "Model & data",
        shortLabel: "Model",
        href: "/researcher/models",
      },
    ],
  },
  admin: {
    label: "Administrator",
    location: "RiverGuard system",
    description:
      "Manage approved users, supported locations, system configuration, and audit evidence.",
    navigation: [
      { label: "System overview", shortLabel: "Overview", href: "/admin" },
      {
        label: "Users & access",
        shortLabel: "Users",
        href: "/admin/users",
        capability: "governance.manageUsers",
      },
      {
        label: "Configuration",
        shortLabel: "Configure",
        href: "/admin/locations",
        capability: "governance.configureSystem",
      },
      {
        label: "Audit log",
        shortLabel: "Audit",
        href: "/admin/audit",
        capability: "governance.viewAudit",
      },
    ],
  },
};

/**
 * The rest of this file describes what the running system can actually prove.
 *
 * Everything below used to be a literal: "RG-NCR-041", "Nov 11, 09:40", three
 * named staff, a three-row review queue. None of it came from anywhere, so the
 * screens looked populated while nothing had happened. Those tables are gone.
 *
 * What remains is either a type, a static catalogue of supported cities (which
 * does exist — see lib/locations.ts), or a helper that derives a row set from
 * the real dataset and the trained model artifacts. Screens that have no real
 * source show an empty state instead.
 */

import type { DatasetMeta, ModelContribution } from "@/types";

import { LOCATION_CODES, LOCATIONS } from "@/lib/locations";
import type {
  ModelArtifactSummary,
  ModelMetricsSummary,
} from "@/lib/ml-artifacts";

export interface RunHistoryRow extends Record<string, string> {
  run: string;
  created: string;
  location: string;
  model: string;
  status: string;
  warning: string;
}

export interface DataSourceRow {
  id: string;
  name: string;
  provider: string;
  coverage: string;
  /** What the application actually uses this source for. */
  role: string;
  status: string;
}

export interface ModelVersionRow {
  id: string;
  name: string;
  responsibility: string;
  validation: string;
  status: string;
}

export interface LocationRow {
  name: string;
  support: string;
  status: string;
  updated: string;
}

/** Supported cities, from the one table that defines them. */
export const supportedLocations: LocationRow[] = LOCATION_CODES.map((code) => ({
  name: LOCATIONS[code].name,
  support: "Supported",
  // No outlook has been run for these rows yet; see `outlookRowsFromSnapshot`.
  status: "No run",
  updated: "—",
}));

/**
 * A stored run, as the screens need it.
 *
 * `forecastRuns` previously carried four invented run IDs. Runs only exist when
 * someone presses "Run forecast" and Convex stores the result, so this is a
 * mapping function rather than a constant.
 */
export function runHistoryRows(
  runs: Array<{
    runId: string;
    requestedAt: number;
    completedAt: number | null;
    status: string;
    locations: string[];
    days: number;
    alerts: number;
    modelVersion: string | null;
  }>,
): RunHistoryRow[] {
  return runs.map((run) => ({
    run: run.runId,
    created: new Date(run.requestedAt).toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Manila",
    }),
    location: run.locations.length ? run.locations.join(", ") : "—",
    model: run.modelVersion ?? "unknown",
    status:
      run.status === "completed"
        ? `Complete · ${run.days} day(s)`
        : run.status === "failed"
          ? "Failed"
          : "In progress",
    warning: run.alerts > 0 ? `${run.alerts} elevated day(s)` : "None",
  }));
}

/**
 * Data sources, derived from the dataset that is actually on disk.
 *
 * The previous list named a "weather forecast" provider as "Provider pending"
 * and a hazard layer as "Unavailable" — both stale guesses. These rows describe
 * what the code reads today, and `role` says what each one is for: the CSV trains
 * the model and backs the historical charts, the weather provider is the only
 * input a forecast run is scored from, and the basemap is display only.
 */
export function dataSourceRows(
  dataset: DatasetMeta | null,
  provider?: string | null,
): DataSourceRow[] {
  return [
    {
      id: "daily-rainfall",
      name: "NCR daily observations (dataset v2)",
      provider: "RiverGuard research dataset",
      role: "Model training + historical charts",
      coverage: dataset
        ? `${dataset.dateMin} → ${dataset.dateMax} · ${dataset.rows.toLocaleString()} city-days`
        : "Unavailable",
      status: dataset
        ? `${dataset.locations.length} cities · ERA5 rain from ${dataset.realRainFrom ?? "n/a"}`
        : "Unreadable",
    },
    {
      id: "weather-forecast",
      name: "Daily weather forecast",
      provider: provider ?? "Not yet called in this session",
      role: "Model input at run time",
      coverage: "Next 14 days per city point",
      status: provider
        ? provider === "open-meteo"
          ? "Live"
          : "Degraded — offline fallback"
        : "Run a forecast to resolve",
    },
    {
      id: "city-boundaries",
      name: "NCR city boundaries",
      provider: "OpenStreetMap raster tiles",
      role: "Map display only",
      coverage: "Four supported cities",
      status: "Basemap only — no hazard polygons",
    },
  ];
}

/** Model versions, derived from `ml/artifacts/model.json` + `metrics.json`. */
export function modelVersionRows(
  model: ModelArtifactSummary | null,
  metrics: ModelMetricsSummary | null,
): ModelVersionRow[] {
  if (!model) {
    return [
      {
        id: "unavailable",
        name: "No model artifacts",
        responsibility: "Train the model to populate this table",
        validation: "ml/artifacts/model.json is missing",
        status: "Unavailable",
      },
    ];
  }

  const alarmCities = model.cities
    .map(
      (city) =>
        `${city.name}: ${city.alarmLevelsM.join("/")} m${city.alarmsVerified ? "" : " (indicative)"}`,
    )
    .join(" · ");

  return [
    {
      id: model.version,
      name: `${model.name} ${model.version}`,
      responsibility: model.kind,
      validation: metrics
        ? `Test ${metrics.samples.test.toLocaleString()} rows · AP ${metrics.classifier.averagePrecision.toFixed(3)} · ROC-AUC ${metrics.classifier.rocAuc.toFixed(4)} · Brier ${metrics.classifier.brier.toFixed(4)}`
        : "Metrics file missing",
      status: "Experimental",
    },
    {
      id: "alarm-levels",
      name: "Alarm thresholds",
      responsibility: alarmCities,
      validation: metrics
        ? `Operating threshold ${model.operatingThreshold.toFixed(4)} · tuned on ${model.thresholdTunedOn}`
        : `Operating threshold ${model.operatingThreshold.toFixed(4)}`,
      status: "Indicative unless marked verified",
    },
    {
      id: "model-caveat",
      name: "Known limitation",
      responsibility: metrics?.caveat || model.warning,
      validation: metrics
        ? `Test precision ${metrics.classifier.precision.toFixed(3)} · recall ${metrics.classifier.recall.toFixed(3)} · ${metrics.classifier.falsePositives} false alarms of ${metrics.classifier.truePositives + metrics.classifier.falsePositives} flags`
        : "No test metrics",
      status: "Research use only",
    },
  ];
}

/** Attribution rows, when a sweep has been run. Never a placeholder set. */
export function contributionRows(
  contributions: ModelContribution[] | null,
): ModelContribution[] {
  return contributions ?? [];
}
