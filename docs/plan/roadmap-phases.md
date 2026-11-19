# RiverGuard Delivery Roadmap — NCR Local Demonstration

This roadmap defines the delivery sequence for RiverGuard's NCR research prototype. The website, route handlers, Python ML API, model training, and GIS processing run locally on the developer's computer. Convex is the only hosted application backend/database dependency. The only external runtime data API is the weather forecast provider called by the local Next.js server.

> **Deployment constraint:** Never deploy the website, FastAPI service, or models publicly under the current project scope. Do not provision AWS infrastructure, Vercel hosting, container registries, object storage, external map tiles, or other managed compute services. If this constraint changes, revise the architecture and roadmap before creating resources.

> **Study area:** NCR. The currently supplied dataset covers only Quezon City, Marikina, Manila, and Pasig. It does not establish coverage for all NCR LGUs or barangays.
>
> **Development dataset (2026-11-15):** `data/RiverGuard_NCR_Dataset_v2.xlsx` and `data/daily_observations.csv` provide 15,884 daily rows (2016-01-01 → 2026-11-14) for those four cities, with a real ERA5 rainfall tail for the last 12 months. Rainfall before that is synthetic calibrated to PAGASA normals; water level, soil moisture, and flood labels are **derived**. It is an engineering fixture, not observed data — see [`docs/data-sources.md`](../data-sources.md) and the Phase 1 decision below.

RiverGuard is a research and demonstration system. Its predictions are not operational warnings and must not be presented as official evacuation guidance.

---

## Delivery principles

1. **NCR is the target geography:** remove San Pablo City and Laguna as project scope. Use NCR-wide designs, but expose only locations supported by verified data.
2. **Data before models:** establish geographic coverage, temporal coverage, units, provenance, and label quality before training.
3. **Local-first execution:** run Next.js, FastAPI, preprocessing, training, and inference on the development computer.
4. **Convex is the only hosted application service:** use it for application persistence and reactive data access; do not add a second database.
5. **Weather API is the only external runtime data integration:** request a seven-day forecast only when the user initiates a forecast from the local dashboard.
6. **No invented observations:** unavailable measurements remain missing and are surfaced as quality warnings.
7. **Separate model responsibilities:** Model A predicts water levels; Model B estimates localized flood occurrence risk.
8. **Match predictions to data resolution:** city-level inputs do not justify barangay-level outputs.
9. **Validate by lead time and location:** seven-day output is not automatically seven days of equally reliable warning capability.

## Phase 1 — NCR Data Acquisition and Feasibility

**Objective:** Establish whether suitable historical observations, flood-event labels, and geographic layers exist for the NCR locations intended for the demo.

### Entry criteria

- Project scope is NCR, not San Pablo City/Laguna.
- Initial candidate locations from the supplied CSV are Quezon City, Marikina, Manila, and Pasig.
- Target forecast horizons and intended spatial units are documented.
- Source provenance and licensing are tracked for every dataset.

### Key tasks

1. Audit `Flood_Prediction_NCR_Philippines.csv`. Record its schema, date range, daily sampling, four city labels, class balance, missingness, duplicates, and provenance gaps.
2. Verify the dataset's actual source, measurement method, location definitions, and `FloodOccurrence` label semantics before treating it as observed data or ground truth.
3. Request historical flood-event records from the CDRRMO of each initially supported city and relevant NCR/regional disaster-risk offices. Seek date/time, location, depth, duration, severity, affected infrastructure, source references, and spatial precision.
4. Request historical rainfall, water-level, discharge, and monitoring-station records from PAGASA, DOST-ASTI/PhilSensors, and other relevant agencies. Check whether records have suitable temporal resolution and station coordinates.
5. Identify operational or archived monitoring stations serving the target cities and relevant catchments. Record gaps and periods of missing data.
6. Obtain official NCR administrative boundaries and the city/municipality and barangay polygons required by the intended display resolution. Record source, version, CRS, and vintage.
7. Obtain rivers, creeks, lakes, drainage, and catchment layers relevant to the initial cities. Do not assume city boundaries align with watershed boundaries.
8. Obtain suitable DEM/DTM data and prepare elevation, slope, flow direction, and flow accumulation only where source resolution and vertical accuracy are documented.
9. Gather land-cover and soil information where its resolution is useful for the target spatial unit.
10. Evaluate seven-day weather forecast coverage for each selected location using verified representative coordinates. Record the provider's spatial resolution and variables.
11. Seek historical weather forecast snapshots if available so that training features reproduce what would have been known at each forecast issue time.
12. Create `docs/data-sources.md` with source, download date, provider, license, geography, time coverage, sampling interval, spatial resolution, units, and limitations.

