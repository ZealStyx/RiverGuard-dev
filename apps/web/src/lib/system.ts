/**
 * The shape `GET /api/system` answers with.
 *
 * Kept in a client-safe module so the administrator screens and the route agree
 * on one definition instead of re-declaring it on both sides.
 */

export type WeatherProviderName = "open-meteo" | "fixture";

export interface SystemStatus {
  weather: {
    provider: WeatherProviderName;
    /** True only when `WEATHER_ALLOW_FIXTURE=true` was set deliberately. */
    fixtureAllowed: boolean;
  };
  convex: { configured: boolean };
  storage: {
    /** `null` when the store could not be read, which is not the same as 0. */
    runs: number | null;
    reviews: number | null;
    auditEvents: number | null;
  };
  /**
   * The optional local rain-gauge file. `configured: false` with no error means
   * there is no file, which is a supported state: the provider's history stands.
   */
  riverGauge: {
    configured: boolean;
    file: string;
    rows: number;
    error: string | null;
  };
  /**
   * Observed days kept from real provider runs. `configured: false` means no run
   * has stored any yet, so the history chart still ends where the dataset does.
   */
  observations: {
    configured: boolean;
    file: string;
    days: number;
    error: string | null;
  };
}

export const WEATHER_PROVIDER_LABEL: Record<WeatherProviderName, string> = {
  "open-meteo": "Open-Meteo (live)",
  fixture: "Offline fixture",
};
