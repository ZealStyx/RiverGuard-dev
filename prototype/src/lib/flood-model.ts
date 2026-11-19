/**
 * Baha scoring model.
 * Weather for one day goes in. A 0–100 flood index comes out.
 * The 72-hour call blends today, tomorrow, and the day after.
 * Towns scale that call by how exposed they are to the lake and the rivers.
 */

export type ForecastDay = {
  id: string;
  weekday: string;
  dateLabel: string;
  rainfallMm: number;
  peakMmHr: number;
  riverStageM: number;
  soilPct: number;
  lakeRiseM: number;
};

export type PartKey = "rainfall" | "peak" | "river" | "soil" | "lake";

export type Weights = Record<PartKey, number>;

export type Scales = {
  rainfallMm: number;
  peakMmHr: number;
  riverStageM: number;
  lakeRiseM: number;
};

export type Thresholds = {
  watch: number;
  warning: number;
  critical: number;
};

export type ModelConfig = {
  weights: Weights;
  scales: Scales;
  thresholds: Thresholds;
};

export type Level = "low" | "watch" | "warning" | "critical";

export const HORIZON_BLEND = [0.5, 0.3, 0.2] as const;

export const PARTS: {
  key: PartKey;
  label: string;
  unit: string;
  blurb: string;
}[] = [
  {
    key: "rainfall",
    label: "Rainfall",
    unit: "mm",
    blurb: "Total rain expected in that 24 hours.",
  },
  {
    key: "peak",
    label: "Peak rate",
    unit: "mm/h",
    blurb: "The strongest single hour. Bursts overwhelm drains before the daily total looks bad.",
  },
  {
    key: "river",
    label: "River stage",
    unit: "m",
    blurb: "Meters above a normal stage, not above the sea.",
  },
  {
    key: "soil",
    label: "Soil",
    unit: "%",
    blurb: "How full the ground already is. At 100 it cannot take more water.",
  },
  {
    key: "lake",
    label: "Lake rise",
    unit: "m",
    blurb: "Laguna de Bay, in meters above the 10.5 m reference. A high lake slows every outlet.",
  },
];

export const SCALE_FIELDS: {
  key: keyof Scales;
  part: Exclude<PartKey, "soil">;
  label: string;
  unit: string;
  blurb: string;
}[] = [
  {
    key: "rainfallMm",
    part: "rainfall",
    label: "Extreme day of rain",
    unit: "mm",
    blurb: "A day this wet scores full on the rainfall piece.",
  },
  {
    key: "peakMmHr",
    part: "peak",
    label: "Extreme hourly burst",
    unit: "mm/h",
    blurb: "A burst this strong scores full on the peak piece.",
  },
  {
    key: "riverStageM",
    part: "river",
    label: "Extreme river stage",
    unit: "m",
    blurb: "Stage this far above normal scores full on the river piece.",
  },
  {
    key: "lakeRiseM",
    part: "lake",
    label: "Extreme lake rise",
    unit: "m",
    blurb: "A lake this far above 10.5 m scores full on the lake piece.",
  },
];

