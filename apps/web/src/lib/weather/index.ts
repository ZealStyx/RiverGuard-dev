/**
 * Provider selection.
 *
 * `WEATHER_PROVIDER` picks the primary adapter (`open-meteo` by default). A
 * provider failure falls back to the fixture so a demo never shows a blank
 * screen — unless `WEATHER_ALLOW_FIXTURE=false`, which is what a deployment
 * that must not invent numbers should set.
 */

import { fixtureProvider } from "./fixture";
import { openMeteoProvider } from "./open-meteo";
import type {
  WeatherBundle,
  WeatherProvider,
  WeatherProviderName,
} from "./types";

export type {
  DailyWeatherPoint,
  WeatherBundle,
  ObservedWeather,
} from "./types";
export { WeatherProviderError } from "./types";

export interface WeatherOptions {
  provider?: WeatherProviderName;
  allowFixture?: boolean;
}

function configuredProvider(): WeatherProviderName {
  const raw = process.env.WEATHER_PROVIDER?.trim().toLowerCase();
  return raw === "fixture" ? "fixture" : "open-meteo";
}

function fixtureAllowed(): boolean {
  return process.env.WEATHER_ALLOW_FIXTURE !== "false";
}

export function resolveProvider(options?: WeatherOptions): WeatherProvider {
  const name = options?.provider ?? configuredProvider();
  return name === "fixture" ? fixtureProvider() : openMeteoProvider();
}

export async function getWeatherBundle(
  location: Parameters<WeatherProvider["fetchBundle"]>[0],
  options?: WeatherOptions,
): Promise<WeatherBundle> {
  const allowFixture = options?.allowFixture ?? fixtureAllowed();
  const primary = resolveProvider(options);

  try {
    return await primary.fetchBundle(location);
  } catch (error) {
    if (!allowFixture) {
      throw error;
    }
    const bundle = await fixtureProvider().fetchBundle(location);
    return {
      ...bundle,
      degradationReason:
        `Live provider failed (${error instanceof Error ? error.message : "unknown error"}). ${
          bundle.degradationReason ?? ""
        }`.trim(),
    };
  }
}
