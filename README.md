# RiverGuard

**Explainable Flood Forecasting and Hydrological Risk Assessment — Local Demonstration**

> **Project status:** Research prototype / local demonstration  
> **Study area:** National Capital Region (NCR), Philippines  
> **Initial development-data coverage:** Quezon City, Marikina, Manila, and Pasig  
> **Application execution:** Local computer only  
> **Hosted application dependency:** Convex development deployment only  
> **External runtime data integration:** Weather forecast API  
> **Deployment policy:** Do not deploy the website or ML service publicly.

RiverGuard is a research prototype for exploring how weather forecasts, historical hydrological observations, flood-event records, and geographic information can be combined to estimate future water levels and localized flood risk across NCR.

The current supplied development dataset contains daily records for four NCR cities: Quezon City, Marikina, Manila, and Pasig. This is an initial subset, not complete NCR-wide or barangay-level coverage. Expansion to other NCR local government units and more precise spatial units depends on obtaining verified observations, event labels, and geographic boundaries.

RiverGuard is a decision-support research prototype. It does not replace PAGASA advisories, LGU procedures, professional hydrological assessments, or official evacuation instructions.

---

## 1. Current scope and execution policy

The website and Python ML service run on the developer's computer. Convex is the only hosted application backend/database dependency. The local application makes outbound requests to a weather forecast API when a user requests a forecast.

| Component | Where it runs | Responsibility |
|---|---|---|
| Next.js web application | Local computer (`localhost`) | Dashboard, maps, charts, and user interactions |
| Next.js route handlers | Local Next.js process | Weather API requests and local ML orchestration |
| Python + FastAPI ML service | Local computer (`127.0.0.1`) | Feature validation and model inference |
| ML training and preprocessing | Local computer | Data preparation, training, validation, and evaluation |
| Model artifacts and development datasets | Local filesystem | Raw/processed data, geographic assets, and trained models |
| Convex | Convex development deployment | Application database, queries, mutations, and reactive updates |
| Weather forecast provider | External API | Forecast inputs retrieved on explicit user request |
| Geographic layers | Local files | NCR boundaries, rivers, catchments, terrain derivatives, and hazard layers |

### Explicitly out of scope

- Public website deployment, Vercel hosting, or any other frontend hosting.
- Publicly hosted FastAPI or ML inference endpoints.
- AWS Lambda, ECR, ECS/Fargate, EC2, API Gateway, S3, CloudFront, IoT Core, SQS, EventBridge, RDS, NAT Gateway, or other AWS infrastructure.
- A separately hosted PostgreSQL, PostGIS, TimescaleDB, or other application database.
- Separate hosted object storage, CDN, map-tile hosting, or scheduled-worker services.
- Production sensor ingestion or continuously running device infrastructure.
- Public operational warnings or automatic evacuation decisions.
- Automatic background forecast scheduling. A user initiates a forecast from the local dashboard.

The only intended remote application dependency is Convex. The only intended external runtime data API is the weather forecast provider. Map boundaries, hazard layers, and other RiverGuard GIS data required for the demo should be prepared and stored locally. The current frontend map milestone makes one explicit exception: it uses the public OpenStreetMap raster basemap so the MapLibre interaction can be exercised before verified local GIS assets are supplied. Attribution is shown in the map, and this provider must be reviewed or replaced with a cached/local source before production use.

## 2. Study area and available development data

### 2.1 NCR target area

The research target is NCR. The initial development dataset includes four city-level locations:

- Quezon City
- Marikina
- Manila
- Pasig

The application may be designed to support all NCR cities/municipalities, but it must show coverage only where the required data and geography are available. The supplied CSV does not contain records for every NCR local government unit and does not identify individual barangays, monitoring-station coordinates, or specific river reaches.

**Initial spatial-resolution rule:** Until finer-grained verified data is obtained, treat the supplied records as city-level daily records. Do not distribute one city-level row across all barangays or represent it as a barangay-specific measurement. A city-level map marker or summary is more defensible than a fabricated high-resolution flood surface.

### 2.2 Audit of the supplied NCR CSV

The uploaded `archive (2)(1).zip` contains one file: `Flood_Prediction_NCR_Philippines.csv`.

