"use client";

import { ArrowCounterClockwise, Info, MapTrifold } from "@phosphor-icons/react";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

import { LOCATION_CODES, LOCATIONS } from "@/lib/locations";
import type { MapLayerId } from "@/types";

import { HazardLayerControl } from "./HazardLayerControl";

export interface RiverMapProps {
  activeLayer: MapLayerId;
  onLayerChange: (layer: MapLayerId) => void;
  /** Extra classes for the map panel, e.g. sticky positioning on wide screens. */
  className?: string;
  /**
   * Require Ctrl/Cmd + scroll to zoom. Use it where the map sits pinned in a
   * scrolling page, so a wheel gesture over the map does not trap the page.
   */
  cooperativeGestures?: boolean;
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
  onLayerChange,
  className = "",
  cooperativeGestures = false,
}: RiverMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

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
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [retryKey, cooperativeGestures]);

  function resetView() {
    mapRef.current?.fitBounds(NCR_VIEW_BOUNDS, {
      padding: 28,
      duration: 700,
    });
  }

  const layerSummary =
    activeLayer === "base"
      ? `${BASEMAP.label}: roads, rivers, land, and place labels.`
      : activeLayer === "static"
        ? "Static hazard susceptibility is unavailable until a verified GIS layer is supplied."
        : "Experimental flood predictions are unavailable until weather and ML integration is complete.";

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

        <div className="pointer-events-none absolute top-4 left-4 flex items-start gap-2">
          <div className="pointer-events-auto rounded-control border border-line bg-canvas-soft/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <MapTrifold aria-hidden="true" size={18} weight="duotone" />
              <div>
                <h2 id="map-title" className="text-section">
                  NCR (Metro Manila)
                </h2>
                <p className="text-metadata mt-0.5 text-muted">
                  Interactive basemap · {BASEMAP.label}
                </p>
              </div>
            </div>
          </div>
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

        <div className="absolute top-4 right-4 hidden lg:block">
          <HazardLayerControl
            activeLayer={activeLayer}
            onLayerChange={onLayerChange}
          />
        </div>

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

        <div className="absolute right-4 bottom-14 left-4 flex flex-col items-stretch justify-between gap-3 sm:right-5 sm:left-5 lg:flex-row lg:items-end">
          <div className="w-full rounded-panel border border-line bg-canvas-soft/95 p-3 text-ink shadow-lg backdrop-blur-sm lg:max-w-[270px]">
            <p className="text-button">
              {activeLayer === "base" ? "Basemap" : "RiverGuard overlay"}
            </p>
            <p className="text-metadata mt-2 text-muted">{layerSummary}</p>
            <p className="text-metadata mt-2 border-t border-line pt-2 text-muted">
              No RiverGuard prediction or hazard geometry is being fabricated on
              this map.
            </p>
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

          <div className="flex max-w-sm items-start gap-2.5 rounded-panel bg-canvas-soft/95 p-3 text-ink shadow-lg backdrop-blur-sm">
            <Info aria-hidden="true" size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-button">RiverGuard data coverage</p>
              <p className="text-metadata mt-1 text-muted">
                City-level development coverage: Quezon City, Marikina, Manila,
                and Pasig.
              </p>
              <p className="text-metadata mt-0.5 text-muted">
                Boundaries, stations, and hazard layers still require verified
                local GIS files.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid shrink-0 gap-px bg-line text-ink sm:grid-cols-[190px_repeat(4,1fr)]">
        <div className="bg-canvas-soft/95 px-4 py-3 backdrop-blur-sm">
          <p className="text-button">Supported data</p>
          <p className="text-metadata mt-0.5 text-muted">
            City-level development records
          </p>
        </div>
        {LOCATION_CODES.map((code) => {
          const city = LOCATIONS[code];
          return (
            <div
              key={city.code}
              className="hidden bg-canvas-soft/95 px-3 py-3 backdrop-blur-sm sm:block"
            >
              <p className="text-metadata flex items-center gap-2 text-ink">
                <span className="size-2 rounded-full bg-success" /> {city.name}
              </p>
              <p className="text-metadata mt-1 text-muted">
                City-level dataset
              </p>
              <p className="text-metadata text-muted">
                Alarms {city.alarmLevelsM.join(" / ")} m
                {city.alarmsVerified ? "" : " (indicative)"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
