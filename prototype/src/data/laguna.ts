import type { ForecastDay, Scales, Thresholds, Weights } from "../lib/flood-model";

/**
 * Sample desk for Laguna.
 * Edit the presets, the town list, or the default weights.
 * The pages read this file and nothing else for place and weather.
 */

export const ISSUE_LABEL = "Sample issue · Fri 6 Nov 2026";

export const DEFAULT_WEIGHTS: Weights = {
  rainfall: 0.34,
  peak: 0.14,
  river: 0.22,
  soil: 0.16,
  lake: 0.14,
};

export const DEFAULT_SCALES: Scales = {
  rainfallMm: 160,
  peakMmHr: 45,
  riverStageM: 2.4,
  lakeRiseM: 2,
};

export const DEFAULT_THRESHOLDS: Thresholds = {
  watch: 32,
  warning: 52,
  critical: 72,
};

const WEEK: Pick<ForecastDay, "id" | "weekday" | "dateLabel">[] = [
  { id: "d0", weekday: "Fri", dateLabel: "6 Nov" },
  { id: "d1", weekday: "Sat", dateLabel: "7 Nov" },
  { id: "d2", weekday: "Sun", dateLabel: "8 Nov" },
  { id: "d3", weekday: "Mon", dateLabel: "9 Nov" },
  { id: "d4", weekday: "Tue", dateLabel: "10 Nov" },
  { id: "d5", weekday: "Wed", dateLabel: "11 Nov" },
  { id: "d6", weekday: "Thu", dateLabel: "12 Nov" },
];

function days(rows: [number, number, number, number, number][]): ForecastDay[] {
  return WEEK.map((day, index) => {
    const [rainfallMm, peakMmHr, riverStageM, soilPct, lakeRiseM] = rows[index];
    return { ...day, rainfallMm, peakMmHr, riverStageM, soilPct, lakeRiseM };
  });
}

export type Preset = {
  id: string;
  name: string;
  blurb: string;
  days: ForecastDay[];
};

export const PRESETS: Preset[] = [
  {
    id: "habagat",
    name: "Habagat",
    blurb: "A wet southwest monsoon. Heavy rain Saturday and Sunday, with rivers and the lake climbing behind it.",
    days: days([
      [68, 24, 0.9, 84, 0.85],
      [125, 40, 1.6, 92, 1.15],
      [140, 42, 2.0, 96, 1.45],
      [60, 18, 1.6, 92, 1.55],
      [24, 8, 1.15, 84, 1.4],
      [8, 3, 0.7, 76, 1.2],
      [4, 2, 0.4, 70, 1.05],
    ]),
  },
  {
    id: "lake",
    name: "High lake",
    blurb: "Rain is only moderate. Laguna de Bay is already high, so water has nowhere to go.",
    days: days([
      [28, 10, 0.8, 90, 1.55],
      [36, 14, 1.1, 95, 1.85],
      [18, 8, 1.0, 93, 1.9],
      [12, 5, 0.8, 90, 1.8],
      [8, 3, 0.6, 86, 1.65],
      [5, 2, 0.4, 80, 1.5],
      [2, 1, 0.3, 74, 1.35],
    ]),
  },
  {
    id: "quiet",
    name: "Quiet week",
    blurb: "Light rain, rivers near normal, the lake close to its reference.",
    days: days([
      [4, 2, 0.15, 48, 0.1],
      [8, 3, 0.2, 52, 0.12],
      [3, 1, 0.15, 50, 0.1],
      [1, 1, 0.1, 46, 0.08],
      [0, 0, 0.1, 44, 0.08],
      [2, 1, 0.1, 45, 0.1],
      [6, 2, 0.15, 48, 0.12],
    ]),
  },
];

export const GROUPS = ["West shore", "South basin", "East delta", "Inland"] as const;

export type TownGroup = (typeof GROUPS)[number];

export type Town = {
  slug: string;
  name: string;
  group: TownGroup;
  susceptibility: number;
  water: string;
  note: string;
  detail: string;
};

