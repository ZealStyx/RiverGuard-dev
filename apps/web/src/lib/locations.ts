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

/**
 * How far below the first alarm the dataset generator puts the dry-season floor.
 *
 * `data/generate_dataset.py` routes rainfall through quick and slow stores, then
 * maps that index onto each river's own alarm band: `Alarm 1 − 2.0 m` .. `Alarm 1`
 * below the 98th percentile, `Alarm 1` .. `Alarm 3` above it, saturating at the
 * third alarm. Quoted where the chart explains a stage value, so "13.0 m" is not
 * read as an alarming number when the flood floor is 17 m.
 */
export const STAGE_DRY_SEASON_DROP_M = 2;

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

/**
 * Accept a slug ("quezon-city"), a display name ("Quezon City"), or anything
 * else and return a valid code, falling back to the default city.
 *
 * Wizard links carry a human-readable name, so this keeps the mapping in one
 * place instead of duplicating a lookup in every screen.
 */
export function locationCodeForName(value: string): LocationCode {
  const slug = value.trim().toLowerCase().replace(/\s+/g, "-");
  if (isLocationCode(slug)) return slug;
  const match = LOCATION_CODES.find(
    (code) => LOCATIONS[code].name.toLowerCase() === value.trim().toLowerCase(),
  );
  return match ?? DEFAULT_LOCATION;
}
