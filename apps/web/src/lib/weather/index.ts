/**
 * Provider selection.
 *
 * `WEATHER_PROVIDER` picks the primary adapter (`open-meteo` by default).
 *
 * `WEATHER_ALLOW_FIXTURE` defaults to **off**: a provider failure raises, and the
 * API answers 502 rather than scoring the model on illustrative rainfall. The
 * fixture is the model's whole input when it is used, so the run is marked
 * `degraded` and labelled; set `WEATHER_ALLOW_FIXTURE` to exactly `true` to opt
 * into it for demos with no network.
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
  // Opt in explicitly. Any other value — unset, "", "1", "yes" — means off, so a
  // missing variable can never silently reinstate invented rainfall.
  return process.env.WEATHER_ALLOW_FIXTURE?.trim().toLowerCase() === "true";
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
