# Forecast pipeline — weather → model → Convex → dashboard

How a "Run forecast" click turns into a stored seven-day outlook, what each layer owns, and what
fails when. Complements [`docs/plan/phase-04-api-integration-hosting.md`](../plan/phase-04-api-integration-hosting.md).

> **The output is a test model's opinion.** Water level, soil moisture and flood labels in dataset v2
> are derived from rainfall, so the model reproduces a generator rather than a gauge. Everything here
> is decision support inside a research prototype, never an official warning.

---

## 1. What runs where

| Component                  | Where                    | Talks to                       | Responsibility                                |
| -------------------------- | ------------------------ | ------------------------------ | --------------------------------------------- |
| Dashboard (`apps/web`)     | Local Next.js, port 3000 | Convex (read), `/api/forecast` | Shows the outlook, triggers a run             |
| `/api/forecast` route      | Same Next process        | Open-Meteo, ML service, Convex | The only orchestrator; holds provider secrets |
| ML service (`services/ml`) | Local FastAPI, port 8000 | nothing                        | Feature engineering + inference               |
| Weather provider           | Public API               | —                              | 30 past days + 7 forecast days per point      |
| Convex                     | Cloud deployment         | —                              | Stores runs, forecasts, assessments, alerts   |

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
4. **The provider's window is the model's input.** The adapter turns the same response into the
   input state: index `past_days` is today, so `observed.rainfallTodayMm` is today's rain and the
   antecedent 3/7/30-day sums plus the soil-moisture bucket come from the 30 days before it. No row
   is read from `data/daily_observations.csv` for a forecast — the CSV only feeds the historical
   charts and the dataset banner — so the chain cannot start days in the past. The response reports
   the input in `observedState` (`asOfDate` = last day of that window, `rainSource`, `qualityStatus`)
   and names the source rows in `weather.notes`.
5. `POST {ML_API_BASE_URL}/v1/forecast/daily` with that input state and the seven days.
6. The ML service chains them: predict day _d_, fold its rain into the antecedent sums and its ET0
   out of the soil bucket, predict day _d+1_. Both terms of the bucket are real — the provider's rain
   and the provider's `et0_fao_evapotranspiration` for each of the seven days travel in the request,
   so a cloudless week dries the catchment faster than an overcast one. (A caller that sends no ET0
   falls back to the month's normal from the artifact, which is what every day used before the field
   existed.) Each day comes back with probability, water level, risk level, alarm crossing, and a
   one-sentence reason.
7. The route stores the run, in one of two places:
   - **Convex** (`NEXT_PUBLIC_CONVEX_URL` set) — `forecasts:recordOutlook` writes one `forecastRuns`
     row, seven `forecasts`, seven `riskAssessments`, a `modelVersions` row if it is new, and an alert
     for every `elevated` day, then resolves alerts superseded by this run.
   - **This machine** (no deployment configured) — `lib/run-store.ts` appends the run to
     `.data/runs.json` (gitignored, newest first, capped at 200 runs, written atomically). Without
     this, a run existed only in the response that produced it and run history, run detail and the
     comparison screen had nothing to read.
8. The dashboard renders the response immediately and the Convex subscription delivers the same run
   on the next page load.

## 5. Failure modes

| Symptom                                                                     | Cause                                                                                          | Behaviour                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 503 `The local ML service did not produce a forecast`                       | uvicorn not running, or wrong `ML_API_BASE_URL`                                                | Weather result is still returned in `weather`; nothing is stored                                                                                                                                                                                              |
| 502 `Weather provider failed and the offline forecast fallback is disabled` | Open-Meteo unreachable and `WEATHER_ALLOW_FIXTURE=false`                                       | Explicit failure instead of invented numbers; no input state exists, so nothing is scored or stored                                                                                                                                                           |
| `weather.degraded: true`                                                    | Provider failed and the fixture was allowed                                                    | Runs end to end on the labelled fixture — which is now also its input — and the outlook panel renders a warning banner plus every warning, so illustrative rainfall is never presented as a forecast                                                          |
| `observedState.qualityStatus: "degraded"`                                   | The input came from the offline fixture                                                        | Same as `weather.degraded`; the run is shown with a warning, never as a live forecast                                                                                                                                                                         |
| 400 `Unknown locationCode`                                                  | Not one of the four cities                                                                     | Lists the supported codes                                                                                                                                                                                                                                     |
| Outlook not saved to `.data/runs.json`                                      | `persistence.kind: "none"` — disk full, permissions                                            | Forecast still returned; `persistence.error` says why                                                                                                                                                                                                         |
| Run stored locally only                                                     | `NEXT_PUBLIC_CONVEX_URL` unset                                                                 | `persistence.kind: "local"`; the run is readable from `/admin/research/runs` on this machine and nowhere else                                                                                                                                                 |
| Panel says "Convex is not configured" while the deployment is fine          | Fixed: the sentence was inferred from `source`, which is `live` for any run this tab performed | The screens now render `persistence` — `{kind, stored, error}` — so a stored run says so, a refused write says the write failed (`npm run convex:dev`), and only an unset URL mentions configuration. The same four words appear on the dashboard status line |
| `Could not find public function for 'forecasts:getRun'`                     | Deployment behind `convex/`                                                                    | Run detail and comparison report it; push with `npm run convex:dev`                                                                                                                                                                                           |
| Alert never appears                                                         | No day reached `elevated`                                                                      | Only elevated days raise alerts                                                                                                                                                                                                                               |

