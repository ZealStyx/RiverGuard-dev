import { CheckCircle, Circle, Info, Warning } from "@phosphor-icons/react";

import type { GisLayerSummary, GisRejectedLayer } from "@/lib/gis-types";
import { gisLayerKey } from "@/lib/gis-types";
import type { MapLayerId } from "@/types";

export interface HazardLayerControlProps {
  activeLayer: MapLayerId;
  onLayerChange: (layer: MapLayerId) => void;
  /** Layers the verifier accepted; these are the only RiverGuard overlays. */
  verified: GisLayerSummary[];
  /** Declared in the manifest but refused by the verifier. */
  rejected: GisRejectedLayer[];
  loading?: boolean;
}

const CLASSIFICATION_LABEL: Record<GisLayerSummary["classification"], string> =
  {
    hazard: "Hazard",
    boundary: "Boundary",
    stations: "Stations",
  };

function Row({
  id,
  label,
  description,
  available,
  selected,
  onSelect,
  last,
}: {
  id: MapLayerId;
  label: string;
  description: string;
  available: boolean;
  selected: boolean;
  onSelect: (layer: MapLayerId) => void;
  last?: boolean;
}) {
  const Icon = selected ? CheckCircle : Circle;
  return (
    <label
      className={`flex gap-2.5 py-2.5 ${last ? "" : "border-b border-line"} ${
        available ? "cursor-pointer" : "cursor-not-allowed opacity-60"
      }`}
    >
      <input
        type="radio"
        name="map-layer"
        value={id}
        checked={selected}
        disabled={!available}
        onChange={() => onSelect(id)}
        className="sr-only"
      />
      <Icon
        aria-hidden="true"
        size={18}
        weight={selected ? "fill" : "regular"}
        className={selected ? "text-brand-secondary" : "text-muted"}
      />
      <span className="min-w-0">
        <span className="text-button block">{label}</span>
        <span className="text-metadata mt-0.5 block text-muted">
          {description}
        </span>
      </span>
    </label>
  );
}

/**
 * The layer list is derived, never typed by hand: a RiverGuard overlay exists
 * here only if `npm run gis:verify` accepted a local file for it. With no
 * verified files the panel explains what is missing, which is what a clean
 * checkout shows.
 */
export function HazardLayerControl({
  activeLayer,
  onLayerChange,
  verified,
  rejected,
  loading = false,
}: HazardLayerControlProps) {
  const hasHazardLayer = verified.some(
    (layer) => layer.classification === "hazard",
  );
  const activeVerified = verified.find(
    (layer) => gisLayerKey(layer.id) === activeLayer,
  );

  return (
    <fieldset
      aria-labelledby="map-layers-title"
      className="max-h-[calc(100%-1rem)] w-[250px] overflow-y-auto rounded-panel border border-line bg-canvas-soft/95 p-3 text-ink shadow-xl backdrop-blur-sm"
    >
      <p
        id="map-layers-title"
        className="text-section border-b border-line pb-2"
      >
        Map layers
      </p>
      <div className="mt-2 grid">
        <Row
          available
          description="Roads, rivers, land, and place labels"
          id="base"
          label="Basemap (OpenStreetMap data)"
          onSelect={onLayerChange}
          selected={activeLayer === "base"}
        />

        {verified.map((layer, index) => (
          <Row
            key={layer.id}
            available
            description={`${CLASSIFICATION_LABEL[layer.classification]} · ${layer.featureCount.toLocaleString()} feature${
              layer.featureCount === 1 ? "" : "s"
            } · ${layer.source.publisher}`}
            id={gisLayerKey(layer.id)}
            label={layer.title}
            last={
              index === verified.length - 1 &&
              hasHazardLayer &&
              verified.length > 0
            }
            onSelect={onLayerChange}
            selected={activeLayer === gisLayerKey(layer.id)}
          />
        ))}

        {hasHazardLayer ? null : (
          <Row
            available={false}
            description="Unavailable · no verified hazard layer in data/gis"
            id="static"
            label="Static hazard susceptibility"
            onSelect={onLayerChange}
            selected={activeLayer === "static"}
          />
        )}

        <Row
          available={false}
          description="Not offered · the model is city-level, so it has no geometry to draw"
          id="experimental"
          label="Experimental outlook"
          last
          onSelect={onLayerChange}
          selected={activeLayer === "experimental"}
        />
      </div>

      {activeVerified?.classColors ? (
        <div className="mt-2 border-t border-line pt-2">
          <p className="text-metadata text-ink">
            {activeVerified.title} classes
          </p>
          <ul className="text-metadata mt-1 grid gap-1">
            {Object.entries(activeVerified.classColors).map(
              ([name, colour]) => (
                <li key={name} className="flex items-center gap-2 text-muted">
                  <span
                    aria-hidden="true"
                    className="size-3 rounded-sm border border-line"
                    style={{ backgroundColor: colour }}
                  />
                  {name}
                </li>
              ),
            )}
          </ul>
          <p className="text-metadata mt-2 text-muted">
            {activeVerified.source.publisher} · {activeVerified.source.license}{" "}
            · retrieved {activeVerified.source.retrievedAt}
          </p>
        </div>
      ) : null}

      {rejected.length > 0 ? (
        <details className="mt-2 border-t border-line pt-2">
          <summary className="text-metadata cursor-pointer text-warning">
            <Warning aria-hidden="true" size={13} className="mr-1 inline" />
            {rejected.length} declared layer{rejected.length === 1 ? "" : "s"}{" "}
            failed verification
          </summary>
          <ul className="text-metadata mt-1 grid gap-1.5 text-muted">
            {rejected.map((layer) => (
              <li key={layer.id}>
                <span className="font-semibold text-ink">{layer.id}</span>
                <span className="block">{layer.problems[0]}</span>
              </li>
            ))}
          </ul>
          <p className="text-metadata mt-1 text-muted">
            Fix them and re-run npm run gis:verify.
          </p>
        </details>
      ) : null}

      <p className="text-metadata mt-2 flex items-start gap-1.5 border-t border-line pt-2 text-muted">
        <Info aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
        {loading
          ? "Reading verified local layers…"
          : verified.length === 0
            ? "RiverGuard overlays are hidden until verified local GIS data is added."
            : "Overlays are local files accepted by npm run gis:verify. Nothing is fetched from a GIS service at runtime."}
      </p>
    </fieldset>
  );
}
