import type {
  HistoricalReading,
  ModelContribution,
  OutlookDay,
  SupportedCity,
} from "@/types";

export const outlookDays: OutlookDay[] = [
  { day: "Wed", date: 11, label: "Elevated" },
  { day: "Thu", date: 12, label: "Moderate" },
  { day: "Fri", date: 13, label: "Moderate" },
  { day: "Sat", date: 14, label: "Lower" },
  { day: "Sun", date: 15, label: "Lower" },
  { day: "Mon", date: 16, label: "Moderate" },
  { day: "Tue", date: 17, label: "Lower" },
];

export const historicalReadings: HistoricalReading[] = [
  { date: "Nov 5", rainfall: 7, waterLevel: 14.8 },
  { date: "Nov 6", rainfall: 9, waterLevel: 14.9 },
  { date: "Nov 7", rainfall: 16, waterLevel: 15.1 },
  { date: "Nov 8", rainfall: 28, waterLevel: 15.4 },
  { date: "Nov 9", rainfall: 48, waterLevel: 15.8 },
  { date: "Nov 10", rainfall: 82, waterLevel: 16.4 },
  { date: "Nov 11", rainfall: 36, waterLevel: 15.9 },
];

export const modelContributions: ModelContribution[] = [
  { label: "Rainfall forecast", value: 73, tone: "strong" },
  { label: "River basin response", value: 43, tone: "medium" },
  { label: "Antecedent wetness", value: 24, tone: "light" },
];

export const supportedCities: SupportedCity[] = [
  {
    id: "quezon-city",
    name: "Quezon City",
    status: "Available",
  },
  {
    id: "marikina",
    name: "Marikina",
    status: "Available",
    selected: true,
  },
  {
    id: "manila",
    name: "Manila",
    status: "Available",
  },
  {
    id: "pasig",
    name: "Pasig",
    status: "Available",
  },
];

export const provenanceRows = [
  ["Source", "Unverified development dataset (research use only)"],
  ["Model", "RG-NCR v0.4 (experimental)"],
  ["Retrieved", "Wed, Nov 11, 2026 · 09:40 AM (PHT)"],
  ["Data quality", "Sample data; not validated for operational use."],
  [
    "Limitations",
    "City-level only; coarse resolution; experimental model; not for decision-making.",
  ],
] as const;
