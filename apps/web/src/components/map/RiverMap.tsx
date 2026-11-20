"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react";
import type {
  ExpressionSpecification,
  Map as MapLibreMap,
  Marker,
  StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

import type { GisLayerSummary } from "@/lib/gis-types";
import { gisLayerIdFromKey, gisLayerKey } from "@/lib/gis-types";
import { useGisLayers } from "@/lib/use-gis-layers";
import { LOCATION_CODES, LOCATIONS, type LocationCode } from "@/lib/locations";
import type { OutlookSnapshot } from "@/lib/outlook";
import type { MapLayerId } from "@/types";

export interface RiverMapProps {
  activeLayer: MapLayerId;
  onLayerChange: (layer: MapLayerId) => void;
  hideChrome?: boolean;
  /** Extra classes for the map panel, e.g. sticky positioning on wide screens. */
  className?: string;
  /**
   * Require Ctrl/Cmd + scroll to zoom. Use it where the map sits pinned in a
   * scrolling page, so a wheel gesture over the map does not trap the page.
   */
  cooperativeGestures?: boolean;
  /** Real city-level outlook for the selected location. */
  forecast?: OutlookSnapshot | null;
  /** City currently represented by the map marker. */
  locationCode?: LocationCode;
  /** Selected index in the forecast's day array. */
  selectedDay?: number;
  onDayChange?: (index: number) => void;
  onLocationChange?: (locationCode: LocationCode) => void;
}

type MapStatus = "loading" | "ready" | "error";

// These bounds are a viewport for the NCR basemap only. They are not a
// RiverGuard boundary, prediction, station location, or hazard layer.
const NCR_VIEW_BOUNDS: [[number, number], [number, number]] = [
  [120.82, 14.38],
  [121.24, 14.88],
];

/**
 * Basemap tiles and the OpenStreetMap tile usage policy
 * (https://operations.osmfoundation.org/policies/tiles/).
 *
 * The default layer is the OSM Standard raster tiles from the volunteer-run
 * `tile.openstreetmap.org`, which is donated capacity with rules attached. How
 * this map keeps to them:
 *
 * - Attribution is always on screen: `AttributionControl` below is created with
 *   `compact: false`, and the panel layout keeps a clear band above the footer
 *   so no RiverGuard overlay can cover it. It is never behind a toggle.
 * - Tiles are requested by the browser on the page, so the browser's own
 *   User-Agent and a real `Referer` are sent. Nothing here sets a no-referrer
 *   policy or a no-cache header; caching is the browser's, honouring OSM's
 *   `Cache-Control`/`ETag`.
 * - The URL is the exact HTTPS template and is overridable through
 *   `NEXT_PUBLIC_MAP_TILE_URL` (with `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` for the
 *   new provider's credit), so switching providers needs no code change.
 * - Only the tiles for the viewport being looked at are fetched. There is no
 *   prefetch, no "download this area", and no background tile fetching.
 *
 * Normal interactive viewing like this is permitted. Bulk use, offline use, or
 * serving many users from this layer is not: a public deployment must point
 * these variables at a provider that permits it, or self-host tiles.
 */
const OSM_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>';
const CARTO_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> · <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">© CARTO</a>';

interface BasemapPreset {
  /** Shown in the map header, the error card, and the layer summary. */
  label: string;
  url: string;
  attribution: string;
  maxzoom: number;
}

/**
 * Tile providers this build knows by name.
 *
 * `osm` is the default because it is the only one whose terms are written down
 * for this use. It is also the one that blocks: OSM's volunteers answer `403
 * Access blocked` to origins they consider unidentifiable or abusive, which is
 * their right under § 7 of the policy and which a shared preview/sandbox origin
 * can trip. Set `NEXT_PUBLIC_MAP_TILE_PROVIDER=carto` when that happens, or
 * point `NEXT_PUBLIC_MAP_TILE_URL` at any other raster provider.
 */
const BASEMAP_PRESETS: Record<string, BasemapPreset> = {
  osm: {
    label: "OpenStreetMap Standard",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: OSM_ATTRIBUTION,
    maxzoom: 19,
  },
  carto: {
    // CARTO's public basemaps: OSM data, no key, attribution required.
    label: "CARTO Light (OpenStreetMap data)",
    url: "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    attribution: CARTO_ATTRIBUTION,
    maxzoom: 20,
  },
};

function resolveBasemap(): BasemapPreset {
  const customUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim();
  if (customUrl) {
    return {
      label: "Custom tile provider",
      url: customUrl,
      attribution:
        process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION?.trim() || OSM_ATTRIBUTION,
      maxzoom: 19,
    };
  }
  const requested = (process.env.NEXT_PUBLIC_MAP_TILE_PROVIDER ?? "osm")
    .trim()
    .toLowerCase();
  return BASEMAP_PRESETS[requested] ?? BASEMAP_PRESETS.osm;
}

const BASEMAP = resolveBasemap();
const USING_OSM_TILES = BASEMAP.url.includes("tile.openstreetmap.org");

const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: "raster",
      tiles: [BASEMAP.url],
      tileSize: 256,
      maxzoom: BASEMAP.maxzoom,
      attribution: BASEMAP.attribution,
    },
  },
  layers: [
    {
      id: "basemap-raster",
      type: "raster",
      source: "basemap",
      paint: {
        "raster-opacity": 1,
      },
    },
  ],
};

