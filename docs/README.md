# RiverGuard Documentation

This folder contains the project documentation for RiverGuard, an explainable machine learning platform for hydrological flood risk and water-level forecasting.

See the project root [`README.md`](../README.md) for the overall project overview, architecture, technology stack, and development setup.

## Folder organization

| Folder | Purpose |
|--------|---------|
| [`plan/`](plan) | Delivery plan and phased roadmap. Work is organized into phases with objectives, tasks, entry/exit criteria, and decisions. |
| [`guides/`](guides) | Step-by-step how-to guides for developers and operators (setup, deployment, data ingestion, model training, etc.). |
| [`designs/`](designs) | Design documents: system design, API contracts, data schemas, UI/component designs, and architecture decisions. |
| [`issues/`](issues) | Known issues, open questions, bug records, and incident notes. |
| [`reference/`](reference) | Reference material: data dictionaries, technology references, third-party dataset info, glossary, and external links. |
| [`report/`](report) | Reports: experiment results, evaluation reports, cost reviews, validation reports, and phase retrospectives. |
| [`architecture/`](architecture) | High-level architecture documents (carried over from the original docs layout). |

## Conventions

- Keep documents concise and tied to the repository state.
- Label mock data and illustrative predictions clearly so they cannot be mistaken for observations or validated forecasts.
- When changing architecture or data contracts, update the relevant documentation under `docs/` (see [Contributing](../README.md#contributing) in the root README).
- Do not commit secrets, large datasets, PMTiles files, or large model binaries.

## Project status

Early development / architecture and implementation scaffold. Features described as planned are not necessarily implemented. No prediction, probability, or warning should be treated as operational or validated until the underlying data and models have been tested for their intended use.