| Property | Inspected result |
|---|---|
| Rows | 7,308 |
| Columns | 7 |
| Date range | 2016-01-01 through 2020-12-31 |
| Temporal frequency | One daily record per location/date in the file |
| Locations | Quezon City, Marikina, Manila, Pasig |
| Rows per location | 1,827 |
| Missing values | None found in the inspected file |
| Duplicate date/location pairs | None found |
| `FloodOccurrence = 1` | 132 rows |
| `FloodOccurrence = 0` | 7,176 rows |

Columns:

| Column | Apparent meaning | Important caveat |
|---|---|---|
| `Date` | Daily record date | No time-of-day or timezone is supplied |
| `Location` | City label | No station ID, barangay ID, or coordinates |
| `Rainfall_mm` | Rainfall amount | Aggregation interval and measurement source are undocumented |
| `WaterLevel_m` | Water-level value | Gauge/site, datum, observation method, and time are undocumented |
| `SoilMoisture_pct` | Soil-moisture percentage | Sensor/product, depth, and measurement method are undocumented |
| `Elevation_m` | Elevation value | Constant within each city in this file; reference point/source are undocumented |
| `FloodOccurrence` | Binary flood label | Event definition, reporting source, and spatial/temporal meaning are undocumented |

Flood-label counts in the supplied file:

| Location | Positive rows | Total rows |
|---|---:|---:|
| Quezon City | 41 | 1,827 |
| Marikina | 32 | 1,827 |
| Manila | 21 | 1,827 |
| Pasig | 38 | 1,827 |

**Critical provenance limitation:** The ZIP contains no data dictionary, source citation, station metadata, collection methodology, or validation documentation. The values may be synthetic, aggregated, or otherwise unsuitable as observed measurements. Do not assume they are official measurements or verified flood-event labels. Treat the file as a preliminary schema/pipeline smoke-test dataset until its source and semantics are independently verified. Do not report model metrics from it as real-world NCR flood-prediction performance.

### 2.3 Data acquisition priority

Before making operational-sounding predictions, obtain and document:

1. Historical rainfall observations with station coordinates, timestamp, units, and aggregation interval.
2. Historical water-level observations with station identity, timestamp, units, and measurement datum.
3. Dated and geographically attributable flood-event records from relevant NCR LGU disaster-risk offices and other authoritative sources.
4. Official NCR city/municipality and barangay boundaries.
5. River, creek, drainage, catchment, and water-body data.
6. DEM/DTM, slope, flow direction, flow accumulation, land-cover, and soil information.
7. Historical weather forecast snapshots where available, to reproduce the information that would have been available at forecast issue time.

Keep provenance, license, geographic coverage, temporal coverage, measurement method, and known limitations in a data catalog.

## 3. Main capabilities

### 3.1 Geographic hazard visualization

- Display the NCR boundary and available city/municipality and barangay boundaries.
- Display prepared hazard layers where their geographic coverage, attribution, and license are verified.
- Display available rivers, lakes, catchments, drainage features, and monitoring stations.
- Keep static flood susceptibility visually and semantically separate from dynamic model predictions.
- Show city-level summaries only where city-level evidence exists; show barangay or grid-cell predictions only where training labels and geographic features support that resolution.

### 3.2 Hydrological data management

- Store monitoring-station metadata and validated observations.
- Preserve observation time, ingestion time, units, source, coordinates, and quality status.
- Display historical rainfall and water-level charts where verified data exists.
- Avoid treating missing readings as zero.

### 3.3 Seven-day weather and flood-risk outlook

- Retrieve a seven-day forecast for each selected supported NCR location from the configured weather provider.
- Use a documented representative coordinate for each city or spatial unit; do not invent coordinates or imply that a coarse forecast grid resolves street-level conditions.
- Retain provider, retrieval time, location coordinates, timezone, forecast-valid timestamps, units, and relevant provider issue/model metadata.
- Prepare time-aligned features for the trained models.
- Generate daily risk estimates only for locations and horizons supported by model validation.
- Communicate increasing uncertainty at longer lead times. Days 4–7 are an extended outlook unless validation establishes stronger performance.

### 3.4 Explainability and review

