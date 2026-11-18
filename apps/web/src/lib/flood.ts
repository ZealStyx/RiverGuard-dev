/**
 * GloFAS river discharge, as context beside the model's water level.
 *
 * RiverGuard's water-level column is a proxy derived from rainfall during
 * dataset generation; it is not a river observation, and the model never sees a
 * gauge. GloFAS (through the Open-Meteo Flood API) is an independent, modelled
 * daily discharge for the nearest river reach. Showing the two side by side lets
 * a reader see when the rainfall-driven number and the hydrological model
 * disagree — which is the cheapest honest check available offline.
 *
 * It is deliberately *not* a model input and never enters a stored run: adding a
 * feature would change the schema both providers decode, and the trained model
 * has no coefficient for it. This is a comparison, labelled as such.
 *
 * Best effort throughout: a failure returns `{ context: null, error }` and the
 * forecast is unaffected.
 */

import type { RiverContextResult, RiverDischargeDay } from "./weather/types";

const ENDPOINT = "https://flood-api.open-meteo.com/v1/flood";
const HISTORY_DAYS = 7;
const FORECAST_DAYS = 7;

interface FloodResponse {
  daily?: {
    time?: string[];
    river_discharge?: (number | null)[];
  };
  reason?: string;
}

export interface RiverLocation {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Split one series into "up to the issue date" and "after it".
 *
 * `null` days are dropped, not interpolated: a gap in GloFAS is information the
 * reader should be able to see as a gap rather than a straight line.
 */
export function splitDischarge(
  times: string[] | undefined,
  values: (number | null)[] | undefined,
  asOf: string,
): { history: RiverDischargeDay[]; days: RiverDischargeDay[] } {
  const history: RiverDischargeDay[] = [];
  const days: RiverDischargeDay[] = [];
  if (!times || !values) return { history, days };

  for (let index = 0; index < times.length; index += 1) {
    const date = times[index];
    const value = values[index];
    if (!date || typeof value !== "number" || !Number.isFinite(value)) continue;
    const entry = { date, dischargeM3s: Math.round(value * 10) / 10 };
    if (date <= asOf) history.push(entry);
    else days.push(entry);
  }

  return {
    history: history.slice(-HISTORY_DAYS),
    days: days.slice(0, FORECAST_DAYS),
  };
}

export async function fetchRiverContext(
  location: RiverLocation,
  options: { asOf: string; timeoutMs?: number },
): Promise<RiverContextResult> {
  const timeoutMs = options.timeoutMs ?? 6000;
  const url = new URL(ENDPOINT);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("daily", "river_discharge");
  url.searchParams.set("past_days", String(HISTORY_DAYS));
  url.searchParams.set("forecast_days", String(FORECAST_DAYS));
  url.searchParams.set("timezone", "Asia/Manila");

  let payload: FloodResponse;
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        context: null,
        error: `GloFAS returned ${response.status}${
          detail ? `: ${detail.slice(0, 160)}` : ""
        }.`,
      };
    }
    payload = (await response.json()) as FloodResponse;
  } catch (error) {
    return {
      context: null,
      error: `GloFAS could not be reached: ${
        error instanceof Error ? error.message : "unknown error"
      }.`,
    };
  }

  const { history, days } = splitDischarge(
    payload.daily?.time,
    payload.daily?.river_discharge,
    options.asOf,
  );

  if (days.length === 0) {
    return {
      context: null,
      error:
        "GloFAS returned no river discharge for this point, which is normal for small catchments.",
    };
  }

  return {
    context: {
      provider: "glofas",
      retrievedAt: new Date().toISOString(),
      location: {
        code: location.code,
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      history,
      days,
      note: "GloFAS daily river discharge (m³/s) from the Open-Meteo Flood API: a hydrological model at roughly 5 km resolution, not a gauge reading and not RiverGuard's water level.",
    },
    error: null,
  };
}
