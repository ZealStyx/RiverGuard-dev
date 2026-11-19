/**
 * Open-Meteo adapter — the real, online weather source.
 *
 * One request returns 30 past days *and* 8 forecast-calendar days for a point,
 * including today. RiverGuard removes today and keeps seven future days, which is
 * exactly what the model needs: the antecedent 3/7/30-day sums come from the
 * past window, and the forecast window is what a user asked for.
 *
 * Free and keyless for non-commercial use; attribution is required when the
 * numbers are shown, so `notes` carries the provider string through to Convex
 * and the UI. https://open-meteo.com/en/docs
 */

import type {
  DailyWeatherPoint,
  ObservedWeather,
  WeatherBundle,
  WeatherProvider,
} from "./types";
import { WeatherProviderError } from "./types";

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const PAST_DAYS = 30;
const FUTURE_DAYS = 7;
// Open-Meteo counts today inside `forecast_days`, so request one extra calendar
// day to obtain seven dates after today.
const PROVIDER_FORECAST_DAYS = FUTURE_DAYS + 1;
const DAILY_VARIABLES = [
  "precipitation_sum",
  "temperature_2m_max",
  "temperature_2m_min",
].join(",");

/** Soil-moisture bucket constants, identical to data/generate_dataset.py. */
const SOIL_SEED = 55;
const SOIL_MIN = 5;
const SOIL_MAX = 95;
const SOIL_DRAINAGE = 0.08;

interface OpenMeteoResponse {
  timezone?: string;
  daily?: {
    time?: string[];
    precipitation_sum?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    et0_fao_evapotranspiration?: (number | null)[];
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
 * Depth of the free tier / plan is irrelevant here — one call per user action.
 * The timeout matters: a hung provider must not hang the dashboard.
 */
export function openMeteoProvider(options?: {
  timeoutMs?: number;
}): WeatherProvider {
  // Open-Meteo can take longer when returning the 30-day history plus the
  // seven-day forecast. Keep the request bounded, but allow normal network
  // latency before falling back to the explicitly labelled fixture.
  const timeoutMs = options?.timeoutMs ?? 20000;

  return {
    name: "open-meteo" as const,

    async fetchBundle(location): Promise<WeatherBundle> {
      const url = new URL(ENDPOINT);
      url.searchParams.set("latitude", String(location.latitude));
      url.searchParams.set("longitude", String(location.longitude));
      url.searchParams.set("daily", DAILY_VARIABLES);
      url.searchParams.set("past_days", String(PAST_DAYS));
      url.searchParams.set("forecast_days", String(PROVIDER_FORECAST_DAYS));
      url.searchParams.set("timezone", location.timezone);

      let response: Response;
      try {
        response = await fetch(url, {
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
        throw new WeatherProviderError(
          `Open-Meteo returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
          "open-meteo",
        );
      }

      const payload = (await response.json()) as OpenMeteoResponse;
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

      // Index PAST_DAYS is today; everything before it is observed history.
      const todayIndex = PAST_DAYS;
      const historyRain = rain
        .slice(0, todayIndex + 1)
        .map((value) => Math.max(0, num(value)));
      const observed = summarise(historyRain, et0.slice(0, todayIndex + 1));

      const forecastDays: DailyWeatherPoint[] = days
        .slice(todayIndex + 1, todayIndex + 1 + FUTURE_DAYS)
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
        asOf: days[todayIndex],
        observed,
        days: forecastDays,
        historyDays: historyRain.length,
        degraded: false,
        notes: [
          "Weather: Open-Meteo forecast API (CC-BY-4.0), daily aggregates, timezone " +
            (payload.timezone ?? location.timezone) +
            ".",
          "Antecedent sums computed from the 30-day observed window; soil moisture from a " +
            "water-balance bucket warmed up over that window.",
        ],
      };
    },
  };
}

/**
 * Derive the model's observed inputs from a daily rainfall history.
 * `history` includes today as its last element.
 */
export function summarise(
  history: number[],
  et0Series: (number | null)[],
): ObservedWeather {
  const today = history.length - 1;
  const sum = (from: number, to: number) =>
    history
      .slice(Math.max(0, from), to + 1)
      .reduce((total, value) => total + value, 0);

  // Windows exclude today, matching the dataset's shifted rolling sums.
  const antecedent3 = sum(today - 3, today - 1);
  const antecedent7 = sum(today - 7, today - 1);
  const antecedent30 = sum(today - 30, today - 1);

  // Warm the soil bucket over the whole history so the value is not a guess
  // from a single day. The seed is mid-range and is documented, not hidden.
  let soil = SOIL_SEED;
  for (let index = 0; index <= today; index += 1) {
    const et0 =
      et0Series[index] === null || et0Series[index] === undefined
        ? 3.8
        : num(et0Series[index], 3.8);
    soil = Math.min(
      SOIL_MAX,
      Math.max(SOIL_MIN, soil + history[index] - et0 - SOIL_DRAINAGE * soil),
    );
  }

  return {
    rainfallTodayMm: round(history[today], 1),
    antecedentRain3dMm: round(antecedent3, 1),
    antecedentRain7dMm: round(Math.max(antecedent3, antecedent7), 1),
    antecedentRain30dMm: round(Math.max(antecedent7, antecedent30), 1),
    soilMoisturePercent: round(soil, 1),
  };
}
