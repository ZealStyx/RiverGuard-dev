/**
 * Offline weather fixture.
 *
 * Two jobs: let the pipeline run in an environment with no outbound network
 * (CI, this sandbox, a demo laptop on a plane), and let tests assert exact
 * numbers. It is never silent — every bundle it returns is marked
 * `degraded: true` with a reason, and the UI must show that.
 *
 * The rainfall pattern is a plausible mid-November week for Metro Manila:
 * a wet spell tapering off. The values are illustrative, not observations.
 */

import { buildObserved } from "./observed";
import type {
  DailyWeatherPoint,
  WeatherBundle,
  WeatherProvider,
} from "./types";

const FIXTURE_RAIN = [46, 5, 4, 6, 5, 3, 2];
// Oldest first, today last. A wet November: ~296 mm over 31 days, with the
// last three days carrying 59 mm, which leaves the catchment saturated.
const FIXTURE_HISTORY = [
  0, 0, 0, 0, 6, 20, 34, 12, 2, 0, 0, 0, 4, 15, 28, 9, 0, 0, 0, 8, 22, 41, 15,
  3, 0, 0, 6, 18, 30, 11, 12,
];

function isoDate(offsetDays: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function fixtureProvider(): WeatherProvider {
  return {
    name: "fixture" as const,

    async fetchBundle(location): Promise<WeatherBundle> {
      const today = FIXTURE_HISTORY.length - 1;
      const asOf = isoDate(0);
      // The window is carried explicitly (not just totals) so the gauge blend
      // and the run detail can show which days the sums came from.
      const history: DailyWeatherPoint[] = FIXTURE_HISTORY.map(
        (rainfallMm, index) => ({
          date: isoDate(index - today),
          rainfallMm,
          tmaxC: 31,
          tminC: 25,
          et0Mm: 3.8,
          soilMoisturePercent: null,
        }),
      );
      const observed = buildObserved(history, asOf);

      return {
        provider: "fixture",
        retrievedAt: new Date().toISOString(),
        timezone: location.timezone,
        location: {
          code: location.code,
          name: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
        },
        asOf,
        observed,
        history,
        days: FIXTURE_RAIN.map((rainfallMm, index) => ({
          date: isoDate(index + 1),
          rainfallMm,
          tmaxC: 31,
          tminC: 25,
          et0Mm: 3.8,
        })),
        historyDays: history.length,
        degraded: true,
        degradationReason:
          "Offline fixture in use: these rainfall numbers are illustrative, not a forecast.",
        notes: [
          "Weather: built-in fixture (no provider call).",
          "Do not present these numbers as a weather forecast.",
        ],
      };
    },
  };
}
