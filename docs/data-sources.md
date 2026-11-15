# Data Sources & Catalog — RiverGuard NCR

**Last updated:** 2026-11-15
**Companion documents:** [`data/README.md`](../data/README.md) (column-level reliability),
[`plan/phase-01-data-acquisition-exploration.md`](plan/phase-01-data-acquisition-exploration.md) (Go/No-Go)

This is the catalogue Phase 1 T2/T4 requires: for every source — licence, geographic coverage,
temporal coverage, units, update frequency, and limitations. It separates **real** sources from
**derived or synthetic** series so nothing is mistaken for an observation.

---

## 1. Summary

| # | Source | Type | Used for | Real? |
|---|--------|------|----------|-------|
| S1 | PAGASA Climatological Normals 1991–2020 | Published climatology | Monthly rainfall/temperature calibration targets | ✅ Real (published) |
| S2 | PAGASA rainfall warning system (Yellow/Orange/Red) | Operational thresholds | Warning thresholds + flood-proxy rules | ✅ Real (published) |
| S3 | PAGASA / Marikina MDRRMO river alarm levels | Operational thresholds | Marikina 15/16/18 m; Pasig 12/12.5/13 m | ✅ Real for Marikina; ⚠️ indicative for Pasig |
| S4 | Open-Meteo ERA5 archive (Copernicus ERA5) | Reanalysis | Real daily rainfall, 2025-11-15 → 2026-11-14 + Ulysses anchor | ✅ Real |
| S5 | Documented flood events (Ondoy 2009, Habagat 2012, Ulysses 2020, Carina 2024) | Secondary literature / press | Reference event magnitudes and impacts | ✅ Real (secondary sources) |
| S6 | RiverGuard generator (`data/generate_dataset.py`) | Synthetic | Rainfall 2016 → 2025-11-14; derived water level, soil moisture, flood proxy | ❌ Synthetic / derived |

---

## 2. Source detail

### S1 — PAGASA Climatological Normals 1991–2020

| Field | Value |
|---|---|
| Provider | DOST-PAGASA |
| Reference | `pagasa.dost.gov.ph` → Climate → Climatological Normals (Port Area PDF; Science Garden table) |
| Coverage | Port Area, Manila (14°35′13″N, 120°58′43″E, 15 m) and Science Garden, Quezon City |
| Temporal | Monthly 1991–2020 normals |
| Units | mm/month rainfall; °C mean max/min; rainy-day counts |
| Update frequency | Per normal period (decadal) |
| Licence | Government publication, cited not redistributed |
| Used in | `Climatology` tab; calibration targets for the synthetic generator |
| Limitation | Station normals, not area averages. Marikina and Pasig values are interpolated, not observed. |

Annual totals used: Port Area **2,242.7 mm**, Science Garden **2,574.3 mm**.

### S2 — PAGASA rainfall warnings

| Field | Value |
|---|---|
| Provider | DOST-PAGASA |
| Reference | Yellow 7.5–15 mm/h; Orange 15–30 mm/h (or 3 h > 45–65 mm); Red > 30 mm/h (or 3 h > 65 mm) — reported via Inquirer (2012), GMA News |
| Temporal | Operational, real-time |
| Units | mm/h and mm/3 h |
| Licence | Public advisory, cited |
| Used in | `Thresholds` tab; the `Rainfall_mm ≥ 100` clause of the flood proxy |
| Limitation | Hourly thresholds applied to a **daily** dataset — the proxy is therefore conservative and coarse. |

### S3 — River alarm levels

| River / station | Alarm 1 | Alarm 2 | Alarm 3 | Confidence |
|---|---:|---:|---:|---|
| Marikina River — Sto. Niño (EFCOS) | 15.0 m | 16.0 m | 18.0 m | High (PAGASA via Marikina MDRRMO, Daily Tribune 2025) |
| Pasig River — Rosario / Pandacan | 12.0 m | 12.5 m | 13.0 m | **Medium — verify with PAGASA FFWS before use** |

Datum: gauge datum per river, **not** a common vertical datum. Comparisons across rivers are
invalid. Used in `Thresholds` tab, the water-level calibration, and `RiskLevel`.

### S4 — Open-Meteo ERA5 archive