### Current status (2026-11-15)

| Model | Decision | Basis |
|---|---|---|
| Model A (water level) | **No-Go** for training/operational use | No timestamped gauge observations with a documented datum. The development dataset derives water level from rainfall, which the Model A gate below explicitly forbids training on. |
| Model B (flood occurrence) | **No-Go** for calibrated probabilities; **Conditional Go** for an experimental flagged index | Labels are a documented rule-based proxy over PAGASA thresholds and alarm levels, not LGU-verified events. |
| Engineering use | **Go** | Schema, ingest, features, API wiring, and UI states can be built and tested against dataset v2 now. Any surface showing it must label it development data. |

Delivered so far: 15,884 daily rows for the four initial cities (2016-01-01 → 2026-11-14);
real ERA5 rainfall for 2025-11-15 → 2026-11-14; chronological train/validation/test split;
data catalogue and quality checks. Outstanding: PAGASA/EFCOS gauge series, LGU flood-event
records, NCR boundary/barangay/DEM layers, weather-forecast archive.

### Supplied CSV audit to record

- 7,308 rows and seven columns.
- Daily dates from 2016-01-01 through 2020-12-31.
- Four locations: Quezon City, Marikina, Manila, and Pasig; 1,827 rows per location.
- Columns: `Date`, `Location`, `Rainfall_mm`, `WaterLevel_m`, `SoilMoisture_pct`, `Elevation_m`, `FloodOccurrence`.
- No missing values or duplicate date/location pairs were found in the inspected file.
- 132 positive and 7,176 negative `FloodOccurrence` rows.
- No provenance, source, station identifiers, coordinates, measurement metadata, or event-label definition is supplied in the archive.

Treat the file as a schema/pipeline smoke-test dataset until independently verified. The date frequency is daily; do not create hourly targets from this file. Do not expand its city-level rows into barangay labels.

### Exit criteria

- Initial NCR locations and their actual data coverage are listed.
- A documented and usable rainfall dataset is available for at least one supported location or a defensible regional product is identified.
- Verified spatial boundaries exist for the intended visualization resolution.
- A dated, geographically attributable flood-event dataset is available for Model B, or a no-go decision is recorded for calibrated flood-occurrence training.
- Historical water-level observations and station coverage have been assessed for Model A.
- A written **Go / Conditional Go / No-Go** decision is recorded separately for Model A and Model B and per supported geography where appropriate.

### Go / no-go rules

- **Model A Go:** timestamped historical water-level observations exist for the target station(s), with adequate coverage and documented measurement units/datum.
- **Model A Conditional Go:** a limited station dataset exists; scope inference to those stations and validated horizons only.
- **Model A No-Go:** no suitable historical water-level data exist. Do not train a river-level model from rainfall-only inputs or fabricate gauge readings.
- **Model B Go:** dated, geographically attributable flood and non-flood examples exist at a defined spatial resolution, with adequate supporting features.
- **Model B Conditional Go:** event labels are sparse or incomplete. Limit outputs to a labeled exploratory risk index or experimental model; do not claim calibrated flood probabilities.
- **Model B No-Go:** only static hazard maps or unverified synthetic labels are available. A static susceptibility display may still be built, but it is not a trained future flood-occurrence predictor.

### Risks

- The supplied CSV may be synthetic, illustrative, or aggregated; the archive does not verify its source.
- The four city labels do not represent full NCR coverage.
- City-level daily data may be insufficient for barangay-scale or hourly flood prediction.
- Station coverage and flood-event records may be uneven across NCR.
- Satellite/reanalysis/weather forecast products may be too coarse for small-area distinctions.
- Geographic layers may differ in CRS, date, completeness, and classification.

