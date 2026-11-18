/**
 * Turning stored observation days into chart readings, without inventing any.
 *
 * The history chart plots two things per day:
 *
 *   - rainfall, which a provider reports directly;
 *   - a *derived* stage proxy, because no gauge series exists for these rivers.
 *
 * `data/generate_dataset.py` defines that proxy as rainfall routed through two
 * linear reservoirs — a fast one for direct runoff and a slow one for baseflow —
 * with the result mapped onto the river's own alarm band:
 *
 *     quick_t = 0.80·quick_{t-1} + Rain_t
 *     slow_t  = 0.97·slow_{t-1}  + 0.06·Rain_t
 *     index_t = 0.012·quick_t + 0.030·slow_t                     (metres)
 *
 *     index <= p98(index)  ->  (Alarm1 − 2.0) .. Alarm1
 *     index >  p98(index)  ->  Alarm1 .. Alarm3, saturating at Alarm3
 *
 * Live days are placed on that same scale by replaying the reservoir over the
 * dataset's own rainfall to recover its state at the dataset's end, then
 * calibrating the band from the dataset's own index distribution. Only the
 * generator's ±0.05 m noise is dropped: a derived proxy should not jitter
 * because of a random number generator in a different process.
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
  /**
   * The floor of the proxy scale — `Alarm1 − 2.0 m`, the level a drained river
   * sits at in the dry season. `null` when the history was too thin to calibrate.
   */
  waterLevelDatumM: number | null;
  /** How many dataset rows the calibration was taken from. */
  calibrationRows: number;
}

/** Reservoir constants, identical to `data/generate_dataset.py`. */
const QUICK_RECESSION = 0.8;
const SLOW_RECESSION = 0.97;
const SLOW_INTAKE = 0.06;
const QUICK_GAIN_M_PER_MM = 0.012;
const SLOW_GAIN_M_PER_MM = 0.03;

/** The dry-season floor sits this far below Alarm 1, as in the generator. */
export const DRY_SEASON_DROP_M = 2;
/** The generator maps the top of the band from this percentile of the index. */
const STAGE_TOP_PERCENTILE = 99.9;
/** Minimum rows before the band is trusted; a season is 90. */
const MIN_CALIBRATION_ROWS = 90;

/** Linear-interpolated percentile, the definition numpy uses by default. */
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

/** The two reservoirs, advanced one day at a time. */
interface ReservoirState {
  quick: number;
  slow: number;
}

/** Meters of stage for one day's rainfall, given the state after the rain. */
function stageIndex(rain: number, state: ReservoirState): number {
  return QUICK_GAIN_M_PER_MM * state.quick + SLOW_GAIN_M_PER_MM * state.slow;
}

/** Advance both stores by a day of rain. */
function advance(state: ReservoirState, rain: number): ReservoirState {
  return {
    quick: QUICK_RECESSION * state.quick + rain,
    slow: SLOW_RECESSION * state.slow + SLOW_INTAKE * rain,
  };
}

/** Where the index sits on the alarm band, for this river. */
export interface StageCalibration {
  /** `Alarm1 − 2.0 m`: the level a drained river sits at. */
  dryFloorM: number;
  /** Index at the 98th percentile, mapped to Alarm 1. */
  p98Index: number;
  /** Index at the 99.9th percentile, mapped to Alarm 3. */
  pTopIndex: number;
  /** The reservoir state at the end of the supplied history. */
  state: ReservoirState;
  rowsUsed: number;
}

/**
 * Replay the dataset's rainfall through the reservoirs and calibrate the band.
 *
 * Returns `null` when fewer than `MIN_CALIBRATION_ROWS` days carry rainfall —
 * the same 90-day bar the file store applies before trusting a calibration.
 */
export function calibrateStage(
  history: HistoryRow[],
  alarms: readonly [number, number, number],
): StageCalibration | null {
  let state: ReservoirState = { quick: 0, slow: 0 };
  const index: number[] = [];

  for (const row of history) {
    if (typeof row.rainfallMm !== "number") continue;
    state = advance(state, row.rainfallMm);
    index.push(stageIndex(row.rainfallMm, state));
  }

  if (index.length < MIN_CALIBRATION_ROWS) return null;
  const p98 = percentile(index, 98);
  const pTop = percentile(index, STAGE_TOP_PERCENTILE);
  if (!Number.isFinite(p98) || !Number.isFinite(pTop) || p98 <= 0) {
    return null;
  }

  return {
    dryFloorM: alarms[0] - DRY_SEASON_DROP_M,
    p98Index: p98,
    pTopIndex: Math.max(pTop, p98),
    state,
    rowsUsed: index.length,
  };
}

/** Map an index onto the river's alarm band, as the generator does. */
export function levelForIndex(
  index: number,
  calibration: StageCalibration,
  alarms: readonly [number, number, number],
): number {
  const { dryFloorM, p98Index, pTopIndex } = calibration;
  const level =
    index <= p98Index
      ? dryFloorM +
        ((alarms[0] - dryFloorM) * Math.min(index, p98Index)) / p98Index
      : alarms[0] +
        ((alarms[2] - alarms[0]) * (index - p98Index)) /
          Math.max(pTopIndex - p98Index, 1e-9);
  return Math.min(level, alarms[2]);
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
 * change on the first stored day.
 */
function historyLevel(history: HistoryRow[]): LevelAnchor | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const level = history[index].waterLevelM;
    if (typeof level === "number") {
      return { date: history[index].date, value: level };
    }
  }
  return null;
}

/**
 * Derive the chart fields for stored days.
 *
 * `history` is the dataset series for the same city, oldest row first. It is
 * replayed in full so the reservoir state at the dataset's end is exact rather
 * than approximated from the last few weeks.
 */
export function deriveObservationDays(
  history: HistoryRow[],
  liveDays: StoredObservationDay[],
  alarms: readonly [number, number, number],
): DerivationResult {
  if (liveDays.length === 0) {
    return { days: [], waterLevelDatumM: null, calibrationRows: 0 };
  }

  const calibration = calibrateStage(history, alarms);

  const rainByDate = new Map<string, number>();
  for (const row of history) {
    if (row.date && typeof row.rainfallMm === "number") {
      rainByDate.set(row.date, row.rainfallMm);
    }
  }
  for (const day of liveDays) rainByDate.set(day.date, day.rainfallMm);

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

  // The change is only honest between consecutive calendar days: if the dataset
  // ends on 2026-11-14 and the first stored day is 2026-11-17, subtracting the
  // two would report three days of change as one.
  let last = historyLevel(history);
  let state = calibration?.state ?? { quick: 0, slow: 0 };

  const days = liveDays.map((day) => {
    const ant3 = windowSum(day.date, 3);
    const ant7 = windowSum(day.date, 7);
    const ant30 = windowSum(day.date, 30);

    state = advance(state, day.rainfallMm);
    const waterLevelM = calibration
      ? round2(
          levelForIndex(stageIndex(day.rainfallMm, state), calibration, alarms),
        )
      : null;

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

  return {
    days,
    waterLevelDatumM: calibration?.dryFloorM ?? null,
    calibrationRows: calibration?.rowsUsed ?? 0,
  };
}
