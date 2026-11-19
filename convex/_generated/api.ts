/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as alerts from "../alerts.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as forecasts from "../forecasts.js";
import type * as hazardLayers from "../hazardLayers.js";
import type * as historical from "../historical.js";
import type * as lgu from "../lgu.js";
import type * as predictions from "../predictions.js";
import type * as reviews from "../reviews.js";
import type * as riskAssessments from "../riskAssessments.js";
import type * as sensorReadings from "../sensorReadings.js";
import type * as stations from "../stations.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  alerts: typeof alerts;
  auth: typeof auth;
  crons: typeof crons;
  forecasts: typeof forecasts;
  hazardLayers: typeof hazardLayers;
  historical: typeof historical;
  lgu: typeof lgu;
  predictions: typeof predictions;
  reviews: typeof reviews;
  riskAssessments: typeof riskAssessments;
  sensorReadings: typeof sensorReadings;
  stations: typeof stations;
  users: typeof users;
  validators: typeof validators;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {};
