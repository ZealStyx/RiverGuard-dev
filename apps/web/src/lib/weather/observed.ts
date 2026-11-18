/**
 * The model's input state, derived in one place.
 *
 * Three callers need the same arithmetic: the Open-Meteo adapter, the offline
 * fixture, and the gauge blend that replaces individual days. They used to each
 * carry their own copy of the bucket constants, which is how a formula drifts
 * between providers without anyone noticing.
 *
 * The rules are the dataset's (`data/generate_dataset.py`), restated here so a
 * reader can check the numbers the model is fed:
 *
 *   - antecedent windows exclude today and nest (3 ≤ 7 ≤ 30);
 *   - soil moisture is a water-balance bucket: `soil += rain − ET0 − 0.08·soil`,
 *     clamped to 5–95 %, seeded at 55 and warmed over the whole window.
 *
 * A provider-reported soil moisture, when there is one, replaces the bucket —
 * `buildObserved` records which was used instead of hiding the substitution.
 */

import type {
  DailyWeatherPoint,
  ObservedWeather,
  SoilMoistureSource,
} from "./types";

export const SOIL_SEED = 55;
export const SOIL_MIN = 5;
export const SOIL_MAX = 95;
export const SOIL_DRAINAGE = 0.08;
/** Fallback reference evapotranspiration when the provider omits it. */
export const ET0_FALLBACK_MM = 3.8;

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Index of `asOf` in the window, or the last day when it is absent. */
export function asOfIndex(history: DailyWeatherPoint[], asOf: string): number {
  const index = history.findIndex((day) => day.date === asOf);
  return index === -1 ? Math.max(0, history.length - 1) : index;
}

/**
 * Today's rain and the 3/7/30-day totals before it.
 *
 * `ant7` is at least `ant3` and `ant30` at least `ant7`, because the ML service
 * rejects a reading whose windows do not nest. The guard is here rather than in
 * the caller so every provider gets it.
 */
export function antecedentSums(
  history: DailyWeatherPoint[],
  asOf: string,
): {
  rainfallTodayMm: number;
  antecedentRain3dMm: number;
  antecedentRain7dMm: number;
  antecedentRain30dMm: number;
} {
  const today = asOfIndex(history, asOf);
  const sum = (from: number, to: number) =>
    history
      .slice(Math.max(0, from), to + 1)
      .reduce((total, day) => total + day.rainfallMm, 0);

  const antecedent3 = sum(today - 3, today - 1);
  const antecedent7 = sum(today - 7, today - 1);
  const antecedent30 = sum(today - 30, today - 1);
  const todayRain = history[today]?.rainfallMm ?? 0;

  return {
    rainfallTodayMm: round1(todayRain),
    antecedentRain3dMm: round1(antecedent3),
    antecedentRain7dMm: round1(Math.max(antecedent3, antecedent7)),
    antecedentRain30dMm: round1(Math.max(antecedent7, antecedent30)),
  };
}

/** Water-balance bucket over the window, today inclusive. */
export function soilBucket(history: DailyWeatherPoint[], asOf: string): number {
  const today = asOfIndex(history, asOf);
  let soil = SOIL_SEED;
  for (let index = 0; index <= today; index += 1) {
    const day = history[index];
    const et0 =
      typeof day.et0Mm === "number" && Number.isFinite(day.et0Mm)
        ? day.et0Mm
        : ET0_FALLBACK_MM;
    soil = Math.min(
      SOIL_MAX,
      Math.max(SOIL_MIN, soil + day.rainfallMm - et0 - SOIL_DRAINAGE * soil),
    );
  }
  return round1(soil);
}

export interface BuildObservedOptions {
  /**
   * A provider-reported soil moisture for the issue day, 0–100 %. When it is
   * absent the bucket is used and the source says so.
   */
  soilMoisturePercent?: number | null;
  /** Days of the window that came from a gauge file. */
  gaugeDays?: number;
}

export function buildObserved(
  history: DailyWeatherPoint[],
  asOf: string,
  options: BuildObservedOptions = {},
): ObservedWeather {
  const gaugeDays = options.gaugeDays ?? 0;
  const reported = options.soilMoisturePercent;
  const hasReportedSoil =
    typeof reported === "number" && Number.isFinite(reported);
  const soilMoistureSource: SoilMoistureSource = hasReportedSoil
    ? "open-meteo"
    : "water-balance-bucket";

  return {
    ...antecedentSums(history, asOf),
    soilMoisturePercent: hasReportedSoil
      ? round1(Math.min(100, Math.max(0, reported)))
      : soilBucket(history, asOf),
    soilMoistureSource,
    rainfallSource: gaugeDays > 0 ? "gauge" : "provider",
    gaugeDays,
  };
}

/** Human phrase for the soil figure, for notices and status rows. */
export function describeSoilSource(source: SoilMoistureSource): string {
  return source === "open-meteo"
    ? "Open-Meteo soil moisture (0–7 cm, volumetric)"
    : "water-balance bucket (derived, no provider soil value)";
}
