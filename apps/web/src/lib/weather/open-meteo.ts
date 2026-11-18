/**
 * Open-Meteo adapter — the real, online weather source.
 *
 * One request returns 30 past days *and* 7 forecast days for a point, which is
 * what the model needs: the antecedent 3/7/30-day sums come from the past
 * window, and the forecast window is what a user asked for.
 *
 * Soil moisture is requested too, as hourly `soil_moisture_0_to_7cm` averaged
 * onto each day. It is a genuine provider value rather than the water-balance
 * bucket the pipeline used before, and when the model has no soil variable the
 * adapter falls back to the bucket and says so (`observed.soilMoistureSource`).
 *
 * That fallback is also why the request is retried once without the hourly
 * block: an unsupported hourly variable is a 400, and losing a whole forecast
 * over an optional column would be worse than using the derived value.
 *
 * Free and keyless for non-commercial use; attribution is required when the
 * numbers are shown, so `notes` carries the provider string through to Convex
 * and the UI. https://open-meteo.com/en/docs
 */

import { buildObserved } from "./observed";
import type {
  DailyWeatherPoint,
  WeatherBundle,
  WeatherProvider,
} from "./types";
import { WeatherProviderError } from "./types";

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const PAST_DAYS = 30;
const FORECAST_DAYS = 7;
const DAILY_VARIABLES = [
  "precipitation_sum",
  "temperature_2m_max",
  "temperature_2m_min",
  "et0_fao_evapotranspiration",
].join(",");
/** Hourly, because the daily form of this variable is model-dependent. */
const HOURLY_VARIABLES = "soil_moisture_0_to_7cm";
/** A day needs this many hourly samples before its mean is trusted. */
const MIN_SOIL_SAMPLES = 6;

interface OpenMeteoResponse {
  timezone?: string;
  daily?: {
    time?: string[];
    precipitation_sum?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    et0_fao_evapotranspiration?: (number | null)[];
  };
  hourly?: {
    time?: string[];
    soil_moisture_0_to_7cm?: (number | null)[];
  };
  reason?: string;
}

function num(value: number | null | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Daily means of an hourly series, keyed by ISO date.
 *
 * Open-Meteo returns volumetric soil moisture (m³/m³, roughly 0.05–0.6), so the
 * value is converted to percent here. Days with too few samples are dropped
 * rather than averaged from a partial day.
 */
export function dailyMeans(
  times: string[] | undefined,
  values: (number | null)[] | undefined,
): Map<string, number> {
  const sums = new Map<string, { total: number; count: number }>();
  if (!times || !values) return new Map();

  for (let index = 0; index < times.length; index += 1) {
    const value = values[index];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const date = times[index]?.slice(0, 10);
    if (!date) continue;
    const entry = sums.get(date) ?? { total: 0, count: 0 };
    entry.total += value;
    entry.count += 1;
    sums.set(date, entry);
  }

  const means = new Map<string, number>();
  for (const [date, entry] of sums) {
    if (entry.count < MIN_SOIL_SAMPLES) continue;
    // Four decimals is finer than the percent value the model receives, and
    // avoids 24 accumulated 0.3s arriving as 0.2999999999999999.
    means.set(date, Math.round((entry.total / entry.count) * 10000) / 10000);
  }
  return means;
}

/** Open-Meteo's m³/m³ value as a 0–100 % figure. */
export function toPercent(volumetric: number): number {
  return Math.min(100, Math.max(0, volumetric * 100));
}

function buildUrl(
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
  },
  includeHourly: boolean,
): URL {
  const url = new URL(ENDPOINT);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("daily", DAILY_VARIABLES);
  if (includeHourly) url.searchParams.set("hourly", HOURLY_VARIABLES);
  url.searchParams.set("past_days", String(PAST_DAYS));
  url.searchParams.set("forecast_days", String(FORECAST_DAYS));
  url.searchParams.set("timezone", location.timezone);
  return url;
}

