/**
 * The four supported NCR locations.
 *
 * Coordinates are the representative climate/gauge points used to build dataset
 * v2 (see data/stations.csv). Alarm levels mirror ml/artifacts/model.json, which
 * is the single source of truth for what the ML service will report; if a model
 * is retrained with different alarms, this table must move with it.
 *
 * Only the Marikina River values (15 / 16 / 18 m) are documented by PAGASA and
 * the Marikina MDRRMO. The rest are representative or indicative, and
 * `alarmsVerified` says which is which so the UI can label them.
 */

export type LocationCode = "marikina" | "quezon-city" | "manila" | "pasig";

export interface LocationConfig {
  code: LocationCode;
  name: string;
  river: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  alarmLevelsM: readonly [number, number, number];
  alarmsVerified: boolean;
  timezone: string;
}

export const LOCATIONS: Record<LocationCode, LocationConfig> = {
  marikina: {
    code: "marikina",
    name: "Marikina",
    river: "Marikina River",
    latitude: 14.65,
    longitude: 121.1,
    elevationM: 24,
    alarmLevelsM: [15, 16, 18],
    alarmsVerified: true,
    timezone: "Asia/Manila",
  },
  "quezon-city": {
    code: "quezon-city",
    name: "Quezon City",
    river: "San Juan / Tullahan",
    latitude: 14.6509,
    longitude: 121.0486,
    elevationM: 55,
    alarmLevelsM: [13, 14, 15],
    alarmsVerified: false,
    timezone: "Asia/Manila",
  },
  manila: {
    code: "manila",
    name: "Manila",
    river: "Pasig River (Pandacan reach)",
    latitude: 14.587,
    longitude: 120.979,
    elevationM: 15,
    alarmLevelsM: [12, 12.5, 13],
    alarmsVerified: false,
    timezone: "Asia/Manila",
  },
  pasig: {
    code: "pasig",
    name: "Pasig",
    river: "Pasig River (Rosario reach)",
    latitude: 14.59,
    longitude: 121.07,
    elevationM: 20,
    alarmLevelsM: [12, 12.5, 13],
    alarmsVerified: false,
    timezone: "Asia/Manila",
  },
};

export const LOCATION_CODES = Object.keys(LOCATIONS) as LocationCode[];

/** The dashboard's default location. */
export const DEFAULT_LOCATION: LocationCode = "marikina";

export function isLocationCode(value: string): value is LocationCode {
  return Object.prototype.hasOwnProperty.call(LOCATIONS, value);
}

export function getLocation(value: string): LocationConfig | null {
  return isLocationCode(value) ? LOCATIONS[value] : null;
}