export function RiverMap({
  activeLayer,
  className = "",
  cooperativeGestures = false,
  forecast = null,
  hideChrome = false,
  locationCode,
  onDayChange,
  onLocationChange,
  selectedDay = 0,
}: RiverMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const gis = useGisLayers();

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    void import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !mapContainerRef.current) return;

      // Next.js does not automatically expose MapLibre's module worker when
      // the library is dynamically imported. Serve the pinned worker through
      // a same-origin route so vector/raster tile parsing works locally.
      maplibregl.setWorkerUrl("/maplibre-worker");

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: BASEMAP_STYLE,
        bounds: NCR_VIEW_BOUNDS,
        fitBoundsOptions: { padding: 28 },
        minZoom: 9,
        maxZoom: 19,
        hash: false,
        attributionControl: false,
        cooperativeGestures,
      });

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: true }),
        "top-right",
      );
      map.addControl(new maplibregl.FullscreenControl(), "top-right");
      // Never collapsed: the OSM tile policy forbids hiding attribution behind
      // a toggle, and this control is the canonical place for it.
      map.addControl(
        new maplibregl.AttributionControl({ compact: false }),
        "bottom-right",
      );

      resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(mapContainerRef.current);

      map.once("load", () => {
        map.resize();
        if (!cancelled) setMapStatus("ready");
      });

      map.on("error", (event) => {
        if (cancelled) return;
        // A verified overlay that fails to load is not a basemap failure: the
        // tiles are fine, one local layer is not. Say which. MapLibre includes
        // the source id on source errors, but its typings omit it.
        const { sourceId } = event as { sourceId?: string };
        if (sourceId?.startsWith("gis-")) {
          setOverlayError(
            event.error?.message ??
              `Layer ${sourceId.replace(/^gis-/, "")} could not be loaded.`,
          );
          return;
        }
        setMapStatus("error");
        const detail = event.error?.message;
        setMapError(
          detail
            ? `${BASEMAP.label}: ${detail}`
            : `${BASEMAP.label} did not serve these tiles. The provider may be refusing the request (HTTP 403) or the network may be blocking it.`,
        );
      });

      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [retryKey, cooperativeGestures]);

  // Draw the verified overlays.
  //
  // Sources are added once per verified layer and then only toggled, so
  // switching between layers never refetches geometry. Nothing is added at all
  // when the verification artifact lists no layers — which is what a clean
  // checkout has, and why this map draws no RiverGuard geometry.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapStatus !== "ready") return;

    const colourFor = (
      layer: GisLayerSummary,
    ): string | ExpressionSpecification => {
      if (!layer.classProperty || !layer.classColors) return layer.strokeColor;
      const expression: unknown[] = ["match", ["get", layer.classProperty]];
      for (const [value, colour] of Object.entries(layer.classColors)) {
        expression.push(value, colour);
      }
      // A value outside the declared classes was rejected by the verifier, but
      // keep a neutral fallback rather than a missing colour.
      expression.push("#94a3b8");
      return expression as ExpressionSpecification;
    };

    for (const layer of gis.layers) {
      const sourceId = `gis-${layer.id}`;
      const visibility: "visible" | "none" =
        activeLayer === gisLayerKey(layer.id) ? "visible" : "none";
      const colour = colourFor(layer);

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: "geojson", data: layer.url });
      }
      if (layer.geometry === "polygon") {
        const fillId = `${sourceId}-fill`;
        const outlineId = `${sourceId}-outline`;
        if (!map.getLayer(fillId)) {
          map.addLayer({
            id: fillId,
            type: "fill",
            source: sourceId,
            layout: { visibility },
            paint: { "fill-color": colour, "fill-opacity": layer.fillOpacity },
          });
        }
        if (!map.getLayer(outlineId)) {
          map.addLayer({
            id: outlineId,
            type: "line",
            source: sourceId,
            layout: { visibility },
            paint: {
              "line-color": layer.strokeColor,
              "line-width": 1.2,
              "line-opacity": 0.9,
            },
          });
        }
        map.setLayoutProperty(fillId, "visibility", visibility);
        map.setLayoutProperty(outlineId, "visibility", visibility);
        continue;
      }

      if (layer.geometry === "line") {
        const lineId = `${sourceId}-line`;
        if (!map.getLayer(lineId)) {
          map.addLayer({
            id: lineId,
            type: "line",
            source: sourceId,
            layout: { visibility },
            paint: {
              "line-color": colour,
              "line-width": 2,
              "line-opacity": 0.85,
            },
          });
        }
        map.setLayoutProperty(lineId, "visibility", visibility);
        continue;
      }

      const pointId = `${sourceId}-point`;
      if (!map.getLayer(pointId)) {
        map.addLayer({
          id: pointId,
          type: "circle",
          source: sourceId,
          layout: { visibility },
          paint: {
            "circle-color": colour,
            "circle-radius": 4.5,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.5,
          },
        });
      }
      map.setLayoutProperty(pointId, "visibility", visibility);
    }
  }, [activeLayer, gis.layers, mapStatus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapStatus !== "ready") return;

    let cancelled = false;
    void import("maplibre-gl").then((maplibregl) => {
      if (cancelled) return;

      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];

      const activeIndex = Math.min(
        selectedDay,
        Math.max((forecast?.days.length ?? 1) - 1, 0),
      );
      const activeDay = forecast?.days[activeIndex];

      for (const code of LOCATION_CODES) {
        const location = LOCATIONS[code];
        const selected = code === locationCode;
        const element = document.createElement("button");
        element.type = "button";
        element.setAttribute("aria-label", `${location.name} city forecast`);
        element.className =
          "inline-flex min-h-8 items-center gap-1.5 rounded-full border-2 border-white px-2.5 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(7,42,76,0.22)] transition";

        let probability: number | null = null;
        let label = "No run";
        if (selected && activeDay) {
          probability = activeDay.probability ?? null;
          label = activeDay.label;
        }

        if (selected && probability !== null) {
          element.style.background =
            label === "Elevated"
              ? "#b9443f"
              : label === "Moderate"
                ? "#a36726"
                : "#147384";
          element.textContent = `${location.name} · ${(probability * 100).toFixed(0)}%`;
        } else if (selected) {
          element.style.background = "#64748b";
          element.textContent = `${location.name} · No data`;
        } else {
          element.style.background = "rgba(9, 40, 71, 0.72)";
          element.textContent = location.name;
        }

        element.onpointerdown = (event) => event.stopPropagation();
        element.onclick = () => onLocationChange?.(code);

        const marker = new maplibregl.Marker({
          element,
          anchor: "center",
        })
          .setLngLat([location.longitude, location.latitude])
          .addTo(map);
        markersRef.current.push(marker);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [forecast, locationCode, mapStatus, onLocationChange, selectedDay]);

  function resetView() {
    mapRef.current?.fitBounds(NCR_VIEW_BOUNDS, {
      padding: 28,
      duration: 700,
    });
  }

  const activeGisId = gisLayerIdFromKey(activeLayer);
  const activeGisLayer =
    gis.layers.find((layer) => layer.id === activeGisId) ?? null;
  const activeIndex = Math.min(
    selectedDay,
    Math.max((forecast?.days.length ?? 1) - 1, 0),
  );
  const activeDay = forecast?.days[activeIndex] ?? null;
  const selectedLocation = locationCode ? LOCATIONS[locationCode] : null;

  const layerSummary = activeGisLayer
    ? `${activeGisLayer.description || `${activeGisLayer.title} from a verified local file.`} Source: ${activeGisLayer.source.publisher}, ${activeGisLayer.source.license}, retrieved ${activeGisLayer.source.retrievedAt}.`
    : activeLayer === "base" || activeGisId !== null
      ? `${BASEMAP.label}: roads, rivers, land, and place labels.`
      : activeLayer === "static"
        ? "Static hazard susceptibility needs a verified hazard layer in data/gis. None is loaded, so nothing is drawn."
        : "The model works at city level, so it produces numbers per city, not geometry. There is no map overlay to draw from it.";

  // The map fills whatever height it is given, so a tall sibling column used to
  // stretch it into a 1000px+ panel. The height is bounded instead, and the
  // caller decides whether it stays pinned while that column scrolls.
  return (
    <section
      id="map-workspace"
      aria-labelledby="map-title"
      data-dashboard-section
      className={`relative flex h-[610px] scroll-mt-24 flex-col overflow-hidden rounded-panel bg-line min-[1180px]:h-[clamp(560px,calc(100dvh-10rem),720px)] min-[1180px]:self-start ${className}`}
    >
      {/* The canvas area. Everything that floats over the map lives in here, and
          the footer strip below is a sibling, so the attribution control at the
          bottom-right of the canvas can never be painted over. */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={mapContainerRef}
          aria-label="Interactive basemap of the National Capital Region"
          className="absolute inset-0 h-full w-full"
        />

        {hideChrome ? null : (
          <div className="pointer-events-none absolute top-4 left-4">
            <button
              type="button"
              onClick={resetView}
              aria-label="Reset NCR map view"
              title="Reset NCR map view"
              className="pointer-events-auto inline-flex size-9 items-center justify-center rounded-control border border-line bg-canvas-soft/95 text-muted shadow-lg hover:bg-canvas hover:text-ink"
            >
              <ArrowCounterClockwise aria-hidden="true" size={17} />
            </button>
          </div>
        )}

        {mapStatus === "loading" ? (
          <div className="absolute inset-x-4 top-24 flex justify-center">
            <div className="rounded-control border border-line bg-canvas-soft/95 px-3 py-2 text-metadata text-muted shadow-lg">
              Loading {BASEMAP.label}…
            </div>
          </div>
        ) : null}

        {mapStatus === "error" ? (
          <div className="absolute inset-x-4 top-24 flex justify-center">
            <div className="max-w-md rounded-control border border-danger/30 bg-canvas-soft/95 p-3 text-ink shadow-lg">
              <p className="text-button">Map tiles unavailable</p>
              <p className="text-metadata mt-1 text-muted">
                {mapError ?? "The basemap could not be loaded."} Retry, or point
                the map at another provider with NEXT_PUBLIC_MAP_TILE_PROVIDER.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMapStatus("loading");
                  setMapError(null);
                  setRetryKey((value) => value + 1);
                }}
                className="text-button mt-2 rounded-control border border-line px-2.5 py-1.5 hover:bg-canvas"
              >
                Retry map
              </button>
            </div>
          </div>
        ) : null}

        {overlayError ? (
          <div className="absolute inset-x-4 top-24 flex justify-center">
            <div className="max-w-md rounded-control border border-danger/30 bg-canvas-soft/95 p-3 text-ink shadow-lg">
              <p className="text-button">Verified layer could not be drawn</p>
              <p className="text-metadata mt-1 text-muted">{overlayError}</p>
              <p className="text-metadata mt-1 text-muted">
                The basemap is unaffected. Re-run npm run gis:verify to confirm
                the file still matches its recorded checksum.
              </p>
            </div>
          </div>
        ) : null}

        {hideChrome ? null : (
          <div className="absolute right-4 bottom-14 left-4 flex flex-col items-stretch justify-between gap-3 sm:right-5 sm:left-5 lg:flex-row lg:items-end">
            <div className="w-full rounded-panel border border-line bg-canvas-soft/95 p-3 text-ink shadow-lg backdrop-blur-sm lg:max-w-[270px]">
              <p className="text-button">
                {activeLayer === "base" ? "Basemap" : "RiverGuard overlay"}
              </p>
              <p className="text-metadata mt-2 text-muted">{layerSummary}</p>
              {USING_OSM_TILES ? (
                <p className="text-metadata mt-2 text-muted">
                  Tiles from OpenStreetMap&apos;s volunteer servers:{" "}
                  <a
                    className="underline underline-offset-2 hover:text-ink"
                    href="https://www.openstreetmap.org/fixthemap"
                    target="_blank"
                    rel="noreferrer"
                  >
                    report a map issue
                  </a>
                  .
                </p>
              ) : null}
            </div>
            {selectedLocation ? (
              <div className="pointer-events-auto w-full rounded-panel border border-line bg-canvas/95 p-3 text-ink shadow-lg backdrop-blur-sm lg:max-w-[360px]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-metadata uppercase tracking-[0.12em] text-brand-secondary">
                      City-level outlook
                    </p>
                    <p className="text-section mt-1">{selectedLocation.name}</p>
                  </div>
                  {activeDay ? (
                    <span
                      className={
                        activeDay.label === "Elevated"
                          ? "rounded-full bg-danger/10 px-2 py-1 text-metadata font-semibold text-danger"
                          : activeDay.label === "Moderate"
                            ? "rounded-full bg-warning/10 px-2 py-1 text-metadata font-semibold text-warning"
                            : "rounded-full bg-brand-secondary-soft px-2 py-1 text-metadata font-semibold text-brand-secondary"
                      }
                    >
                      {activeDay.label}
                    </span>
                  ) : null}
                </div>
                {activeDay ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-metadata text-muted">Probability</p>
                      <p className="text-button mt-0.5">
                        {activeDay.probability === undefined
                          ? "—"
                          : `${(activeDay.probability * 100).toFixed(1)}%`}
                      </p>
                    </div>
                    <div>
                      <p className="text-metadata text-muted">Rainfall</p>
                      <p className="text-button mt-0.5">
                        {activeDay.rainfallMm === undefined
                          ? "—"
                          : `${activeDay.rainfallMm.toFixed(1)} mm`}
                      </p>
                    </div>
                    <div>
                      <p className="text-metadata text-muted">Level proxy</p>
                      <p className="text-button mt-0.5">
                        {activeDay.waterLevelM === undefined
                          ? "—"
                          : `${activeDay.waterLevelM.toFixed(2)} m`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-metadata mt-3 text-muted">
                    Run a forecast to place the first city-level result on this
                    map.
                  </p>
                )}
                {forecast?.days.length ? (
                  <div
                    className="mt-3 grid grid-cols-7 gap-1 border-t border-line pt-2"
                    aria-label="Forecast day timeline"
                  >
                    {forecast.days.map((day, index) => (
                      <button
                        key={day.isoDate}
                        type="button"
                        onClick={() => onDayChange?.(index)}
                        aria-pressed={activeIndex === index}
                        className={
                          activeIndex === index
                            ? "rounded-control bg-brand-primary px-1 py-1.5 text-metadata font-semibold text-white"
                            : "rounded-control border border-line bg-canvas px-1 py-1.5 text-metadata text-muted hover:bg-canvas-soft"
                        }
                        title={`${day.isoDate} · ${day.label}`}
                      >
                        {day.day.slice(0, 2)}
                      </button>
                    ))}
                  </div>
                ) : null}
                <p className="text-metadata mt-2 text-muted">
                  Experimental city-level index. Not a gauge reading or
                  street-level warning.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
