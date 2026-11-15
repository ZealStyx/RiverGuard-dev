import { CheckCircle, Circle, Info } from "@phosphor-icons/react";

import type { MapLayerId } from "@/types";

export interface HazardLayerControlProps {
  activeLayer: MapLayerId;
  onLayerChange: (layer: MapLayerId) => void;
}

const layers: Array<{
  available: boolean;
  id: MapLayerId;
  label: string;
  description: string;
}> = [
  {
    id: "base",
    label: "OpenStreetMap basemap",
    description: "Roads, rivers, land, and place labels",
    available: true,
  },
  {
    id: "static",
    label: "Static hazard susceptibility",
    description: "Unavailable · verified hazard data required",
    available: false,
  },
  {
    id: "experimental",
    label: "Experimental outlook",
    description: "Unavailable · weather and ML integration required",
    available: false,
  },
];

export function HazardLayerControl({
  activeLayer,
  onLayerChange,
}: HazardLayerControlProps) {
  return (
    <fieldset
      aria-labelledby="map-layers-title"
      className="w-[250px] rounded-panel border border-line bg-canvas-soft/95 p-3 text-ink shadow-xl backdrop-blur-sm"
    >
      <p
        id="map-layers-title"
        className="text-section border-b border-line pb-2"
      >
        Map layers
      </p>
      <div className="mt-2 grid">
        {layers.map((layer) => {
          const selected = activeLayer === layer.id;
          const Icon = selected ? CheckCircle : Circle;

          return (
            <label
              key={layer.id}
              className={`flex gap-2.5 py-2.5 ${
                layer.id !== "experimental" ? "border-b border-line" : ""
              } ${
                layer.available
                  ? "cursor-pointer"
                  : "cursor-not-allowed opacity-60"
              }`}
            >
              <input
                type="radio"
                name="map-layer"
                value={layer.id}
                checked={selected}
                disabled={!layer.available}
                onChange={() => onLayerChange(layer.id)}
                className="sr-only"
              />
              <Icon
                aria-hidden="true"
                size={18}
                weight={selected ? "fill" : "regular"}
                className={selected ? "text-brand-secondary" : "text-muted"}
              />
              <span>
                <span className="text-button block">{layer.label}</span>
                <span className="text-metadata mt-0.5 block text-muted">
                  {layer.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <p className="text-metadata mt-2 flex items-start gap-1.5 text-muted">
        <Info aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
        RiverGuard overlays are hidden until verified local GIS data is added.
      </p>
    </fieldset>
  );
}