- Show model version, feature-schema version, forecast horizon, input freshness, and data-quality warnings.
- Show SHAP feature contributions only for supported and validated model outputs.
- Describe SHAP values as model contributions, not proof of physical causation.
- Retain the ability to compare successive forecast runs.

## 4. ML model responsibilities

RiverGuard separates hydrological forecasting from localized flood-risk estimation.

### Model A — Hydrological forecasting

**Purpose:** Predict future water levels at monitoring stations or other validated measurement locations in NCR.

Candidate inputs include:

- Current and lagged water-level readings.
- Recent observed rainfall and rolling rainfall totals.
- Forecast rainfall aligned to the prediction horizon.
- Soil moisture, when available and suitable.
- River discharge and upstream water levels, when available.
- Station, river, and catchment attributes.
- Time and seasonal features.

Primary output: predicted water level by station and target timestamp, with uncertainty where supported.

**Data gate:** Model A requires timestamped historical water-level observations for the target station or a defensible, validated transfer strategy. The supplied CSV's `WaterLevel_m` field is not sufficient evidence of a real gauge series until its source, site, datum, and measurement semantics are verified.

### Model B — Localized flood-risk prediction

**Purpose:** Estimate the probability of a dated flood occurrence for a supported spatial unit (city, subcatchment, or grid cell) and summarize results at a matching geographic level.

Candidate inputs include:

- Forecast and antecedent rainfall.
- Soil-moisture information, where available.
- Model A water-level forecasts, where relevant and available.
- Elevation, slope, flow accumulation, and catchment attributes.
- Land cover, soil properties, rivers, lakes, and drainage information.
- Existing official hazard susceptibility classifications as contextual features.

Primary outputs: calibrated flood-occurrence probability and risk category for a defined area and time window. Flood depth is a separate target and must not be displayed unless suitable depth observations or validated inundation labels are available.

**Data gate:** Model B requires dated, geographically attributable flood-event labels and non-event examples. The supplied `FloodOccurrence` field cannot be treated as ground truth until the event definition, source, and labeling method are verified. Static hazard polygons alone cannot teach the model when an area will flood.

## 5. Local development prerequisites

Install on the development computer:

- Node.js 20.9 or newer and npm 11. The repository currently uses an npm
  workspace and records the expected package-manager version in `package.json`.
- Python version supported by `services/ml/pyproject.toml`.
- Git.
- A Convex account and development deployment.
- A weather forecast provider selected in application configuration.

No AWS account, cloud container registry, public hosting account, or separate map hosting account is required.

## 6. Local setup

The Next.js frontend foundation and Convex schema are runnable now. A Convex
development deployment still needs to be selected before database queries are
connected to the dashboard. The Python ML service remains a planned
integration.

### 6.1 Install JavaScript dependencies

From the repository root:

```bash
npm install
```

The root `package-lock.json` is the authoritative JavaScript dependency lockfile.

The first time you configure Convex, run this from the repository root:

```bash
npm run convex:dev
```

Choose a development deployment when prompted. The command writes the local
deployment values to `apps/web/.env.local`, generates the typed API files under
`convex/_generated/`, and keeps the schema synchronized while it is running.
Keep the generated `.env.local` file out of Git. The approved dashboard falls
back to its clearly labelled sample data when no Convex URL is configured.

### 6.2 Start the Python ML service

The ML package is currently a placeholder. The following is the intended
workflow after `services/ml/pyproject.toml` and the FastAPI application are
implemented.

In a separate terminal:

```bash
cd services/ml
python -m venv .venv
```

Activate the environment and install project dependencies according to `pyproject.toml`:

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -e .
```

```bash
# macOS / Linux
source .venv/bin/activate
pip install -e .
```

Start FastAPI (assuming the entry point is `app.main:app`):

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The local API should expose a health endpoint such as `GET http://127.0.0.1:8000/health`.

### 6.3 Start Next.js

From the repository root:

```bash
npm run dev
```

Open the local URL printed by Next.js, normally `http://localhost:3000`. During
backend work, keep `npm run convex:dev` running in a second terminal.

Available frontend quality commands:

```bash
npm run build
npm run lint
npm run typecheck
npm run format:check
```

### 6.4 Local environment configuration

Example only; align variable names with the implementation:

