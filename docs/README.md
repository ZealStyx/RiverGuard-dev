# RiverGuard Documentation

This folder contains the project documentation for RiverGuard, an explainable machine learning platform for hydrological flood risk and water-level forecasting.

See the project root [`README.md`](../README.md) for the overall project overview, architecture, technology stack, and development setup.

## Data and modelling

- [`data-sources.md`](data-sources.md) — catalogue of every rainfall/flood source used, with coverage, units, licence, and limits; the gap table records what is still missing.
- [`ml-methodology.md`](ml-methodology.md) — features, leakage rules, chronological and leave-one-event-out validation, metrics, calibration, explainability, and the **circularity warning** that governs any result produced from the current dataset.
- [`../data/README.md`](../data/README.md) — the delivered dataset: workbook, CSVs, generator, and the reliability table that separates observed from derived columns.
- [`../ml/README.md`](../ml/README.md) — the test model trained on that dataset, its held-out metrics, and the interactive predictor page.
- [`guides/forecast-pipeline.md`](guides/forecast-pipeline.md) — how weather, the local ML service and Convex connect, with the failure modes and the one thing a cron cannot do.
- [`guides/gis-data.md`](guides/gis-data.md) — why the map draws no RiverGuard geometry until a local file is verified, and the manifest/verification contract that turns one on.
- [`../SETUP.md`](../SETUP.md) — requirements and step-by-step instructions to run the website, the ML service and Convex locally.

## Product design

- [`designs/ui-ux-design-cheat-sheet.md`](designs/ui-ux-design-cheat-sheet.md) — Complete role, authentication, onboarding, screen, form, permission, system-state, and end-to-end UI/UX flow reference.
- [`designs/frontend-route-inventory.md`](designs/frontend-route-inventory.md) — Implemented frontend routes, role journeys, prototype boundaries, and backend handoff notes.

## Current role decision

- [`architecture/role-consolidation.md`](architecture/role-consolidation.md) — Accepted role model: Resident, LGU operator, and Administrator with research tools inside the Admin workspace.

## Folder organization

| Folder                          | Purpose                                                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`plan/`](plan)                 | Delivery plan and phased roadmap. Work is organized into phases with objectives, tasks, entry/exit criteria, and decisions. |
| [`guides/`](guides)             | Step-by-step how-to guides for developers and operators (setup, deployment, data ingestion, model training, etc.).          |
| [`designs/`](designs)           | Design documents: system design, API contracts, data schemas, UI/component designs, and architecture decisions.             |
| [`issues/`](issues)             | Known issues, open questions, bug records, and incident notes.                                                              |
| [`reference/`](reference)       | Reference material: data dictionaries, technology references, third-party dataset info, glossary, and external links.       |
| [`report/`](report)             | Reports: experiment results, evaluation reports, cost reviews, validation reports, and phase retrospectives.                |
| [`architecture/`](architecture) | High-level architecture documents (carried over from the original docs layout).                                             |

## Conventions

- Keep documents concise and tied to the repository state.
- Label mock data and illustrative predictions clearly so they cannot be mistaken for observations or validated forecasts.
- When changing architecture or data contracts, update the relevant documentation under `docs/` (see [Contributing](../README.md#contributing) in the root README).
- Do not commit secrets, large datasets, PMTiles files, or large model binaries.

## Project status

Early development / architecture and implementation scaffold. Features described as planned are not necessarily implemented. No prediction, probability, or warning should be treated as operational or validated until the underlying data and models have been tested for their intended use.

**As of 2026-11-15**

| Area                                     | State                                                                                                                                           |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Development dataset                      | v2 delivered — 15,884 daily rows, 2016-01-01 → 2026-11-14, four cities, chronological train/validation/test split with positives in every split |
| Real component of the dataset            | Rainfall only, and only for 2025-11-15 → 2026-11-14 (ERA5 reanalysis). Everything earlier is synthetic and labelled `RainSource = synthetic`    |
| Water level, soil moisture, flood labels | **Derived from rainfall by documented formulas** — not observations, not gauge readings                                                         |
| Model A (water-level forecast)           | **No-Go** — no gauge series with a documented datum exists                                                                                      |
| Model B (flood probability)              | **No-Go** as calibrated probability; Conditional Go only as an experimental index                                                               |
| Engineering / pipeline work              | **Go** — Phase 2 may proceed on the dataset as a plumbing fixture                                                                               |
| Web app and Convex ingest                | Scaffolded; dashboard reads illustrative data                                                                                                   |

Dataset decision record: [`plan/MASTER_PLAN_ROADMAP.md`](plan/MASTER_PLAN_ROADMAP.md#decisions). Phase detail: [`plan/phase-01-data-acquisition-exploration.md`](plan/phase-01-data-acquisition-exploration.md), [`plan/phase-02-local-ml-prototyping.md`](plan/phase-02-local-ml-prototyping.md).
