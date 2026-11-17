export type MapLayerId = "base" | "experimental" | "static";

export type RiskLabel = "Elevated" | "Moderate" | "Lower" | "Unavailable";

export interface OutlookDay {
  /** Day-of-month, for the compact chip. */
  date: number;
  /** Short weekday, e.g. "Wed". */
  day: string;
  label: RiskLabel;
  /** ISO date, always present now that every day comes from a real source. */
  isoDate: string;
  /** Flood probability for that day, 0-1, when the model produced one. */
  probability?: number;
  /** Predicted water level in metres, when the model produced one. */
  waterLevelM?: number;
  /** First/second/third alarm crossing, when available. */
  alertLevel?: "none" | "first" | "second" | "third";
  /** Forecast rainfall for that day, mm. */
  rainfallMm?: number;
  /** Human-readable reason lines from the model or the climatology baseline. */
  reasons?: string[];
  /** True when the model probability crossed the tuned operating threshold. */
  exceedsOperatingThreshold?: boolean;
}

/** One observed (or derived) row from `data/daily_observations.csv`. */
export interface HistoricalReading {
  isoDate: string;
  /** Pre-formatted label, e.g. "Nov 12". */
  date: string;
  rainfall: number | null;
  waterLevel: number | null;
  waterLevelChange24h?: number | null;
  soilMoisture?: number | null;
  antecedent3d?: number | null;
  antecedent7d?: number | null;
  antecedent30d?: number | null;
  floodOccurrence?: number | null;
  riskLevel?: string;
  rainSource?: string;
  qualityStatus?: string;
  split?: string;
  stationId?: string;
}

/** A real model-attribution row from the ML service sensitivity sweep. */
export interface ModelContribution {
  label: string;
  /** Absolute change in flood probability when the input is swept to its range ends. */
  deltaProbability: number;
  deltaWaterLevelM: number;
  /** Bar width 0-100, scaled against the largest contribution in the set. */
  share: number;
  tone: "strong" | "medium" | "light";
}

export interface SupportedCity {
  id: "quezon-city" | "marikina" | "manila" | "pasig";
  name: string;
  status: "Available";
  selected?: boolean;
}

/** Dataset identity, mirroring `GET /api/dataset`. */
export interface DatasetMeta {
  label: string;
  file: string;
  rows: number;
  locations: string[];
  dateMin: string;
  dateMax: string;
  realRainFrom: string | null;
  rainSources: string[];
}

export interface MonthlyReading {
  month: string;
  rainfallMm: number;
  floodDays: number;
}
