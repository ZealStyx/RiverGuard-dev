/**
 * One description of what the model was fed, shared by every route that runs it.
 *
 * The model's input is the weather provider's own window: today's rain plus the
 * antecedent 3/7/30-day sums and soil moisture derived from the prior 30 days.
 * Nothing in the pipeline seeds the model from `data/daily_observations.csv` any
 * more, so this type says `source: "weather"` only — there is no second source
 * to report.
 */

import type { WeatherBundle } from "./weather/types";

export interface ModelInputSummary {
  /** Always the weather provider: the CSV is no longer a model input. */
  source: "weather";
  /** Last day of the provider window, ISO `YYYY-MM-DD`. */
  asOfDate: string;
  /** Where those numbers came from, in words a reader can check. */
  rainSource: string;
  qualityStatus: string;
  /** No gauge reading exists in the provider path; kept for shape stability. */
  waterLevelM: number | null;
}

export function describeModelInput(bundle: WeatherBundle): ModelInputSummary {
  const fixture = bundle.provider === "fixture";
  return {
    source: "weather",
    asOfDate: bundle.asOf,
    // Same two providers the rest of the pipeline reports, named in full: the
    // reader should not have to know what "open-meteo" means.
    rainSource: fixture
      ? "offline fixture (illustrative, not a forecast)"
      : "Open-Meteo forecast API (CC-BY-4.0)",
    qualityStatus: bundle.degraded ? "degraded" : "provisional",
    waterLevelM: null,
  };
}
