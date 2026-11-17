/** Contracts shared by every weather provider adapter. */

export type WeatherProviderName = "open-meteo" | "fixture";

export interface DailyWeatherPoint {
  /** Calendar date in the location's timezone, ISO `YYYY-MM-DD`. */
  date: string;
  rainfallMm: number;
  tmaxC: number;
  tminC: number;
  et0Mm: number | null;
}

export interface ObservedWeather {
  rainfallTodayMm: number;
  antecedentRain3dMm: number;
  antecedentRain7dMm: number;
  antecedentRain30dMm: number;
  soilMoisturePercent: number;
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
  /** True when the live provider failed and a fixture was substituted. */
  degraded: boolean;
  degradationReason?: string;
  /** Free-form provenance carried through to Convex and the UI. */
  notes: string[];
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