async function request(
  location: { latitude: number; longitude: number; timezone: string },
  includeHourly: boolean,
  timeoutMs: number,
): Promise<OpenMeteoResponse> {
  let response: Response;
  try {
    response = await fetch(buildUrl(location, includeHourly), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    throw new WeatherProviderError(
      `Open-Meteo request failed: ${error instanceof Error ? error.message : "unknown error"}`,
      "open-meteo",
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const status = response.status;
    const suffix = detail ? `: ${detail.slice(0, 200)}` : "";
    throw new WeatherProviderError(
      `Open-Meteo returned ${status}${suffix}`,
      "open-meteo",
    );
  }

  return (await response.json()) as OpenMeteoResponse;
}

/**
 * Depth of the free tier is irrelevant here — one call per user action. The
 * timeout matters: a hung provider must not hang the dashboard.
 */
export function openMeteoProvider(options?: {
  timeoutMs?: number;
}): WeatherProvider {
  const timeoutMs = options?.timeoutMs ?? 8000;

  return {
    name: "open-meteo" as const,

    async fetchBundle(location): Promise<WeatherBundle> {
      let payload: OpenMeteoResponse;
      let soilRequested = true;
      try {
        payload = await request(location, true, timeoutMs);
      } catch (error) {
        // A rejected hourly variable must not cost the forecast: retry without
        // it and let the bucket stand in, with a note explaining the swap.
        const rejectedHourly =
          error instanceof WeatherProviderError &&
          /\b400\b|\b422\b/.test(error.message);
        if (!rejectedHourly) throw error;
        soilRequested = false;
        payload = await request(location, false, timeoutMs);
      }

      const days = payload.daily?.time ?? [];
      if (days.length < PAST_DAYS + 1) {
        throw new WeatherProviderError(
          `Open-Meteo returned ${days.length} days, expected at least ${PAST_DAYS + 1}`,
          "open-meteo",
        );
      }

      const rain = payload.daily?.precipitation_sum ?? [];
      const tmax = payload.daily?.temperature_2m_max ?? [];
      const tmin = payload.daily?.temperature_2m_min ?? [];
      const et0 = payload.daily?.et0_fao_evapotranspiration ?? [];
      const soilMeans = dailyMeans(
        payload.hourly?.time,
        payload.hourly?.soil_moisture_0_to_7cm,
      );

      // Index PAST_DAYS is today; everything before it is observed history.
      const todayIndex = PAST_DAYS;
      const asOf = days[todayIndex];

      const history: DailyWeatherPoint[] = days
        .slice(0, todayIndex + 1)
        .map((date, index) => {
          const soil = soilMeans.get(date);
          return {
            date,
            rainfallMm: round(Math.max(0, num(rain[index])), 1),
            tmaxC: round(num(tmax[index], 31), 1),
            tminC: round(num(tmin[index], 25), 1),
            et0Mm:
              et0[index] === null || et0[index] === undefined
                ? null
                : round(num(et0[index]), 2),
            soilMoisturePercent:
              soil === undefined ? null : round(toPercent(soil), 1),
          };
        });

      const todaySoil = soilMeans.get(asOf);
      const observed = buildObserved(history, asOf, {
        soilMoisturePercent:
          todaySoil === undefined ? null : toPercent(todaySoil),
      });

      const forecastDays: DailyWeatherPoint[] = days
        .slice(todayIndex + 1, todayIndex + 1 + FORECAST_DAYS)
        .map((date, offset) => {
          const index = todayIndex + 1 + offset;
          return {
            date,
            rainfallMm: round(Math.max(0, num(rain[index])), 1),
            tmaxC: round(num(tmax[index], 31), 1),
            tminC: round(num(tmin[index], 25), 1),
            et0Mm:
              et0[index] === null || et0[index] === undefined
                ? null
                : round(num(et0[index]), 2),
          };
        });

      if (forecastDays.length === 0) {
        throw new WeatherProviderError(
          "Open-Meteo returned no forecast days",
          "open-meteo",
        );
      }

      const soilFromProvider = observed.soilMoistureSource === "open-meteo";
      const notes = [
        "Weather: Open-Meteo forecast API (CC-BY-4.0), daily aggregates, timezone " +
          (payload.timezone ?? location.timezone) +
          ".",
        "Antecedent sums computed from the 30-day observed window.",
        soilFromProvider
          ? "Soil moisture: Open-Meteo hourly soil_moisture_0_to_7cm, averaged onto the issue day."
          : soilRequested
            ? "Soil moisture: the provider returned no soil value for this point, so the water-balance bucket was used."
            : "Soil moisture: the provider rejected the soil variable, so the water-balance bucket was used.",
      ];

      return {
        provider: "open-meteo",
        retrievedAt: new Date().toISOString(),
        timezone: payload.timezone ?? location.timezone,
        location: {
          code: location.code,
          name: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
        },
        asOf,
        observed,
        days: forecastDays,
        history,
        historyDays: history.length,
        degraded: false,
        notes,
      };
    },
  };
}
