/**
 * The shape of `apps/web/src/generated/gis-layers.json`.
 *
 * That file is written by `npm run gis:verify` from `data/gis/manifest.json` and
 * is the *only* GIS state the web app reads. A layer appears here because a
 * human declared it and the verifier accepted the file: complete provenance, a
 * matching checksum, valid WGS84 geometry inside the declared bounding box, and
 * every feature carrying the attributes the manifest promises.
 *
 * If the file lists nothing, nothing is drawn — which is the state this
 * repository ships in, and why the map says overlays are hidden.
 */

export type GisClassification = "hazard" | "boundary" | "stations";

export type GisGeometryKind = "polygon" | "line" | "point";

export interface GisLayerSource {
  publisher: string;
  url: string;
  license: string;
  retrievedAt: string;
  note: string;
}

export interface GisLayerSummary {
  id: string;
  title: string;
  classification: GisClassification;
  description: string;
  geometry: GisGeometryKind;
  /** Bare filename inside `data/gis`; the browser never uses it directly. */
  file: string;
  /** Same-origin endpoint that streams the verified geometry. */
  url: string;
  sha256: string;
  bbox: [number, number, number, number];
  computedBbox: [number, number, number, number];
  featureCount: number;
  classProperty: string | null;
  classColors: Record<string, string> | null;
  fillOpacity: number;
  strokeColor: string;
  source: GisLayerSource;
  verifiedBy: string;
  verifiedAt: string;
}

export interface GisRejectedLayer {
  id: string;
  problems: string[];
}

export interface GisLayersResponse {
  /** Where the answer came from: the generated artifact, or a failed read. */
  status: "ok" | "unavailable";
  generatedAt?: string;
  manifest?: string;
  layers: GisLayerSummary[];
  rejected: GisRejectedLayer[];
  /** Why the artifact could not be read, when `status` is `unavailable`. */
  error?: string;
}

/** Selecting a verified layer is expressed as `gis:<id>`. */
export function gisLayerKey(id: string): `gis:${string}` {
  return `gis:${id}`;
}

export function gisLayerIdFromKey(layerKey: string): string | null {
  return layerKey.startsWith("gis:") ? layerKey.slice(4) : null;
}
