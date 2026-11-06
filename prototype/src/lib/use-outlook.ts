import { useMemo } from "react";
import { TOWNS } from "@/data/laguna";
import {
  horizon,
  levelOf,
  roundIndex,
  townIndex,
  type ModelConfig,
} from "@/lib/flood-model";
import { useFlood } from "@/lib/flood-store";

export function useOutlook() {
  const flood = useFlood();
  const config = useMemo<ModelConfig>(
    () => ({
      weights: flood.weights,
      scales: flood.scales,
      thresholds: flood.thresholds,
    }),
    [flood.weights, flood.scales, flood.thresholds],
  );

  const view = useMemo(() => {
    const outlook = horizon(flood.days, config);
    const score = roundIndex(outlook.score);
    const level = levelOf(score, config.thresholds);
    const ranked = TOWNS.map((town) => {
      const townScore = roundIndex(townIndex(outlook.score, town.susceptibility));
      return {
        town,
        score: townScore,
        level: levelOf(townScore, config.thresholds),
      };
    }).sort((a, b) => b.score - a.score || a.town.name.localeCompare(b.town.name));
    return { outlook, score, level, ranked };
  }, [flood.days, config]);

  return { ...flood, config, ...view };
}
