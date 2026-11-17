/**
 * Observed conditions for the model, taken from the real dataset.
 *
 * The forecast chain needs a starting state for a city: today's rain and the
 * antecedent 3/7/30-day sums plus soil moisture. Previously that came from the
 * offline weather fixture whenever the live provider failed, which meant the
 * model could be seeded with invented antecedent rain.
 *
 * Dataset v2 already stores exactly these columns, shifted one day so there is
 * no target leakage — the same values the model was trained to expect. This
 * module reads them, and the live weather provider only ever supplies the
 * *forecast* window that follows.
 */

import { loadDataset, latestObservation } from "./dataset";
import type { LocationConfig } from "./locations";
import type { ObservedWeather } from "./weather/types";

export interface ObservedStateResult {
  observed: ObservedWeather;
  /** Row date the state was read from, ISO `YYYY-MM-DD`. */
  asOfDate: string;
  /** `dataset` when read from the CSV, `weather` when derived from the provider. */
  source: "dataset" | "weather";
  rainSource: string;
  qualityStatus: string;
  /** Water level recorded on that row, for context next to a prediction. */
  waterLevelM: number | null;
  /** True when the CSV has no rows for this location and a fallback was used. */
  degraded: boolean;
  notes: string[];
}

/**
 * Read the observed state for a location from the dataset.
 *
 * Returns `null` when the CSV is unreadable or has no rows for the city, so the
 * caller can decide whether to fall back to the weather provider's own window.
 */
export async function observedStateFromDataset(
  location: LocationConfig,
): Promise<ObservedStateResult | null> {
  try {
    const dataset = await loadDataset();
    const row = latestObservation(dataset, location.name);
    if (!row) return null;

    const antecedent3 = row.antecedentRain3dMm ?? 0;
    const antecedent7 = row.antecedentRain7dMm ?? 0;
    const antecedent30 = row.antecedentRain30dMm ?? 0;

    return {
      observed: {
        rainfallTodayMm: row.rainfallMm ?? 0,
        // Guard the nesting invariant the ML service validates on.
        antecedentRain3dMm: antecedent3,
        antecedentRain7dMm: Math.max(antecedent3, antecedent7),
        antecedentRain30dMm: Math.max(antecedent7, antecedent30),
        soilMoisturePercent: row.soilMoisturePct ?? 0,
      },
      asOfDate: row.date,
      source: "dataset",
      rainSource: row.rainSource,
      qualityStatus: row.qualityStatus,
      waterLevelM: row.waterLevelM,
      degraded: false,
      notes: [
        `Observed state read from ${dataset.meta.label} (${dataset.meta.file}) for ${row.date}.`,
        `Rain provenance: ${row.rainSource || "undocumented"}; quality: ${row.qualityStatus || "undocumented"}.`,
        "Water level in the dataset is a rainfall-derived proxy, not a gauge reading.",
      ],
    };
  } catch {
    return null;
  }
}