export const TOWNS: Town[] = [
  {
    slug: "san-pedro",
    name: "San Pedro",
    group: "West shore",
    susceptibility: 1.12,
    water: "Lake edge and city drains",
    note: "Dense barangays where the lake and the drains rise together.",
    detail:
      "San Pedro sits on the northwest corner of Laguna de Bay. Flooding here is usually urban water that cannot leave because the lake is already up, not a river overtopping a bank.",
  },
  {
    slug: "binan",
    name: "Biñan",
    group: "West shore",
    susceptibility: 1.16,
    water: "Lakeshore villages",
    note: "Low industrial and housing pockets that hold water once the lake is high.",
    detail:
      "Biñan’s lakeshore barangays flood when habagat rain meets a lake that is already above its usual line. Water stays in the streets after the rain has eased.",
  },
  {
    slug: "santa-rosa",
    name: "Santa Rosa",
    group: "West shore",
    susceptibility: 1.2,
    water: "Santa Rosa River",
    note: "The river and the lakeshore villages. Urban runoff arrives fast.",
    detail:
      "Santa Rosa floods from two directions: quick runoff in the built-up center, and the Santa Rosa River as it slows near the lake. A high lake makes the river’s exit worse.",
  },
  {
    slug: "cabuyao",
    name: "Cabuyao",
    group: "West shore",
    susceptibility: 1.14,
    water: "Diezmo and the lake flats",
    note: "Lakeshore barangays and the river flats south of the city.",
    detail:
      "Cabuyao’s trouble spots are the low flats toward the lake. Moderate rain is manageable until the lake rise blocks the outlets.",
  },
  {
    slug: "calamba",
    name: "Calamba",
    group: "West shore",
    susceptibility: 1.28,
    water: "San Juan River mouth",
    note: "A primary watch town. The San Juan River meets the lake here.",
    detail:
      "Calamba floods at the San Juan River mouth and along the lake edge. It is one of the first west-shore towns to cross Warning when both rain and the lake are up.",
  },
  {
    slug: "los-banos",
    name: "Los Baños",
    group: "South basin",
    susceptibility: 1.18,
    water: "Molawin creek",
    note: "Campus lowlands. Flash rain, then lake backflow.",
    detail:
      "Los Baños takes fast water off the slopes through Molawin and the creeks, then slow water from the lake. The low campus and shore barangays feel both.",
  },
  {
    slug: "bay",
    name: "Bay",
    group: "South basin",
    susceptibility: 1.34,
    water: "Open lake edge",
    note: "One of the lowest shores. Standing water when the lake is up.",
    detail:
      "Bay is flat against Laguna de Bay. It does not need a cloudburst to flood. A high lake alone puts water into the shore barangays and the fields behind them.",
  },
  {
    slug: "calauan",
    name: "Calauan",
    group: "South basin",
    susceptibility: 1.22,
    water: "Farm basin",
    note: "Agricultural basin that drains slowly toward the lake.",
    detail:
      "Calauan holds water in the fields. Once the soil is full and the lake is high, the basin drains late, so the flood outlasts the rain.",
  },
  {
    slug: "victoria",
    name: "Victoria",
    group: "South basin",
    susceptibility: 1.16,
    water: "Narrow shore strip",
    note: "Fields flood before the town proper.",
    detail:
      "Victoria’s lake edge is a thin strip of fields and barangays. The index runs above the province, but the water usually shows in the fields first.",
  },
  {
    slug: "pila",
    name: "Pila",
    group: "South basin",
    susceptibility: 1.14,
    water: "Approach to the delta",
    note: "Lakeshore town on the way toward the Santa Cruz delta.",
    detail:
      "Pila sits between the south basin and the Pagsanjan River delta. It feels the lake first, then any surge coming down toward Santa Cruz.",
  },
  {
    slug: "santa-cruz",
    name: "Santa Cruz",
    group: "East delta",
    susceptibility: 1.3,
    water: "Pagsanjan River delta",
    note: "The capital. Low barangays on the river delta.",
    detail:
      "Santa Cruz is the provincial capital and a delta town. The Pagsanjan River and the lake meet in the low barangays. It is on the short list whenever the 72-hour call is Warning or higher.",
  },
  {
    slug: "lumban",
    name: "Lumban",
    group: "East delta",
    susceptibility: 1.24,
    water: "River town",
    note: "Upstream of Santa Cruz. The stage rises here early.",
    detail:
      "Lumban is a river town between Pagsanjan and Santa Cruz. Watch the river piece of the model: Lumban feels stage before it feels the lake.",
  },
  {
    slug: "pagsanjan",
    name: "Pagsanjan",
    group: "East delta",
    susceptibility: 1.05,
    water: "Gorge and river",
    note: "More flash flood than lake, but the outlet still matters.",
    detail:
      "Pagsanjan sits higher in the gorge. Its floods are quicker and more about intense rain than about Laguna de Bay. The susceptibility is near the provincial line on purpose.",
  },
  {
    slug: "paete",
    name: "Paete",
    group: "East delta",
    susceptibility: 1.12,
    water: "Lakeshore road",
    note: "The shore and the road flood before the slope does.",
    detail:
      "Paete climbs off the lake. The hazard is the shore road and the first row of houses, not the upper town. A high lake is the piece to watch.",
  },
  {
    slug: "siniloan",
    name: "Siniloan",
    group: "East delta",
    susceptibility: 1.18,
    water: "Northern river mouth",
    note: "Northern lake edge, where the river meets the bay.",
    detail:
      "Siniloan marks the northern end of this desk. River water and the lake meet at the mouth, so both the river piece and the lake piece move the town.",
  },
  {
    slug: "san-pablo",
    name: "San Pablo",
    group: "Inland",
    susceptibility: 0.64,
    water: "Crater lakes, not the bay",
    note: "Higher ground. Local water, not a bay flood.",
    detail:
      "San Pablo is the inland control on this desk. It can flood locally around the crater lakes, but it does not take Laguna de Bay’s rise. The model keeps it well under the shore towns.",
  },
];

export function presetById(id: string) {
  return PRESETS.find((preset) => preset.id === id) ?? null;
}

export function townBySlug(slug: string) {
  return TOWNS.find((town) => town.slug === slug) ?? null;
}
