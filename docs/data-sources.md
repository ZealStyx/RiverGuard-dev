# Data Sources & Catalog — RiverGuard NCR

**Last updated:** 2026-11-15
**Companion documents:** [`data/README.md`](../data/README.md) (column-level reliability),
[`plan/phase-01-data-acquisition-exploration.md`](plan/phase-01-data-acquisition-exploration.md) (Go/No-Go)

This is the catalogue Phase 1 T2/T4 requires: for every source — licence, geographic coverage,
temporal coverage, units, update frequency, and limitations. It separates **real** sources from
**derived or synthetic** series so nothing is mistaken for an observation.

---

## 1. Summary

| #   | Source                                                                        | Type                         | Used for                                                                    | Real?                                         |
| --- | ----------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------- | --------------------------------------------- |
| S1  | PAGASA Climatological Normals 1991–2020                                       | Published climatology        | Monthly rainfall/temperature calibration targets                            | ✅ Real (published)                           |
| S2  | PAGASA rainfall warning system (Yellow/Orange/Red)                            | Operational thresholds       | Warning thresholds + flood-proxy rules                                      | ✅ Real (published)                           |
| S3  | PAGASA / Marikina MDRRMO river alarm levels                                   | Operational thresholds       | Marikina 15/16/18 m; Pasig 12/12.5/13 m                                     | ✅ Real for Marikina; ⚠️ indicative for Pasig |
| S4  | Open-Meteo ERA5 archive (Copernicus ERA5)                                     | Reanalysis                   | Real daily rainfall, 2025-11-15 → 2026-11-14 + Ulysses anchor               | ✅ Real                                       |
| S5  | Documented flood events (Ondoy 2009, Habagat 2012, Ulysses 2020, Carina 2024) | Secondary literature / press | Reference event magnitudes and impacts                                      | ✅ Real (secondary sources)                   |
| S6  | RiverGuard generator (`data/generate_dataset.py`)                             | Synthetic                    | Rainfall 2016 → 2025-11-14; derived water level, soil moisture, flood proxy | ❌ Synthetic / derived                        |

---

## 1.1 Training data vs run-time data

The distinction matters when reading any screen in the app:

| Used for                                 | Source                                                               | When                                                           |
| ---------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Model training**                       | `data/daily_observations.csv` (S4 ERA5 tail + S6 synthetic backfill) | Offline, in `ml/` — writes `ml/artifacts/{model,metrics}.json` |
| **Historical charts / provenance panel** | the same CSV, then stored provider days past its last row            | Every page load (`GET /api/historical`, `GET /api/dataset`)    |
| **Model input at run time**              | the live weather provider (Open-Meteo, or the labelled fixture)      | Every "Run forecast" (`POST /api/forecast`)                    |

The CSV never feeds a live prediction. It is training data and history; the weather provider is the
input a forecast is scored from. Anything that presents CSV rows as the input to a run is wrong.

## 1.2 Observed days after the dataset ends

The CSV is a snapshot: it ends on its generated `END_DATE` (currently 2026-11-14). Every forecast run
already retrieves a live ~31-day window from Open-Meteo, so those observed days are now kept instead
of being discarded with the HTTP response.

