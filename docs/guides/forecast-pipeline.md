# Forecast pipeline — weather → model → Convex → dashboard

How a "Run forecast" click turns into a stored seven-day outlook, what each layer owns, and what
fails when. Complements [`docs/plan/phase-04-api-integration-hosting.md`](../plan/phase-04-api-integration-hosting.md).

> **The output is a test model's opinion.** Water level, soil moisture and flood labels in dataset v2
> are derived from rainfall, so the model reproduces a generator rather than a gauge. Everything here
> is decision support inside a research prototype, never an official warning.

---

## 1. What runs where

| Component | Where | Talks to | Responsibility |
|---|---|---|---|
| Dashboard (`apps/web`) | Local Next.js, port 3000 | Convex (read), `/api/forecast` | Shows the outlook, triggers a run |
| `/api/forecast` route | Same Next process | Open-Meteo, ML service, Convex | The only orchestrator; holds provider secrets |
| ML service (`services/ml`) | Local FastAPI, port 8000 | nothing | Feature engineering + inference |
| Weather provider | Public API | — | 30 past days + 7 forecast days per point |
| Convex | Cloud deployment | — | Stores runs, forecasts, assessments, alerts |

Two directions that must never be reversed:

- **Convex never calls this machine.** A cloud function cannot reach `127.0.0.1:8000`, so all writes
  go local → cloud.
- **The browser never calls the weather API or the ML service.** Provider keys stay server-side and
  the ML service is bound to loopback.

## 2. One-time setup

```bash
npm ci                                        # node deps for web + convex
python3 -m pip install -e "services/ml[dev]"  # fastapi, uvicorn, pydantic, pytest
cp .env.example apps/web/.env.local           # then fill in the Convex values
npx convex dev                                # once: creates the deployment and convex/_generated
```

`apps/web/.env.local` needs at minimum:

```ini
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=dev:your-deployment-name
ML_API_BASE_URL=http://127.0.0.1:8000
WEATHER_PROVIDER=open-meteo
```

## 3. Running it

Three terminals:

```bash
# 1 — inference
cd services/ml && uvicorn app.main:app --reload --port 8000     # docs at /docs

# 2 — database (also regenerates convex/_generated types)
npm run convex:dev

# 3 — web
npm run dev                                                     # http://localhost:3000/admin/research
```

Press **Refresh** on the research workspace. The status line under the page heading reports the
provider, model version, and time of the run. A stored run is picked up on page load through the
Convex subscription, so a reload does not spend another weather call.

## 4. What happens on a click

1. `POST /api/forecast { locationCode: "marikina" }`.
2. The route resolves the location from `apps/web/src/lib/locations.ts` (coordinates + alarm levels,
   mirrored from `ml/artifacts/model.json`).
3. The weather adapter fetches one Open-Meteo call: `past_days=30`, `forecast_days=7`, daily
   `precipitation_sum`, `temperature_2m_max`, `temperature_2m_min`, `et0_fao_evapotranspiration`,
   timezone `Asia/Manila`.
4. From that series the adapter derives the model's observed inputs: today's rain, the antecedent
   3/7/30-day sums (excluding today, matching the dataset's shifted windows), and soil moisture from a
   water-balance bucket warmed up over the 30-day window.
5. `POST {ML_API_BASE_URL}/v1/forecast/daily` with the observed state and the seven days.
6. The ML service chains them: predict day *d*, fold its rain into the antecedent sums and the soil
   bucket, predict day *d+1*. Each day comes back with probability, water level, risk level, alarm
   crossing, and a one-sentence reason.
7. The route calls the Convex mutation `forecasts:recordOutlook`, which writes one `forecastRuns` row,
   seven `forecasts`, seven `riskAssessments`, a `modelVersions` row if it is new, and an alert for
   every `elevated` day — then resolves alerts superseded by this run.
8. The dashboard renders the response immediately and the Convex subscription delivers the same run
   on the next page load.

## 5. Failure modes

| Symptom | Cause | Behaviour |
|---|---|---|
| 503 `The local ML service did not produce a forecast` | uvicorn not running, or wrong `ML_API_BASE_URL` | Weather result is still returned in `weather`; nothing is stored |
| 502 `Weather provider failed and fixture fallback is disabled` | Open-Meteo unreachable and `WEATHER_ALLOW_FIXTURE=false` | Explicit failure instead of invented numbers |
| `weather.degraded: true` | Provider failed and the fixture was allowed | Runs end to end, dashboard labels it illustrative, Convex marks rows `unverified` |
| 400 `Unknown locationCode` | Not one of the four cities | Lists the supported codes |
| Outlook not saved | `NEXT_PUBLIC_CONVEX_URL` unset, or mutation error | Forecast still returned; `persistence.error` says why |
| Alert never appears | No day reached `elevated` | Only elevated days raise alerts |

## 6. What is deliberately not automated

Convex crons cannot reach this machine, so a cron **cannot** refresh the forecast. The only scheduled
job (`convex/crons.ts`) fails runs that were requested but never completed, keeping the dashboard
from showing a phantom "in progress".

Options if unattended refresh is wanted later, cheapest first:

1. A local scheduler (Task Scheduler / `launchd` / `systemd --user`) that curls `/api/forecast` on a
   schedule on this machine.
2. Move the whole pipeline into a hosted worker, at which point the Convex restriction disappears —
   but so does the "runs on one laptop" model the project is built around.

## 7. Guardrails worth keeping

- Every payload carries the model's warning string; it is stored in `riskAssessments.limitations` and
  shown in the dashboard. Do not strip it to make the UI quieter.
- `alarmsVerified` is `false` for Quezon City, Manila and Pasig. Only Marikina's 15/16/18 m values are
  documented; the UI must not present the others as official thresholds.
- Contributed explanations are local sensitivity, not SHAP. `services/ml/app/services/explainability.py`
  says so in its module docstring; keep that language if you build on it.