```dotenv
# apps/web/.env.local
NEXT_PUBLIC_CONVEX_URL=<Convex development deployment URL>
ML_API_BASE_URL=http://127.0.0.1:8000
WEATHER_PROVIDER=open-meteo
```

Only `NEXT_PUBLIC_` variables are exposed to the browser. Do not put weather credentials, ML credentials, or other secrets in browser-visible variables. If the selected weather provider requires a key, keep it server-side. Do not commit `.env.local`, Convex credentials, API keys, private datasets, or model artifacts.

## 7. Local forecast request flow

The local Next.js server coordinates weather retrieval and local ML inference. It does not ask a cloud-hosted Convex function to call a service on the developer's computer.

1. A user selects one or more supported NCR locations and a seven-day horizon in the local dashboard.
2. The browser calls a local Next.js route handler such as `POST /api/forecast/run`.
3. The local route requests forecast data from the configured weather API for each supported location/representative coordinate.
4. The route normalizes units, timestamps, timezone, forecast-validity periods, and rolling rainfall features.
5. The route combines forecast inputs with recent verified observations and locally prepared geographic features.
6. The route sends a validated payload to the local FastAPI service at `127.0.0.1:8000`.
7. FastAPI runs Model A only where gauge data and a compatible model exist, then runs Model B only for supported spatial units and validated model versions.
8. The local route returns predictions, uncertainty, model status, data-quality warnings, and provenance to the browser.
9. The browser saves forecast snapshots and predictions through Convex mutations.
10. Convex subscriptions update the dashboard and allow historical runs to be reviewed.

Do not configure a Convex action to call `localhost:8000`; a cloud-hosted Convex function cannot reach the developer's local loopback service. The browser should not call the weather API directly if doing so would expose provider secrets. Keep weather and ML orchestration in the local Next.js server route.

## 8. Suggested repository structure

```text
riverguard/
├── apps/
│   └── web/                      # Local Next.js application
│       ├── app/api/               # Local weather + ML orchestration routes
│       ├── components/
│       └── public/maps/           # Small prepared local map assets
├── convex/                        # Hosted Convex schema, queries, mutations
├── services/
│   └── ml/
│       ├── app/
│       │   ├── api/
│       │   ├── core/
│       │   ├── schemas/
│       │   └── services/
│       ├── models/
│       │   ├── hydrological/      # Model A
│       │   └── flood_risk/        # Model B
│       ├── tests/
│       └── pyproject.toml
├── data/
│   ├── samples/                   # Small, non-sensitive fixtures
│   ├── raw/                       # Local-only; gitignored
│   ├── processed/                 # Local-only; gitignored
│   └── geographic/                # Local GIS assets; gitignored when large
└── docs/
    ├── architecture/riverguard-architecture.md
    ├── plan/roadmap-phases.md
    ├── data-sources.md
    └── ml-methodology.md
```

Do not commit large raw datasets, PMTiles archives, private sensor records, or trained model binaries without an explicit repository decision.

## 9. Data quality and model safety rules

- Preserve source timestamps, timezone, units, station coordinates, and ingestion time.
- Never silently replace missing measurements with zero.
- Verify whether rainfall values are interval totals, accumulations, or rates before feature engineering.
- Distinguish observed data, reanalysis, forecast data, modeled products, and static susceptibility layers.
- Align forecast inputs to the information available at forecast issue time; do not use future observations as forecast features.
- Use chronological and storm-event-based train/test splits. Avoid random splits that leak adjacent time steps from the same event.
- Report performance by forecast horizon and supported location.
- Calibrate probabilities using held-out data; do not equate a raw classifier score with a validated probability.
- Do not generate Model A water-level forecasts where required gauge inputs or a validated model are missing.
- Do not claim exact flood depths without adequate depth labels and validation.
- Treat Days 4–7 as an extended outlook unless model validation supports stronger claims.
- Clearly distinguish model predictions from official PAGASA/LGU warnings.

## 10. Documentation

- [Technical architecture](docs/architecture/riverguard-architecture.md)
- [Delivery roadmap](docs/plan/roadmap-phases.md)

Keep these documents synchronized whenever the target geography, local workflow, feature schema, data ownership, or model responsibilities change.