## Phase 2 — Local Data Engineering and ML Prototyping

**Objective:** Build reproducible local datasets and establish honest baselines for each model and supported NCR location.

> **Status 2026-11-15:** the shared data pipeline's first artifact exists (dataset v2, see
> [`data/README.md`](../../data/README.md)). Feature definitions are frozen in the
> `Data_Dictionary` tab; reuse them instead of recomputing rolling sums differently. Two
> cautionary rules apply while this dataset is in use: (a) metrics are pipeline validation, not
> flood-prediction skill, because water level and labels are derived from the same rainfall;
> (b) use the supplied `Split` column and add a leave-one-event-out check rather than shuffling.

### Entry criteria

- Phase 1 data-feasibility decisions are documented.
- Provenance, units, time conventions, and geographic coverage are recorded.
- Model A and Model B targets are defined independently.

### Key tasks

#### Shared data pipeline

1. Build local importers for CSV, spreadsheets, and supported GIS formats.
2. Preserve source files unchanged and record checksums and source metadata.
3. Normalize dates, timezone, units, location identifiers, station identifiers, CRS, and spatial identifiers.
4. Validate missingness, duplicates, out-of-range values, and inconsistent sampling intervals.
5. Never silently replace missing rainfall, water levels, soil moisture, or flood labels with zero.
6. Separate observations, reanalysis, weather forecasts, remote-sensing estimates, model outputs, and static hazard layers.
7. Build timestamped feature tables and repeatable chronological/event-based train-validation-test exports.
8. Keep the supplied NCR CSV as an unverified input fixture until its provenance is resolved; use it for schema and pipeline tests only in the meantime.

#### Model A — Hydrological forecasting

1. Define targets at horizons supported by observations. Begin with daily targets if only daily records are verified; use hourly targets only with hourly observations. Today only **daily** resolution exists, so D+1 daily is the only defensible target; D+2–D+7 requires finer inputs.
2. Build lagged water-level, water-level-change, rolling rainfall, antecedent rainfall, forecast rainfall, and available upstream features.
3. Establish persistence and simple statistical baselines.
4. Train XGBoost or another baseline regressor only when the Model A data gate is met. Training against the derived `WaterLevel_m` column is acceptable **only** as a code-path test, and must be reported as such (the column is a formula over rainfall).
5. Evaluate MAE, RMSE, bias, and error by station and lead time.
6. Add uncertainty intervals only when the method is defined and empirically evaluated.

#### Model B — Localized flood-risk prediction

1. Define spatial units from actual label precision: city-level labels support city-level models, not barangay-level labels. Use subcatchments or grid cells only with sufficiently precise event data and spatial features.
2. Assign dated flood-event and non-event labels without assuming an entire city/barangay flooded when only a smaller area was affected.
3. Align weather and environmental features to the forecast issue time. Never use future observations as inputs.
4. Engineer antecedent and forecast rainfall, soil moisture, terrain, land cover, soil, river proximity, and applicable Model A outputs.
5. Use official hazard susceptibility as context, not as a substitute for observed event labels.
6. Establish a baseline before training a tree-based classifier.
7. Evaluate precision, recall, F1, PR-AUC, confusion matrix, probability calibration, false alarms, and missed events by lead time and location.
8. Keep flood-depth regression as a separate task requiring adequate depth labels or validated inundation observations.

#### Validation and explainability

1. Use chronological and storm-event-based splits. Do not distribute adjacent samples from one event across training and test sets.
2. Preserve a final held-out time period or event set.
3. Compare against simple baselines.
4. Generate SHAP explanations for supported model types and review them for plausibility.
5. Explain SHAP as model contribution, not physical causation.
6. Record metrics, data versions, feature definitions, parameters, and limitations in `docs/report/`.

### Exit criteria

- Data preparation is reproducible from documented raw inputs.
- Every feature has a definition, unit, timestamp rule, geographic granularity, and missing-data policy.
- Model A and Model B have separate training and inference schemas.
- Baselines are evaluated on held-out chronological/event-based data.
- Model cards document intended use, NCR coverage, limitations, and unsupported locations/horizons.
- Unvalidated models are marked experimental and cannot generate authoritative warnings.

