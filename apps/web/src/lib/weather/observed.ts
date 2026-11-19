/**
 * Observed daily weather, fetched live from Open-Meteo.
 *
 * The history chart used to stop at the last row of `data/daily_observations.csv`
 * (2026-11-14) because that file was the only source. This module asks the
 * provider for the requested window instead, so the chart is current.
 *
 * Two endpoints, because neither alone covers a range that reaches today:
 *   - the forecast endpoint carries up to 92 past days and includes the most
 *     recent ones, which the archive has not published yet;
 *   - the archive endpoint covers anything older than that window.
 *
 * Only rainfall and the supporting temperatures are returned. Water level is not
 * requested or derived here: the dataset's level is a rainfall-derived proxy,
 * and extrapolating it would present an invented number as a measurement.
 */

import { WeatherProviderError } from "./types";

const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_ENDPOINT = "https://archive-api.open-meteo.com/v1/archive";
const TIMEZONE = "Asia/Manila";
/** The forecast endpoint accepts at most 92 past days. */
const MAX_PAST_DAYS = 92;
const DAILY_VARIABLES = [
  "precipitation_sum",
  "temperature_2m_max",
  "temperature_2m_min",
  "et0_fao_evapotranspiration",
].join(",");

export const OBSERVED_SOURCE = "Open-Meteo (ERA5 / IFS)";

export interface ObservedDay {
  isoDate: string;
  rainfallMm: number;
  tmaxC?: number;
  tminC?: number;
  et0Mm?: number;
  source: string;
}

interface OpenMeteoDaily {
  time?: string[];
  precipitation_sum?: (number | null)[];
  temperature_2m_max?: (number | null)[];
  temperature_2m_min?: (number | null)[];
  et0_fao_evapotranspiration?: (number | null)[];
}

interface OpenMeteoPayload {
  daily?: OpenMeteoDaily;
  reason?: string;
  error?: boolean;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function optional(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? round(value, 1)
    : undefined;
}

/** Whole days between two ISO dates (b - a). */
export function daysBetween(a: string, b: string): number {
  const from = Date.parse(`${a}T00:00:00Z`);
  const to = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

export function addDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

async function request(
  url: string,
  timeoutMs: number,
): Promise<OpenMeteoPayload> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const payload = (await response.json()) as OpenMeteoPayload;
    if (!response.ok || payload.error) {
      throw new WeatherProviderError(
        payload.reason ?? `Open-Meteo returned ${response.status}`,
        "open-meteo",
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof WeatherProviderError) throw error;
    throw new WeatherProviderError(
      error instanceof Error && error.name === "AbortError"
        ? "Open-Meteo did not answer in time"
        : `Open-Meteo could not be reached: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
      "open-meteo",
    );
  } finally {
    clearTimeout(timer);
  }
}

function toDays(payload: OpenMeteoPayload): ObservedDay[] {
  const daily = payload.daily;
  if (!daily?.time?.length) return [];
  return daily.time.map((isoDate, index) => ({
    isoDate,
    rainfallMm: round(daily.precipitation_sum?.[index] ?? 0, 1),
    tmaxC: optional(daily.temperature_2m_max?.[index]),
    tminC: optional(daily.temperature_2m_min?.[index]),
    et0Mm: optional(daily.et0_fao_evapotranspiration?.[index]),
    source: OBSERVED_SOURCE,
  }));
}

/**
 * Observed days for `[start, end]`, newest coverage first from the forecast
 * endpoint and older coverage from the archive. Days that do not exist yet (the
 * future, or an archive that has not caught up) are simply absent.
 */
export async function fetchObservedRange({
  end,
  latitude,
  longitude,
  start,
  timeoutMs = 9000,
  today,
}: {
  end: string;
  latitude: number;
  longitude: number;
  start: string;
  timeoutMs?: number;
  today: string;
}): Promise<ObservedDay[]> {
  const collected = new Map<string, ObservedDay>();

  const daysBack = Math.max(daysBetween(start, today), 0);
  if (daysBack <= MAX_PAST_DAYS) {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      daily: DAILY_VARIABLES,
      past_days: String(Math.min(daysBack + 1, MAX_PAST_DAYS)),
      forecast_days: "1",
      timezone: TIMEZONE,
    });
    for (const day of toDays(
      await request(`${FORECAST_ENDPOINT}?${params.toString()}`, timeoutMs),
    ))
      collected.set(day.isoDate, day);
  } else {
    // Older than the forecast endpoint can reach: archive first, then top up
    // the recent tail from the forecast endpoint, which publishes sooner.
    const archiveParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      start_date: start,
      end_date: end,
      daily: DAILY_VARIABLES,
      timezone: TIMEZONE,
    });
    for (const day of toDays(
      await request(
        `${ARCHIVE_ENDPOINT}?${archiveParams.toString()}`,
        timeoutMs,
      ),
    ))
      collected.set(day.isoDate, day);

    const recentStart = addDays(today, -MAX_PAST_DAYS);
    const forecastParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      daily: DAILY_VARIABLES,
      past_days: String(MAX_PAST_DAYS),
      forecast_days: "1",
      timezone: TIMEZONE,
    });
    for (const day of await fetchTail(forecastParams, recentStart, timeoutMs))
      collected.set(day.isoDate, day);
  }

  return [...collected.values()]
    .filter((day) => day.isoDate >= start && day.isoDate <= end)
    .sort((left, right) => left.isoDate.localeCompare(right.isoDate));
}

/**
 * The recent tail is an enhancement, not a requirement: if Open-Meteo refuses
 * the second call the archive rows are still worth returning.
 */
async function fetchTail(
  params: URLSearchParams,
  recentStart: string,
  timeoutMs: number,
): Promise<ObservedDay[]> {
  try {
    const days = toDays(
      await request(`${FORECAST_ENDPOINT}?${params.toString()}`, timeoutMs),
    );
    return days.filter((day) => day.isoDate >= recentStart);
  } catch {
    return [];
  }
}
