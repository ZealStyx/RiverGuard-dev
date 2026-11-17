"use client";

/** Client subscription to `GET /api/dataset`, which reads the real CSV. */

import { useEffect, useState } from "react";

import type { DatasetMeta } from "@/types";

export interface DatasetMetaState {
  dataset: DatasetMeta | null;
  error: string | null;
  loading: boolean;
}

export function useDatasetMeta(): DatasetMetaState {
  const [state, setState] = useState<DatasetMetaState>({
    dataset: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    fetch("/api/dataset")
      .then(async (response) => {
        const payload = (await response.json()) as DatasetMeta & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Dataset unavailable");
        }
        return payload;
      })
      .then((payload) => {
        if (active) setState({ dataset: payload, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            dataset: null,
            error:
              error instanceof Error ? error.message : "Dataset unavailable",
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
