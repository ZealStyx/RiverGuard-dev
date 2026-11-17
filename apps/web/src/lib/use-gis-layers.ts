"use client";

import { useEffect, useState } from "react";

import type { GisLayersResponse } from "./gis-types";

const EMPTY: GisLayersResponse = {
  status: "ok",
  layers: [],
  rejected: [],
};

/**
 * One shared request for the verified layer list.
 *
 * The map and the layer panel both need it, and the answer is the same for the
 * whole page, so the promise is cached in module scope: navigating between
 * screens reuses it, and a newly verified layer shows up after a reload (which
 * is the right trade — the list changes only when someone runs the verifier).
 */
let pending: Promise<GisLayersResponse> | null = null;

function requestLayers(): Promise<GisLayersResponse> {
  if (!pending) {
    pending = fetch("/api/gis/layers", { cache: "no-store" })
      .then((response) => response.json() as Promise<GisLayersResponse>)
      .then((data): GisLayersResponse =>
        Array.isArray(data?.layers)
          ? data
          : { ...EMPTY, status: "unavailable" },
      )
      .catch((): GisLayersResponse => ({
        ...EMPTY,
        status: "unavailable",
        error:
          "The verified GIS layer list could not be read. Run npm run gis:verify.",
      }));
  }
  return pending;
}

export function useGisLayers(): GisLayersResponse & { loading: boolean } {
  const [state, setState] = useState<{
    loading: boolean;
    data: GisLayersResponse;
  }>({ loading: true, data: EMPTY });

  useEffect(() => {
    let cancelled = false;
    void requestLayers().then((data) => {
      if (!cancelled) setState({ loading: false, data });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...state.data, loading: state.loading };
}
