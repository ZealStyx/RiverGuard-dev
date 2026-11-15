export type MapLayerId = "base" | "experimental" | "static";

export interface OutlookDay {
  date: number;
  day: string;
  label: "Elevated" | "Moderate" | "Lower" | "Unavailable";
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