| Field | Value |
|---|---|
| Provider | Open-Meteo (re-analysis of ECMWF/Copernicus ERA5) |
| Endpoint | `archive-api.open-meteo.com/v1/archive` |
| Retrieved | 2026-11-15 |
| Variables | `precipitation_sum` (daily), plus `temperature_2m_max/min` for the audit rows |
| Coordinates | Manila 14.587/120.979 · Quezon City 14.6509/121.0486 · Marikina 14.65/121.10 · Pasig 14.59/121.07 |
| Coverage used | 2025-11-15 → 2026-11-14 (365 days × 4 cities) + 2020-11-11/12 anchor |
| Units | mm/day; °C |
| Timezone | Asia/Manila (`timezone=Asia/Manila`) |
| Update frequency | ERA5 lags real time by ~5 days; refetch to extend |
| Licence | Copernicus ERA5, CC-BY-4.0, via Open-Meteo |
| Stored | `data/era5_recent_rainfall.py` (verbatim, so builds are reproducible) |
| Used in | `ERA5_Verification` tab; `RainSource = ERA5-reanalysis` / `ERA5-anchor` rows |
| Limitation | Reanalysis ≈ 9–30 km grid cell. It is **not** a rain gauge: it smooths local convective peaks and cannot resolve barangay-scale variation. |

**Quality note:** ERA5 annual totals for the four coordinates landed at 2,058–2,329 mm, inside
the PAGASA normal range (2,044–2,574 mm), which supports using it as the real rain tail.

### S5 — Documented flood events

| Event | Date | Rainfall | Reference |
|---|---|---|---|
| Typhoon Ondoy (Ketsana) | 2009-09-26 | 455 mm/24 h; Marikina > 21 m | UP NOAH; NDRRMC summaries |
| Habagat + Haikui | 2012-08-07 | 1,007.4 mm/3 days | PAGASA via press |
| Typhoon Ulysses (Vamco) | 2020-11-12 | 178.4 mm/day (ERA5, Manila) | PAGASA; NDRRMC (98 deaths, ≈ ₱20.3 B) |
| Typhoon Carina + Habagat | 2024-07-24 | ≈ 217 mm/24 h; Marikina 20.5–20.6 m | PAGASA via press |

Used in the `Flood_Events` tab. Cited as magnitudes and impacts only; they are **not** used as
training labels because the daily/site attribution needed for that is missing.

### S6 — RiverGuard synthetic generator

| Field | Value |
|---|---|
| File | `data/generate_dataset.py` (seed 42, deterministic) |
| Rainfall | Markov wet/dry state + Gamma intensity; monthly totals rescaled to S1 normals × U(0.85, 1.15); 60 % shared NCR synoptic factor |
| Water level | `WL = base + 0.006·Ant7 + 0.018·Rain + 0.004·Ant3 + ((Alarm3−Alarm1)/40000)·Rain² + N(0, 0.10)`; datum calibrated so Alarm 1 is exceeded ~2 % of days |
| Soil moisture | Bucket: `SM += Rain − ET0 − 0.08·SM`, clamped 5–95 |
| Flood label | `WL ≥ Alarm1 OR (Rain ≥ 100 & Ant7 ≥ 150) OR Ant3 ≥ 250` |
| Units / timezone | mm/day, m, %, °C · Asia/Manila local days |
| Licence | Generated in-repo; no third-party data redistributed |
| Limitation | **Not observations.** Water level is a formula over rainfall, so any model trained on it partly relearns that formula. |

---

## 3. What is still missing (Phase 1 remainder)

| Gap | Why it matters | Where to request |
|---|---|---|
| PAGASA AWS / EFCOS rainfall series | Real rainfall at station resolution, hourly | PAGASA-HMD; DOST-ASTI PhilSensors |
| PAGASA FFWS / EFCOS water-level telemetry | Only real data can satisfy the Model A gate | PAGASA FFWS; Marikina MDRRMO |
| LGU-verified flood events with dates and locations | Label quality for Model B | CDRRMO of QC, Marikina, Manila, Pasig; NDRRMC |
| NCR / barangay boundaries, rivers, catchments | Map layers | PSA; Project NOAH; OSM (with licence checks) |
| DEM/DTM, land cover, soils | Terrain features | DOST-ASTI; PhilGIS |
| Historical forecast snapshots | Reproduce what was known at issue time | Provider archives (Open-Meteo/ECMWF), if available |

---

## 4. Conventions

- **Timezone:** all dates are Asia/Manila (UTC+8) local calendar days. No UTC timestamps exist in the dataset.
- **Units:** rainfall mm/day; water level m (per-river gauge datum); soil moisture %; temperature °C; ET0 mm/day.
- **Missing data:** never zero-filled. The synthetic dataset has no missing values by construction; the rule applies from the first real agency file onwards.
- **Provenance column:** every daily row carries `RainSource` (`ERA5-reanalysis` / `ERA5-anchor` / `synthetic-calibrated`) and `QualityStatus`.
- **Licence hygiene:** no third-party raw data is redistributed in this repository. PAGASA figures are cited facts; ERA5 is CC-BY-4.0.