## Phase 3 — Convex and Local Application Foundation

**Objective:** Build the local dashboard and connect it to the Convex development deployment.

### Entry criteria

- Phase 1 data decisions are documented.
- Phase 2 feature schemas and sample artifacts are available for the data that can be displayed.

### Key tasks

1. Initialize or update Next.js and TypeScript under `apps/web`.
2. Configure Convex as the only hosted application backend/database.
3. Implement schemas for users/demo roles if needed, NCR locations, stations, observations, forecast runs, weather snapshots, spatial forecasts, alerts if included, hazard-layer metadata, and model-version metadata.
4. Add indexes for actual access patterns, such as station + timestamp, spatial unit + forecast date, and run identifier.
5. Use bounded and paginated historical queries.
6. Import a small, cleaned sample dataset into Convex for dashboard development. Label unverified/sample records clearly.
7. Build the dashboard with NCR location selection, supported-coverage indicators, station status, historical charts, forecast controls, and data-freshness metadata.
8. Ensure local application reads/writes only the Convex development deployment.

### Exit criteria

- Next.js runs locally and connects to Convex.
- Location/station metadata and bounded observation histories are queryable.
- Historical charts render only when data exists.
- Sample, missing, stale, and verified data are distinguished in the UI.
- No public hosting or AWS resources have been created.

## Phase 4 — Weather API and Local ML Integration

**Objective:** Connect the seven-day weather API, local FastAPI service, and Convex persistence without deploying any backend.

### Entry criteria

- Phase 3 local application and Convex schemas are operational.
- Model schemas and baseline artifacts exist; unsupported models remain explicitly unavailable.

### Key tasks

1. Implement the weather-provider adapter in a local Next.js server route. Use the configured provider (Open-Meteo is a candidate) only after checking current terms, geographic coverage, variables, and request limits.
2. Retrieve hourly or daily forecast data for selected NCR locations using verified coordinates and retain provider, retrieval, validity, timezone, and model metadata.
3. Normalize inputs using the same feature transformations used during training.
4. Call local FastAPI at `http://127.0.0.1:8000`. Do not ask Convex cloud functions to access the local service.
5. Validate requests with versioned Pydantic schemas.
6. Run Model A only where compatible gauge observations and a supported model exist.
7. Run Model B only for supported spatial units and validated training coverage; otherwise return experimental/unavailable status.
8. Return daily predictions, uncertainty, explanations, model versions, input freshness, and data-quality warnings.
9. Save forecast metadata and predictions through Convex mutations from the browser or another explicitly supported client path; do not give the ML service unrestricted Convex database access.
10. Provide UI states for weather provider failure, stale forecasts, local ML service offline, unsupported location, missing model, and Convex write failure.
11. Keep refresh manual; do not add a cloud scheduler or always-running worker.

### Exit criteria

- A user can request a seven-day NCR weather/flood outlook from the local dashboard.
- The local Next.js route retrieves the weather forecast and calls local FastAPI.
- Unsupported models/areas return explicit status, not fabricated values.
- A traceable forecast run is saved to Convex.
- Previous runs can be inspected and compared.
- No public ML endpoint is deployed.

## Phase 5 — Local NCR GIS Map and Explainability UI

**Objective:** Display supported NCR geographic context and model predictions as distinct layers.

### Entry criteria

- Phase 4 forecast outputs can be retrieved and persisted.
- NCR boundaries and selected city/municipality or barangay layers have verified provenance.

### Key tasks

1. Integrate MapLibre GL JS or the map library already selected by the repository.
2. Load prepared NCR geographic assets from local files. Use local GeoJSON/PMTiles and do not depend on a remote basemap/tile service in the current scope.
3. Render NCR, supported city boundaries, available barangay boundaries, waterways, catchments, and monitoring stations.
4. Render verified static hazard layers separately from dynamic model results.
5. Render Model B predictions at the finest spatial unit supported by training labels. The supplied CSV alone supports no barangay-level event assignment.
6. Add filters for city, forecast day, prediction layer, and data coverage.
7. Add location details showing forecast validity, probability only where calibrated, contributing features, uncertainty, source freshness, and model version.
8. Add seven-day rainfall/risk timelines.
9. Label unmodeled or unsupported locations as “No prediction.”
10. Show source attribution and license information.

