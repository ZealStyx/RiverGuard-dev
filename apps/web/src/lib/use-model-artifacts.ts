"use client";

/** Client subscription to `GET /api/model` (the trained artifacts). */

import { useEffect, useState } from "react";

import type {
  ModelArtifactSummary,
  ModelMetricsSummary,
} from "@/lib/ml-artifacts";

export interface ModelArtifactsState {
  model: ModelArtifactSummary | null;
  metrics: ModelMetricsSummary | null;
  error: string | null;
  loading: boolean;
}

export function useModelArtifacts(): ModelArtifactsState {
  const [state, setState] = useState<ModelArtifactsState>({
    model: null,
    metrics: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    fetch("/api/model")
      .then(async (response) => {
        const payload = (await response.json()) as {
          model?: ModelArtifactSummary;
          metrics?: ModelMetricsSummary;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Model artifacts unavailable");
        }
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setState({
          model: payload.model ?? null,
          metrics: payload.metrics ?? null,
          error: null,
          loading: false,
        });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            model: null,
            metrics: null,
            error:
              error instanceof Error
                ? error.message
                : "Model artifacts unavailable",
            loading: false,
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
