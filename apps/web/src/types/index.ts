export type MapLayerId = "base" | "experimental" | "static";

export interface OutlookDay {
  date: number;
  day: string;
  label: "Elevated" | "Moderate" | "Lower" | "Unavailable";
  /** ISO date when the row came from a real forecast run rather than the static placeholder. */
  isoDate?: string;
  /** Flood probability for that day, 0-1, when available. */
  probability?: number;
  /** Predicted water level in metres, when available. */
  waterLevelM?: number;
  /** First/second/third alarm crossing, when available. */
  alertLevel?: "none" | "first" | "second" | "third";
}

export interface HistoricalReading {
  date: string;
  rainfall: number;
  waterLevel: number;
}

export interface ModelContribution {
  label: string;
  value: number;
  tone: "strong" | "medium" | "light";
}

export interface SupportedCity {
  id: "quezon-city" | "marikina" | "manila" | "pasig";
  name: string;
  status: "Available";
  selected?: boolean;
}
