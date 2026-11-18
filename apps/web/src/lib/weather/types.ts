/** Contracts shared by every weather provider adapter. */

export type WeatherProviderName = "open-meteo" | "fixture";

export interface DailyWeatherPoint {
  /** Calendar date in the location's timezone, ISO `YYYY-MM-DD`. */
  date: string;
  rainfallMm: number;
  tmaxC: number;
  tminC: number;
  et0Mm: number | null;
  /**
   * Volumetric soil moisture (0–100 %) for this day, when the provider reports
   * it. Only observed days carry one; the forecast days are the model's input,
   * not a soil observation.
   */
  soilMoisturePercent?: number | null;
}

/** Where the soil-moisture column came from. */
export type SoilMoistureSource = "open-meteo" | "water-balance-bucket";

/** Where the rainfall that seeds the model came from. */
export type RainfallSource = "provider" | "gauge";

export interface ObservedWeather {
  rainfallTodayMm: number;
  antecedentRain3dMm: number;
  antecedentRain7dMm: number;
  antecedentRain30dMm: number;
  soilMoisturePercent: number;
  /** `open-meteo` when the provider reported soil moisture, `bucket` otherwise. */
  soilMoistureSource: SoilMoistureSource;
  /** `gauge` when at least one day of the window came from a gauge file. */
  rainfallSource: RainfallSource;
  /** Days of the observed window supplied by a gauge file (0 when none). */
  gaugeDays: number;
}

export interface WeatherBundle {
  provider: WeatherProviderName;
  /** When the numbers were retrieved or generated, ISO 8601. */
  retrievedAt: string;
  timezone: string;
  location: { code: string; name: string; latitude: number; longitude: number };
  /**
   * Calendar date (ISO `YYYY-MM-DD`) the `observed` block describes — the last
   * day of the provider window, i.e. the state the model starts from.
   */
  asOf: string;
  /**
   * The model's input state. Derived by the adapter from its own recent window,
   * so the forecast chain starts from the provider's "today", not from a row in
   * the CSV.
   */
  observed: ObservedWeather;
  /** Consecutive forecast days starting tomorrow. */
  days: DailyWeatherPoint[];
  /** How many observed days the antecedent sums were computed from. */
  historyDays: number;
  /**
   * The observed window itself, oldest first with `asOf` last. Carried so a
   * reader can recompute the sums (and so a gauge file can replace individual
   * days) instead of trusting an opaque total.
   */
  history: DailyWeatherPoint[];
  /** Present when a local gauge file was consulted, even if it had no rows. */
  gauge?: GaugeWindow;
  /** True when the live provider failed and a fixture was substituted. */
  degraded: boolean;
  degradationReason?: string;
  /** Free-form provenance carried through to Convex and the UI. */
  notes: string[];
}

/** What the local gauge file contributed to this bundle. */
export interface GaugeWindow {
  /** Days of the window replaced by gauge rows. */
  days: number;
  /** True when today's rainfall came from the gauge rather than the provider. */
  todayFromGauge: boolean;
  /** Path of the file that was read, for the operator to check. */
  file: string;
  /** Set when the file exists but could not be used. */
  error?: string;
}

/** One day of GloFAS modelled river discharge. */
export interface RiverDischargeDay {
  date: string;
  /** Daily mean, cubic metres per second. */
  dischargeM3s: number;
}

/**
 * GloFAS river flow at the city's representative point.
 *
 * This is context, not a model input: it is a different quantity (m³/s of
 * modelled river flow) from RiverGuard's water-level proxy, and it is never
 * written into a run.
 */
export interface RiverContext {
  provider: "glofas";
  retrievedAt: string;
  location: { code: string; name: string; latitude: number; longitude: number };
  /** Days up to and including the issue date. */
  history: RiverDischargeDay[];
  /** Days after the issue date, up to seven. */
  days: RiverDischargeDay[];
  note: string;
}

export interface RiverContextResult {
  context: RiverContext | null;
  /** Plain-language reason when there is no context; never a thrown error. */
  error: string | null;
}

export interface WeatherProvider {
  readonly name: WeatherProviderName;
  fetchBundle(location: {
    code: string;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  }): Promise<WeatherBundle>;
}

export class WeatherProviderError extends Error {
  constructor(
    message: string,
    readonly provider: WeatherProviderName,
  ) {
    super(message);
    this.name = "WeatherProviderError";
  }
}