## 5.1 Reading runs back

Both stores expose the same records, so the screens do not care where a run lives:

| Screen      | URL                                     | Reads                                          |
| ----------- | --------------------------------------- | ---------------------------------------------- |
| Run history | `/admin/research/runs`                  | `forecasts:recentRuns`, or `GET /api/runs`     |
| Run detail  | `/admin/research/runs/<runId>`          | `forecasts:getRun`, or `GET /api/runs/<runId>` |
| Compare     | `/admin/research/compare?a=<id>&b=<id>` | the two runs above, side by side               |

The detail page shows the run record (provider, issue date, model, threshold, schema), the stored days,
and the model's reason lines verbatim. The comparison page prints B − A per day and says so when the
two runs are not like-for-like (different provider, model version, or input quality) — it does not
pretend to be a model comparison.

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

## 7. Where the numbers on screen come from

Nothing in the UI holds its own sample values. One table:

| Panel                             | Source                               | Endpoint                                                |
| --------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| Observed history charts           | live Open-Meteo, stored in Convex (`observedWeather`), with the CSV as fallback and as the water-level column | `GET /api/historical?location=&limit=`                  |
| Dataset banner + provenance panel | the same CSV's identity and coverage | `GET /api/dataset`                                      |
| Seven-day outlook                 | one completed model run              | `POST /api/forecast`                                    |
| Model contribution bars           | one-at-a-time sensitivity sweep      | `GET /api/contributions` → `POST /v1/forecast/next-day` |
| Model card, metrics, versions     | `ml/artifacts/{model,metrics}.json`  | `GET /api/model`                                        |
| Run history                       | stored `forecastRuns`                | Convex `forecasts:recentRuns`                           |

The CSV row in that table is **training data and history**, not a run-time input: the model was fitted
on those columns, and the charts read the rows back, but a forecast is always scored from the weather
provider window.

### Why the history chart is not CSV-only any more

The CSV ends on a fixed date (2026-11-14 in dataset v2), so a chart read straight from it could never
be current. `GET /api/historical` now asks Open-Meteo for the requested window, writes whatever it
returns to the `observedWeather` table in Convex, and serves the merged range. The store supplies the
past — a day it already holds is drawn as recorded, never re-fetched — and the provider supplies the
present: the gaps, plus today and yesterday, which are still accumulating or still open to revision.
A revisit inside the stored window therefore costs no provider call for the days it covers.

Two details are deliberate:

- **The archive lags.** `archive-api.open-meteo.com` publishes several days behind, so the route takes
  recent days from the forecast endpoint (which accepts up to 92 past days) and anything older from the
  archive. Days that neither publishes yet are reported in `notes` instead of being drawn as zero.
- **Water level stops with the dataset.** Only rainfall is live. The dataset's level column is a
  rainfall-derived proxy, and extrapolating it would dress a guess up as a gauge reading, so days after
  the CSV's last row carry `waterLevel: null` and the panel says so. Antecedent rainfall sums do
  continue, because they are just sums of observed days. The data-source catalogue in the app carries the same split in its "Used for" column.

If a source is missing, the panel says which one and offers the action that fixes it. There is no
static fallback for observations or outlook days — an illustrative week and a real forecast are
indistinguishable once drawn, so the UI refuses to draw one.

### 5.2 Where a run went, and how the UI knows

`POST /api/forecast` answers with `persistence: { kind, stored, error? }`. That object — not
`snapshot.source` — is what every storage sentence is derived from, through
`apps/web/src/lib/persistence.ts`:

| `persistence`                            | Screen text                                                                         |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `{kind: "convex", stored: true}`         | "Stored in Convex. Reloading this page restores this run…"                          |
| `{kind: "convex", stored: false, error}` | "Convex is configured, but the write failed…" + the warning above carries the error |
| `{kind: "local", stored: true}`          | "Stored on this machine only, in `.data/runs.json`…"                                |
| `{kind: "none", stored: false, error}`   | "This run was not stored anywhere — the warning above says why."                    |
| snapshot restored from the Convex query  | "Restored from Convex. These are the stored numbers, not a new forecast."           |

`source` is still `"live"` for a run executed in this tab and `"convex"` for one restored from the
deployment, which is what the risk panel's "just run / stored run" label reads. The two questions —
_is this fresh?_ and _did it get saved?_ — are now answered by different fields, because one field
cannot answer both.