### Exit criteria

- The map renders locally without external tile hosting.
- Static susceptibility and dynamic prediction layers have separate labels and legends.
- Users can select supported NCR locations and forecast days.
- Coverage gaps, data freshness, and uncertainty are visible.
- All map data attribution is displayed.

### Current implementation status (2026-11-20)

- **Implemented:** existing MapLibre integration, verified-local-layer support,
  city markers for the four supported locations, day selection, and a
  synchronized map detail card.
- **Implemented safely:** marker states come from real forecast output;
  missing and degraded output is shown explicitly.
- **Not implemented:** verified hazard/boundary/station geometry, station
  observations, gauge comparisons, uncertainty intervals, calibration UI,
  fine spatial units, or automatic alert publication.

## Phase 6 — Local Demo Validation and Research Review

**Objective:** Verify the end-to-end local workflow and prepare a defensible NCR demonstration.

### Entry criteria

- Phase 5 map and explainability UI are functional.
- Forecast runs are traceable to weather snapshots, location coordinates, and model versions.

### Key tasks

1. Test local dashboard → weather API → local FastAPI → Convex persistence → map/chart update.
2. Test weather API timeout, rate limit, incomplete response, invalid response, and stale forecast handling.
3. Test FastAPI offline, missing artifacts, unsupported location, schema mismatch, and invalid inputs.
4. Test Convex disconnection, failed mutation, duplicate forecast submission, and bounded historical queries.
5. Compare successive weather and prediction runs for supported cities.
6. Evaluate model performance separately by location, spatial unit, and lead time.
7. Ask a domain adviser or hydrological/disaster-risk stakeholder to review assumptions, thresholds, and communication.
8. Verify that prototype predictions are clearly labeled and are not presented as official warnings.
9. Prepare a reproducible demo script, data catalog, model cards, and limitations list.

### Exit criteria

- All components start locally using documented instructions.
- The seven-day workflow completes or reports a clear recoverable error.
- Results retain provenance, model version, forecast generation time, and quality metadata.
- Model evaluation and limitations are documented.
- The demonstration remains local-only; public deployment is not required for acceptance.

---

## Cross-cutting requirements

### Spatial coverage

- NCR is the target region, but coverage is data-dependent.
- The supplied CSV currently covers only Quezon City, Marikina, Manila, and Pasig at city/day granularity.
- Do not call this complete NCR coverage until data for the remaining LGUs and the relevant spatial units has been acquired and validated.
- Do not infer barangay-level outcomes from city-level rows.

### Data provenance

- Record source, owner/provider, download date, license, temporal and spatial coverage, units, and preprocessing.
- Keep observed rainfall distinct from weather forecasts and reanalysis.
- Preserve timestamps, timezone, station/site IDs, and coordinate reference systems.
- Static hazard return periods are not schedules or event probabilities for a particular date.

### Seven-day forecast communication

- Days 1–3 may be presented as short-range predictions only to the extent supported by held-out validation.
- Days 4–7 must show increasing uncertainty and be labeled as an extended outlook unless validated otherwise.
- A seven-day weather API forecast does not establish seven days of reliable local flood prediction.
- Probability categories must be calibrated and documented.

### Security and privacy

- Keep local secrets in untracked environment files.
- Do not expose API keys or local ML credentials in browser bundles.
- Use the Convex development deployment for demo records; do not upload personally identifiable disaster records.
- Apply authentication and authorization to Convex mutations.

### Operational safety

- RiverGuard is decision support, not an official warning authority.
- Do not automatically issue evacuation orders.
- Show uncertainty, data gaps, stale inputs, and model limitations.
- A missing prediction is not a low-risk prediction.

### Documentation

Update README, architecture, data catalog, feature schemas, model cards, and reports whenever the geography, workflow, or feature definitions change.
