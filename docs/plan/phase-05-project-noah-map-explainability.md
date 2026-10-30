# Phase 5 — Project NOAH Map & Explainability UI

**Project:** RiverGuard  
**Folder:** `docs/plan/phase-05-project-noah-map-explainability.md`  
**Status:** Planned  
**Dependencies:** Phase 4 complete (forecasts flowing from ML service → Convex → dashboard)

---

## Objective

Add the interactive hazard map and explainability surfaces to the dashboard so users can see Project NOAH flood layers alongside stations, and understand what features drove each model result.

---

## Entry criteria

- Phase 4 exit criteria met.
- Forecast and risk results flowing from ML service to Convex.

---

## Key tasks

| # | Task | Details |
|---|------|---------|
| T1 | Integrate MapLibre GL JS + remotely hosted Project NOAH PMTiles | Layers: `flood_5yr`, `flood_25yr`, `flood_100yr` from BetterGov.PH Project NOAH on Hugging Face. Register PMTiles protocol, add vector source, render source layer + classification attributes. |
| T2 | Verify remote hosting suitability | Confirm Hugging Face endpoint supports browser CORS and HTTP byte-range requests before relying on it. If unsuitable, reassess delivery approach (do not assume the remote URL will always work). |
| T3 | Render station markers, detail panels, legend, layer controls, attribution | MapLibre markers + station detail panels; layer controls; legend reflecting dataset attributes; ODbL attribution for Project NOAH. |
| T4 | Render SHAP explanations + risk classifications | Show feature-contribution explanations for individual predictions on the Next.js dashboard. |
| T5 | Label data freshness, model version, forecast horizon | Every prediction/risk display must identify station, generation timestamp, horizon, model version, input-data window, and data-quality warnings. Distinguish model contribution from physical causation. |

---

## Exit criteria

- Flood hazard layers render alongside station markers and overlays.
- Explainability UI displays feature contributions for individual predictions.
- Attribution + license info for Project NOAH (ODbL) displayed on the map.

---

## Risks

- Remote PMTiles CORS / byte-range limitations; verify before depending on Hugging Face hosting.
- Presenting SHAP as physical causation; always frame as model explanation, not causation.
- Committing multi-gigabyte PMTiles archives to Git; do not commit large binaries.

---

## Deliverables

| Deliverable | Location |
|-------------|----------|
| Interactive hazard map with NOAH layers | `apps/web/src/components/` (map) |
| Station markers + detail panels | `apps/web/src/components/` |
| SHAP explanation UI | `apps/web/src/components/` (dashboard) |
| Map attribution + ODbL license notice | Map UI + `docs/reference/` |

---

## Related

- Root README: [Project NOAH Hazard Maps](../README.md#project-noah-hazard-maps), [Development Roadmap — Phase 5](../README.md#phase-5--project-noah-map--explainability-ui), [Explainability](../README.md#explainability)
- `docs/plan/MASTER_PLAN_ROADMAP.md`
- `docs/architecture/riverguard-architecture.md` (Sections 2.4, 4.4)
