/**
 * Turning stored observation days into chart readings, without inventing any.
 *
 * The history chart plots two things per day:
 *
 *   - rainfall, which a provider reports directly;
 *   - a *derived* water-level proxy, because no gauge series exists for these
 *     rivers. `data/generate_dataset.py` defines that proxy as
 *
 *         det = 0.006·Ant7 + 0.018·Rain + 0.004·Ant3 + ((Alarm3 − Alarm1)/40000)·Rain²
 *         base = Alarm1 − p98(det over the city's history)
 *         WL   = base + det  (+ N(0, 0.10) m noise in the generator)
 *
 * so live days can be placed on the same scale as the dataset's rows: the
 * formula is the published one, the datum is calibrated from the dataset's own
 * rows, and only the noise term is dropped (a derived proxy should not jitter
 * because of a random number generator running in a different process).
 *
 * Everything here is pure: no filesystem, no clock. The route supplies the CSV
 * rows and the stored days.
 */

import type { StoredObservationDay } from "./observation-store";

/** The columns of a dataset row this module needs. */
export interface HistoryRow {
  date: string;
  rainfallMm: number | null;
  antecedentRain3dMm: number | null;
  antecedentRain7dMm: number | null;
  /** The dataset's own derived level, used only to chain the 24-hour change. */
  waterLevelM?: number | null;
}

export interface DerivedObservationDay extends StoredObservationDay {
  antecedentRain3dMm: number | null;
  antecedentRain7dMm: number | null;
  antecedentRain30dMm: number | null;
  waterLevelM: number | null;
  waterLevelChange24hM: number | null;
}

export interface DerivationResult {
  days: DerivedObservationDay[];
  /** The calibrated datum, or `null` when the dataset was too thin to set one. */
  waterLevelDatumM: number | null;
  /** How many dataset rows the datum was calibrated on. */
  calibrationRows: number;
}

/** The generator's storm term, reproduced exactly. */
function det(
  rainfallMm: number,
  antecedent3dMm: number,
  antecedent7dMm: number,
  alarms: readonly [number, number, number],
): number {
  const stormGain = (alarms[2] - alarms[0]) / 40000;
  return (
    0.006 * antecedent7dMm +
    0.018 * rainfallMm +
    0.004 * antecedent3dMm +
    stormGain * rainfallMm * rainfallMm
  );
}

/**
 * Linear-interpolated percentile, the same definition numpy uses by default, so
 * a datum computed here matches one computed in `data/generate_dataset.py`.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const position = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Minimum rows before the datum is trusted; a season is 90. */
const MIN_CALIBRATION_ROWS = 90;

/**
 * Datum per city: shift the dataset's proxy so that Alarm 1 sits at its 98th
 * percentile, which is what makes "Alarm 1 is exceeded on ~2% of days" true.
 */
export function calibrateWaterLevelDatum(
  rows: HistoryRow[],
  alarms: readonly [number, number, number],
): number | null {
  const dets = rows
    .filter(
      (row) =>
        typeof row.rainfallMm === "number" &&
        typeof row.antecedentRain3dMm === "number" &&
        typeof row.antecedentRain7dMm === "number",
    )
    .map((row) =>
      det(
        row.rainfallMm as number,
        row.antecedentRain3dMm as number,
        row.antecedentRain7dMm as number,
        alarms,
      ),
    );

  if (dets.length < MIN_CALIBRATION_ROWS) return null;
  const p98 = percentile(dets, 98);
  if (!Number.isFinite(p98)) return null;
  return alarms[0] - p98;
}

/**
 * Derive the chart fields for stored days.
 *
 * `history` is the dataset series for the same city (any length; only its last
 * 30 rain values are used for the windows, and all of it for the datum).
 * `previousWaterLevelM` is the dataset's last derived value, so the 24-hour
 * change on the first live day is continuous with the CSV.
 */
export function deriveObservationDays(
  history: HistoryRow[],
  liveDays: StoredObservationDay[],
  alarms: readonly [number, number, number],
): DerivationResult {
  if (liveDays.length === 0) {
    return { days: [], waterLevelDatumM: null, calibrationRows: 0 };
  }

  const datum = calibrateWaterLevelDatum(history, alarms);
  const calibrationRows = history.filter(
    (row) => typeof row.rainfallMm === "number",
  ).length;

  const rainByDate = new Map<string, number>();
  for (const row of history) {
    if (row.date && typeof row.rainfallMm === "number") {
      rainByDate.set(row.date, row.rainfallMm);
    }
  }
  for (const day of liveDays) rainByDate.set(day.date, day.rainfallMm);

  // The change is only honest between consecutive calendar days: if the dataset
  // ends on 2026-11-14 and the first stored day is 2026-11-17, subtracting the
  // two would report three days of change as one.
  let last = historyLevel(history);

  const windowSum = (date: string, days: number): number | null => {
    const end = Date.parse(`${date}T00:00:00Z`);
    if (!Number.isFinite(end)) return null;
    let total = 0;
    let seen = 0;
    for (let offset = 1; offset <= days; offset += 1) {
      const key = new globalThis.Date(end - offset * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const rain = rainByDate.get(key);
      if (rain === undefined) continue;
      total += rain;
      seen += 1;
    }
    // A window with holes is a smaller number, not a smaller antecedent. The
    // provider's window is contiguous, so this only drops the first stored day
    // when the dataset does not reach back far enough to fill its window.
    return seen === days ? round1(total) : null;
  };

  const days = liveDays.map((day) => {
    const ant3 = windowSum(day.date, 3);
    const ant7 = windowSum(day.date, 7);
    const ant30 = windowSum(day.date, 30);

    const waterLevelM =
      datum === null || ant3 === null || ant7 === null
        ? null
        : round2(
            Math.max(
              datum + det(day.rainfallMm, ant3, ant7, alarms),
              datum - 0.5,
            ),
          );

    const previous = last;
    const consecutive =
      previous !== null && previous.date === dayBefore(day.date);
    const change =
      waterLevelM !== null && consecutive && previous !== null
        ? round2(waterLevelM - previous.value)
        : null;
    if (waterLevelM !== null) {
      last = { date: day.date, value: waterLevelM };
    }

    return {
      ...day,
      antecedentRain3dMm: ant3,
      antecedentRain7dMm: ant7,
      antecedentRain30dMm: ant30,
      waterLevelM,
      waterLevelChange24hM: change,
    };
  });

  return { days, waterLevelDatumM: datum, calibrationRows };
}

function dayBefore(date: string): string | null {
  const stamp = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(stamp)) return null;
  return new globalThis.Date(stamp - 86_400_000).toISOString().slice(0, 10);
}

interface LevelAnchor {
  date: string;
  value: number;
}

/**
 * The dataset's last water level and the day it belongs to, for the 24-hour
 * change on the first stored day. Read from the final row that carries a value.
 */
function historyLevel(history: HistoryRow[]): LevelAnchor | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const level = history[index].waterLevelM;
    if (typeof level === "number")
      return { date: history[index].date, value: level };
  }
  return null;
}
