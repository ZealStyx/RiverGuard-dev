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
}

export const WEATHER_PROVIDER_LABEL: Record<WeatherProviderName, string> = {
  "open-meteo": "Open-Meteo (live)",
  fixture: "Offline fixture",
};
