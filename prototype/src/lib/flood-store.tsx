import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SCALES,
  DEFAULT_THRESHOLDS,
  DEFAULT_WEIGHTS,
  PRESETS,
  presetById,
} from "@/data/laguna";
import type { ForecastDay, Scales, Thresholds, Weights } from "@/lib/flood-model";

const STORAGE_KEY = "baha-laguna-desk-v1";

type DeskState = {
  days: ForecastDay[];
  weights: Weights;
  scales: Scales;
  thresholds: Thresholds;
  presetId: string;
};

type FloodContextValue = DeskState & {
  ready: boolean;
  setDay: (id: string, patch: Partial<ForecastDay>) => void;
  setWeight: (key: keyof Weights, value: number) => void;
  setScale: (key: keyof Scales, value: number) => void;
  setThreshold: (key: keyof Thresholds, value: number) => void;
  applyPreset: (id: string) => void;
  restoreDefaults: () => void;
};

const FloodContext = createContext<FloodContextValue | null>(null);

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function num(value: unknown, fallback: number, min: number, max: number) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return clamp(n, min, max) || (Number.isFinite(n) ? clamp(n, min, max) : fallback);
}

function clampDay(day: ForecastDay): ForecastDay {
  return {
    ...day,
    rainfallMm: clamp(day.rainfallMm, 0, 500),
    peakMmHr: clamp(day.peakMmHr, 0, 200),
    riverStageM: clamp(day.riverStageM, 0, 8),
    soilPct: clamp(day.soilPct, 0, 100),
    lakeRiseM: clamp(day.lakeRiseM, 0, 4),
  };
}

function orderThresholds(thresholds: Thresholds): Thresholds {
  const watch = clamp(thresholds.watch, 1, 90);
  const warning = clamp(Math.max(thresholds.warning, watch + 1), watch + 1, 95);
  const critical = clamp(Math.max(thresholds.critical, warning + 1), warning + 1, 99);
  return { watch, warning, critical };
}

function defaultState(): DeskState {
  return {
    days: PRESETS[0].days.map((day) => ({ ...day })),
    weights: { ...DEFAULT_WEIGHTS },
    scales: { ...DEFAULT_SCALES },
    thresholds: { ...DEFAULT_THRESHOLDS },
    presetId: PRESETS[0].id,
  };
}

function sanitize(raw: unknown): DeskState | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<DeskState>;
  if (!Array.isArray(value.days) || value.days.length !== 7) return null;
  const base = defaultState();
  const days = base.days.map((day, index) => {
    const item = value.days?.[index];
    if (!item || typeof item !== "object") return day;
    const row = item as Partial<ForecastDay>;
    return clampDay({
      ...day,
      rainfallMm: num(row.rainfallMm, day.rainfallMm, 0, 500),
      peakMmHr: num(row.peakMmHr, day.peakMmHr, 0, 200),
      riverStageM: num(row.riverStageM, day.riverStageM, 0, 8),
      soilPct: num(row.soilPct, day.soilPct, 0, 100),
      lakeRiseM: num(row.lakeRiseM, day.lakeRiseM, 0, 4),
    });
  });
  const weights = { ...base.weights };
  (Object.keys(weights) as (keyof Weights)[]).forEach((key) => {
    weights[key] = num(value.weights?.[key], base.weights[key], 0, 1);
  });
  const scales = { ...base.scales };
  scales.rainfallMm = num(value.scales?.rainfallMm, base.scales.rainfallMm, 20, 400);
  scales.peakMmHr = num(value.scales?.peakMmHr, base.scales.peakMmHr, 5, 120);
  scales.riverStageM = num(value.scales?.riverStageM, base.scales.riverStageM, 0.5, 6);
  scales.lakeRiseM = num(value.scales?.lakeRiseM, base.scales.lakeRiseM, 0.4, 4);
  const thresholds = orderThresholds({
    watch: num(value.thresholds?.watch, base.thresholds.watch, 1, 90),
    warning: num(value.thresholds?.warning, base.thresholds.warning, 2, 95),
    critical: num(value.thresholds?.critical, base.thresholds.critical, 3, 99),
  });
  const presetId =
    value.presetId === "custom" || presetById(String(value.presetId))
      ? String(value.presetId)
      : "custom";
  return { days, weights, scales, thresholds, presetId };
}

export function FloodProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DeskState>(defaultState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const loaded = sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
      if (loaded) setState(loaded);
    } catch {
      /* keep the sample desk */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  const setDay = useCallback((id: string, patch: Partial<ForecastDay>) => {
    setState((current) => ({
      ...current,
      presetId: "custom",
      days: current.days.map((day) => (day.id === id ? clampDay({ ...day, ...patch }) : day)),
    }));
  }, []);

  const setWeight = useCallback((key: keyof Weights, value: number) => {
    setState((current) => ({
      ...current,
      weights: { ...current.weights, [key]: clamp(value, 0, 1) },
    }));
  }, []);

  const setScale = useCallback((key: keyof Scales, value: number) => {
    setState((current) => {
      const limits: Record<keyof Scales, [number, number]> = {
        rainfallMm: [20, 400],
        peakMmHr: [5, 120],
        riverStageM: [0.5, 6],
        lakeRiseM: [0.4, 4],
      };
      const [min, max] = limits[key];
      return { ...current, scales: { ...current.scales, [key]: clamp(value, min, max) } };
    });
  }, []);

  const setThreshold = useCallback((key: keyof Thresholds, value: number) => {
    setState((current) => ({
      ...current,
      thresholds: orderThresholds({ ...current.thresholds, [key]: value }),
    }));
  }, []);

  const applyPreset = useCallback((id: string) => {
    const preset = presetById(id);
    if (!preset) return;
    setState((current) => ({
      ...current,
      presetId: preset.id,
      days: preset.days.map((day) => ({ ...day })),
    }));
  }, []);

  const restoreDefaults = useCallback(() => {
    setState(defaultState());
  }, []);

  const value = useMemo<FloodContextValue>(
    () => ({
      ...state,
      ready,
      setDay,
      setWeight,
      setScale,
      setThreshold,
      applyPreset,
      restoreDefaults,
    }),
    [state, ready, setDay, setWeight, setScale, setThreshold, applyPreset, restoreDefaults],
  );

  return <FloodContext.Provider value={value}>{children}</FloodContext.Provider>;
}

export function useFlood() {
  const value = useContext(FloodContext);
  if (!value) throw new Error("useFlood must be used inside FloodProvider");
  return value;
}