| Code | `apps/web/src/lib/observation-store.ts` (read/write), `convex/observations.ts` (database side) |
| Storage | **Convex deployment**, table `observedWeather`, when `NEXT_PUBLIC_CONVEX_URL` is set — the normal case |
| Fallback | `<repo>/.data/observations.json` (gitignored; `OBSERVATION_STORE_PATH` overrides) when there is no deployment |
| Written by | `POST /api/forecast`, after the run is stored — one row per `locationCode:date`, upserted |
| Refused | degraded bundles, the offline fixture, and empty windows: illustrative numbers must never become history |
| Read by | `GET /api/historical` (days strictly after the CSV's last row) and `GET /api/system` |
| Caps | file store: 120 days per city, 480 in total. The deployment keeps every day it is given |

Which backend is used follows run persistence exactly (`lib/forecast-persistence.ts`): with a deployment
configured, nothing is written to the JSON file — one source of truth at a time — and a Convex failure is
reported in the run's `warnings` rather than silently falling back. With no deployment the file is used, so
the local prototype keeps working offline. The table needs the schema pushed once: `npm run convex:dev`
(or `npx convex deploy`) with the current `convex/` directory.

**What is stored** is only what the provider reported: rainfall, temperatures, ET0, soil moisture and the
per-day rainfall source. No water level is written, because the proxy below is derived at read time — the
table stays a faithful copy of the provider window instead of a second, drifting version of the dataset.

**Water level on those days** is the dataset generator's own derivation
(`data/generate_dataset.py`): rainfall routed through a fast store (`0.80/day`) and a slow baseflow store
(`0.97/day`), with the resulting index mapped onto that river's alarm band — `p98(index)` at Alarm 1, the
dry-season floor at `Alarm1 − 2.0 m`, and Alarm 3 as the cap. The chart replays the CSV's rainfall from
its first row to recover the reservoir state at the dataset's end, then continues with the stored days,
so the seam is continuous. The generator's `N(0, 0.05)` m noise is **not** reproduced: a derived proxy
should not jitter because of a random number generator in another process. Against the CSV's own
`WaterLevel_m` column the derivation agrees to within that noise (0.13 m worst case over four cities and
40 days).

**Rules that keep the chart honest**

- A day the CSV already covers is never replaced. The CSV wins its dates; the store only extends the series.
- Rain and antecedent windows come from the merged series. A window with a hole yields `null` rather than
  a smaller number, so a level is withheld until its 3- and 7-day windows are complete.
- The 24-hour change is only computed between consecutive calendar days. Across a gap the row shows no
  change instead of reporting several days as one.
- A location never covered by a run simply ends where the CSV does; the chart says so and shows no live days.

**Filling the gaps.** A day nobody opened the app for is missing from the store, and the live endpoint's
`past_days` only reaches back 92 days (and returns today's view of those days anyway).
`npm run data:backfill` (`scripts/backfill_observed_weather.mjs`) asks the historical forecast archive (S7)
for a date range and writes the missing days through the same `observations:recordWindow` mutation, so the
chart fills in with no other change. Those rows carry `provider = open-meteo-historical-forecast`: an
archive day is never mistaken for one a run collected, or for a gauge. Days already stored are left alone
unless `--overwrite` is passed, and the run reports per-column coverage — ET0 and soil moisture are not
continuous in the archive, and the script writes `null` rather than a substitute.

To start over, delete that city's `observedWeather` rows — or `.data/observations.json` when no deployment
is configured — and the chart returns to the CSV's last row.

---

## 2. Source detail

### S1 — PAGASA Climatological Normals 1991–2020

| Field            | Value                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Provider         | DOST-PAGASA                                                                                   |
| Reference        | `pagasa.dost.gov.ph` → Climate → Climatological Normals (Port Area PDF; Science Garden table) |
| Coverage         | Port Area, Manila (14°35′13″N, 120°58′43″E, 15 m) and Science Garden, Quezon City             |
| Temporal         | Monthly 1991–2020 normals                                                                     |
| Units            | mm/month rainfall; °C mean max/min; rainy-day counts                                          |
| Update frequency | Per normal period (decadal)                                                                   |
| Licence          | Government publication, cited not redistributed                                               |
| Used in          | `Climatology` tab; calibration targets for the synthetic generator                            |
| Limitation       | Station normals, not area averages. Marikina and Pasig values are interpolated, not observed. |

Annual totals used: Port Area **2,242.7 mm**, Science Garden **2,574.3 mm**.

### S2 — PAGASA rainfall warnings

| Field      | Value                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Provider   | DOST-PAGASA                                                                                                                        |
| Reference  | Yellow 7.5–15 mm/h; Orange 15–30 mm/h (or 3 h > 45–65 mm); Red > 30 mm/h (or 3 h > 65 mm) — reported via Inquirer (2012), GMA News |
| Temporal   | Operational, real-time                                                                                                             |
| Units      | mm/h and mm/3 h                                                                                                                    |
| Licence    | Public advisory, cited                                                                                                             |
| Used in    | `Thresholds` tab; the `Rainfall_mm ≥ 100` clause of the flood proxy                                                                |
| Limitation | Hourly thresholds applied to a **daily** dataset — the proxy is therefore conservative and coarse.                                 |

### S3 — River alarm levels

| River / station                    | Alarm 1 | Alarm 2 | Alarm 3 | Confidence                                            |
| ---------------------------------- | ------: | ------: | ------: | ----------------------------------------------------- |
| Marikina River — Sto. Niño (EFCOS) |  15.0 m |  16.0 m |  18.0 m | High (PAGASA via Marikina MDRRMO, Daily Tribune 2025) |
| Pasig River — Rosario / Pandacan   |  12.0 m |  12.5 m |  13.0 m | **Medium — verify with PAGASA FFWS before use**       |

Datum: gauge datum per river, **not** a common vertical datum. Comparisons across rivers are
invalid. Used in `Thresholds` tab, the water-level calibration, and `RiskLevel`.

### S4 — Open-Meteo ERA5 archive

| Field            | Value                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Provider         | Open-Meteo (re-analysis of ECMWF/Copernicus ERA5)                                                                                          |
| Endpoint         | `archive-api.open-meteo.com/v1/archive`                                                                                                    |
| Retrieved        | 2026-11-15                                                                                                                                 |
| Variables        | `precipitation_sum` (daily), plus `temperature_2m_max/min` for the audit rows                                                              |
| Coordinates      | Manila 14.587/120.979 · Quezon City 14.6509/121.0486 · Marikina 14.65/121.10 · Pasig 14.59/121.07                                          |
| Coverage used    | 2025-11-15 → 2026-11-14 (365 days × 4 cities) + 2020-11-11/12 anchor                                                                       |
| Units            | mm/day; °C                                                                                                                                 |
| Timezone         | Asia/Manila (`timezone=Asia/Manila`)                                                                                                       |
| Update frequency | ERA5 lags real time by ~5 days; refetch to extend                                                                                          |
| Licence          | Copernicus ERA5, CC-BY-4.0, via Open-Meteo                                                                                                 |
| Stored           | `data/era5_recent_rainfall.py` (verbatim, so builds are reproducible)                                                                      |
| Used in          | `ERA5_Verification` tab; `RainSource = ERA5-reanalysis` / `ERA5-anchor` rows                                                               |
| Limitation       | Reanalysis ≈ 9–30 km grid cell. It is **not** a rain gauge: it smooths local convective peaks and cannot resolve barangay-scale variation. |

**Quality note:** ERA5 annual totals for the four coordinates landed at 2,058–2,329 mm, inside
the PAGASA normal range (2,044–2,574 mm), which supports using it as the real rain tail.

### S5 — Documented flood events

| Event                    | Date       | Rainfall                            | Reference                             |
| ------------------------ | ---------- | ----------------------------------- | ------------------------------------- |
| Typhoon Ondoy (Ketsana)  | 2009-09-26 | 455 mm/24 h; Marikina > 21 m        | UP NOAH; NDRRMC summaries             |
| Habagat + Haikui         | 2012-08-07 | 1,007.4 mm/3 days                   | PAGASA via press                      |
| Typhoon Ulysses (Vamco)  | 2020-11-12 | 178.4 mm/day (ERA5, Manila)         | PAGASA; NDRRMC (98 deaths, ≈ ₱20.3 B) |
| Typhoon Carina + Habagat | 2024-07-24 | ≈ 217 mm/24 h; Marikina 20.5–20.6 m | PAGASA via press                      |

Used in the `Flood_Events` tab. Cited as magnitudes and impacts only; they are **not** used as
training labels because the daily/site attribution needed for that is missing.

### S6 — RiverGuard synthetic generator

| Field            | Value                                                                                                                                                                                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File             | `data/generate_dataset.py` (seed 42, deterministic)                                                                                                                                                                                                                                                                                               |
| Rainfall         | Markov wet/dry state + Gamma intensity; monthly totals rescaled to S1 normals × U(0.85, 1.15); 60 % shared NCR synoptic factor                                                                                                                                                                                                                    |
| Water level      | Rainfall routed through two stores — `quick_t = 0.80·quick + Rain`, `slow_t = 0.97·slow + 0.06·Rain`, `index = 0.012·quick + 0.030·slow` — then mapped onto the river's alarms: `p98(index)` → Alarm 1, dry-season floor `Alarm 1 − 2.0 m`, cap `Alarm 3`, noise `N(0, 0.05)`. Rises after a storm and recedes over days; Alarm 1 on ~2 % of days |
| Soil moisture    | Bucket: `SM += Rain − ET0 − 0.08·SM`, clamped 5–95                                                                                                                                                                                                                                                                                                |
| Flood label      | `WL ≥ Alarm1 OR (Rain ≥ 100 & Ant7 ≥ 150) OR Ant3 ≥ 250`                                                                                                                                                                                                                                                                                          |
| Units / timezone | mm/day, m, %, °C · Asia/Manila local days                                                                                                                                                                                                                                                                                                         |
| Licence          | Generated in-repo; no third-party data redistributed                                                                                                                                                                                                                                                                                              |
| Limitation       | **Not observations.** Water level is a formula over rainfall, so any model trained on it partly relearns that formula.                                                                                                                                                                                                                            |

### S7 — Open-Meteo historical forecast archive

| Field        | Value                                                                                                                                                                                                                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider     | Open-Meteo (archived runs of ECMWF IFS, GFS, ICON and others)                                                                                                                                                                                                                                                  |
| Endpoint     | `historical-forecast-api.open-meteo.com/v1/forecast`                                                                                                                                                                                                                                                           |
| Variables    | `precipitation_sum`, `temperature_2m_max/min`, `et0_fao_evapotranspiration` (daily); `soil_moisture_0_to_7cm` (hourly, averaged per local day with a 6-sample minimum)                                                                                                                                         |
| Coordinates  | The same four as S4 — Marikina 14.65/121.10 · Quezon City 14.6509/121.0486 · Manila 14.587/120.979 · Pasig 14.59/121.07                                                                                                                                                                                        |
| Coverage     | 2021-01-01 → present. One backfill run is capped at 365 days, and nothing beyond today in Manila                                                                                                                                                                                                               |
| Timezone     | Asia/Manila (`timezone=Asia/Manila`)                                                                                                                                                                                                                                                                           |
| Requested by | `scripts/backfill_observed_weather.mjs` (`npm run data:backfill`) — on demand only; never called at run time                                                                                                                                                                                                   |
| Written to   | The observation store (`observedWeather`, or `.data/observations.json` with no deployment), `provider = open-meteo-historical-forecast`                                                                                                                                                                        |
| Licence      | Open-Meteo, CC-BY-4.0; the free tier is for non-commercial use                                                                                                                                                                                                                                                 |
| Limitation   | **Model output, not a gauge** — and not the forecast as it was issued either: the archive keeps each update's initial hours, so a day's value is a near-analysis. For fixed-lead forecasts use Open-Meteo's Previous Runs API (from 2024); there is no issue-time archive for pre-2021 events such as Ulysses. |

This is the source that closes, for recent days, the gap listed in §3. It never touches
`data/daily_observations.csv`: the dataset stays a generated snapshot, and the archive only fills the live
store that extends it.

---

## 3. What is still missing (Phase 1 remainder)

| Gap                                                | Why it matters                              | Where to request                                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PAGASA AWS / EFCOS rainfall series                 | Real rainfall at station resolution, hourly | PAGASA-HMD; DOST-ASTI PhilSensors                                                                                                                              |
| PAGASA FFWS / EFCOS water-level telemetry          | Only real data can satisfy the Model A gate | PAGASA FFWS; Marikina MDRRMO                                                                                                                                   |
| LGU-verified flood events with dates and locations | Label quality for Model B                   | CDRRMO of QC, Marikina, Manila, Pasig; NDRRMC                                                                                                                  |
| NCR / barangay boundaries, rivers, catchments      | Map layers                                  | PSA; Project NOAH; OSM (with licence checks)                                                                                                                   |
| DEM/DTM, land cover, soils                         | Terrain features                            | DOST-ASTI; PhilGIS                                                                                                                                             |
| Issue-time forecast snapshots before 2021          | Reproduce what was known at issue time      | Partly closed for recent days by S7 (archive 2021→now, fixed 1–7 day leads via Previous Runs from 2024); still missing for earlier events such as Ulysses 2020 |

---

## 4. Conventions

- **Timezone:** all dates are Asia/Manila (UTC+8) local calendar days. No UTC timestamps exist in the dataset.
- **Units:** rainfall mm/day; water level m (per-river gauge datum); soil moisture %; temperature °C; ET0 mm/day.
- **Missing data:** never zero-filled. The synthetic dataset has no missing values by construction; the rule applies from the first real agency file onwards.
- **Provenance column:** every daily row carries `RainSource` (`ERA5-reanalysis` / `ERA5-anchor` / `synthetic-calibrated`) and `QualityStatus`.
- **Licence hygiene:** no third-party raw data is redistributed in this repository. PAGASA figures are cited facts; ERA5 is CC-BY-4.0.