const PART_STORY: Record<PartKey, string> = {
  rainfall: "24-hour rainfall",
  peak: "intense hourly bursts",
  river: "rivers already running high",
  soil: "saturated ground",
  lake: "a high Laguna de Bay",
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function unit(value: number, scale: number) {
  if (scale <= 0) return 0;
  return clamp(value / scale, 0, 1);
}

export function roundIndex(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

export function dayParts(day: ForecastDay, config: ModelConfig) {
  const { weights, scales } = config;
  const weighted: Record<PartKey, number> = {
    rainfall: unit(day.rainfallMm, scales.rainfallMm) * weights.rainfall,
    peak: unit(day.peakMmHr, scales.peakMmHr) * weights.peak,
    river: unit(day.riverStageM, scales.riverStageM) * weights.river,
    soil: unit(day.soilPct, 100) * weights.soil,
    lake: unit(day.lakeRiseM, scales.lakeRiseM) * weights.lake,
  };
  const wsum =
    weights.rainfall + weights.peak + weights.river + weights.soil + weights.lake;
  const factor = wsum > 0 ? 100 / wsum : 0;
  const points = {
    rainfall: weighted.rainfall * factor,
    peak: weighted.peak * factor,
    river: weighted.river * factor,
    soil: weighted.soil * factor,
    lake: weighted.lake * factor,
  };
  const score = points.rainfall + points.peak + points.river + points.soil + points.lake;
  return { points, score };
}

export function horizon(days: ForecastDay[], config: ModelConfig) {
  const points: Record<PartKey, number> = {
    rainfall: 0,
    peak: 0,
    river: 0,
    soil: 0,
    lake: 0,
  };
  const daily: number[] = [];
  let score = 0;
  let blendSum = 0;

  days.forEach((day, index) => {
    const part = dayParts(day, config);
    daily.push(part.score);
    const blend = HORIZON_BLEND[index];
    if (blend == null) return;
    blendSum += blend;
    score += part.score * blend;
    (Object.keys(points) as PartKey[]).forEach((key) => {
      points[key] += part.points[key] * blend;
    });
  });

  if (blendSum > 0) {
    score /= blendSum;
    (Object.keys(points) as PartKey[]).forEach((key) => {
      points[key] /= blendSum;
    });
  }

  return { score, points, daily };
}

export function townIndex(provincial: number, susceptibility: number) {
  return clamp(provincial * susceptibility, 0, 100);
}

export function levelOf(score: number, thresholds: Thresholds): Level {
  if (score >= thresholds.critical) return "critical";
  if (score >= thresholds.warning) return "warning";
  if (score >= thresholds.watch) return "watch";
  return "low";
}

export function levelLabel(level: Level) {
  if (level === "low") return "Low";
  if (level === "watch") return "Watch";
  if (level === "warning") return "Warning";
  return "Critical";
}

export function verdictTitle(level: Level) {
  if (level === "critical") return "Flooding is likely";
  if (level === "warning") return "Flooding is possible";
  if (level === "watch") return "No flood call yet";
  return "No flood signal";
}

export function leadingKey(points: Record<PartKey, number>): PartKey {
  return (Object.keys(points) as PartKey[]).reduce((best, key) =>
    points[key] > points[best] ? key : best,
  );
}

export function callNarrative(
  level: Level,
  points: Record<PartKey, number>,
  topTowns: string[],
) {
  const story = PART_STORY[leadingKey(points)];
  const place = topTowns.length ? ` Hottest on the desk: ${topTowns.join(", ")}.` : "";
  if (level === "low") {
    return `No flood call. The largest piece of a small index is ${story}, and it stays under Watch.`;
  }
  if (level === "watch") {
    return `Not a flood call yet. The index is being lifted by ${story}.${place}`;
  }
  if (level === "warning") {
    return `Flooding is possible on low ground if this forecast verifies. The call is led by ${story}.${place}`;
  }
  return `Flooding is likely along the lakeshore and the river mouths. The call is led by ${story}.${place}`;
}

export function confidenceOf(score: number, thresholds: Thresholds) {
  const dist = Math.min(
    Math.abs(score - thresholds.watch),
    Math.abs(score - thresholds.warning),
    Math.abs(score - thresholds.critical),
  );
  if (dist < 6) {
    return {
      label: "Soft" as const,
      note: "The index sits near a threshold. A small forecast change can flip the call.",
    };
  }
  if (dist < 14) {
    return {
      label: "Steady" as const,
      note: "The call holds unless a whole rain band is added or taken out.",
    };
  }
  return {
    label: "Firm" as const,
    note: "The index is well clear of the nearest threshold.",
  };
}

export function smsText(level: Level, score: number, names: string[]) {
  const who = names.slice(0, 3).join(", ") || "no town";
  return `BAHA Laguna: ${levelLabel(level).toUpperCase()} next 72h. Index ${score}. Highest: ${who}. Prototype, not a PAGASA warning.`;
}
