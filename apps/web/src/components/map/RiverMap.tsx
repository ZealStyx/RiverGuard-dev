"use client";

import { ArrowCounterClockwise, Info, MapTrifold } from "@phosphor-icons/react";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

import { supportedCities } from "@/data/dashboard";
import type { MapLayerId } from "@/types";

import { HazardLayerControl } from "./HazardLayerControl";

export interface RiverMapProps {
  activeLayer: MapLayerId;
  onLayerChange: (layer: MapLayerId) => void;
}

type MapStatus = "loading" | "ready" | "error";

// These bounds are a viewport for the NCR basemap only. They are not a
// RiverGuard boundary, prediction, station location, or hazard layer.
const NCR_VIEW_BOUNDS: [[number, number], [number, number]] = [
  [120.82, 14.38],
  [121.24, 14.88],
];

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>',
    },
  },
  layers: [
    {
      id: "osm-raster",
      type: "raster",
      source: "osm",
      paint: {
        "raster-opacity": 1,
      },
    },
  ],
};

export function RiverMap({ activeLayer, onLayerChange }: RiverMapProps) {
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
        style: OSM_STYLE,
        bounds: NCR_VIEW_BOUNDS,
        fitBoundsOptions: { padding: 28 },
        minZoom: 9,
        maxZoom: 19,
        hash: false,
        attributionControl: false,
      });

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: true }),
        "top-right",
      );
      map.addControl(new maplibregl.FullscreenControl(), "top-right");
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
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
        setMapError(
          event.error?.message ??
            "The OpenStreetMap tiles could not be loaded. Check the local network connection and retry.",
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
  }, [retryKey]);

  function resetView() {
    mapRef.current?.fitBounds(NCR_VIEW_BOUNDS, {
      padding: 28,
      duration: 700,
    });
  }

  const layerSummary =
    activeLayer === "base"
      ? "OpenStreetMap basemap: roads, rivers, land, and place labels."
      : activeLayer === "static"
        ? "Static hazard susceptibility is unavailable until a verified GIS layer is supplied."
        : "Experimental flood predictions are unavailable until weather and ML integration is complete.";

  return (
    <section
      id="map-workspace"
      aria-labelledby="map-title"
      data-dashboard-section
      className="relative min-h-[610px] overflow-hidden rounded-panel bg-line min-[1180px]:min-h-[680px]"
    >
      <div
        ref={mapContainerRef}
        aria-label="Interactive OpenStreetMap basemap of the National Capital Region"
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
                Interactive OpenStreetMap basemap
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
            Loading OpenStreetMap basemap…
          </div>
        </div>
      ) : null}

      {mapStatus === "error" ? (
        <div className="absolute inset-x-4 top-24 flex justify-center">
          <div className="max-w-md rounded-control border border-danger/30 bg-canvas-soft/95 p-3 text-ink shadow-lg">
            <p className="text-button">Map tiles unavailable</p>
            <p className="text-metadata mt-1 text-muted">
              {mapError ?? "The basemap could not be loaded."}
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

      <div className="absolute right-4 bottom-28 left-4 flex flex-col items-stretch justify-between gap-3 sm:right-5 sm:bottom-24 sm:left-5 lg:flex-row lg:items-end">
        <div className="w-full rounded-panel border border-line bg-canvas-soft/95 p-3 text-ink shadow-lg backdrop-blur-sm lg:max-w-[270px]">
          <p className="text-button">
            {activeLayer === "base" ? "Basemap" : "RiverGuard overlay"}
          </p>
          <p className="text-metadata mt-2 text-muted">{layerSummary}</p>
          <p className="text-metadata mt-2 border-t border-line pt-2 text-muted">
            No RiverGuard prediction or hazard geometry is being fabricated on
            this map.
          </p>
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

      <div className="absolute right-0 bottom-0 left-0 grid gap-px bg-line text-ink sm:grid-cols-[190px_repeat(4,1fr)]">
        <div className="bg-canvas-soft/95 px-4 py-3 backdrop-blur-sm">
          <p className="text-button">Supported data</p>
          <p className="text-metadata mt-0.5 text-muted">
            City-level development records
          </p>
        </div>
        {supportedCities.map((city) => (
          <div
            key={city.id}
            className="hidden bg-canvas-soft/95 px-3 py-3 backdrop-blur-sm sm:block"
          >
            <p className="text-metadata flex items-center gap-2 text-ink">
              <span className="size-2 rounded-full bg-success" /> {city.name}
            </p>
            <p className="text-metadata mt-1 text-muted">City-level sample</p>
          </div>
        ))}
      </div>
    </section>
  );
}
