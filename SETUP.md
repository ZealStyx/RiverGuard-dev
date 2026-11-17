# RiverGuard — local setup

Everything in RiverGuard runs on your own computer: a Next.js website on
`localhost:3000`, a Python/FastAPI inference service on `127.0.0.1:8000`, and —
optionally — a Convex development deployment in the cloud for saving runs.
Nothing here is meant to be deployed publicly.

This guide gets a checkout to a working website. For how the pieces talk to each
other once it is running, read
[`docs/guides/forecast-pipeline.md`](docs/guides/forecast-pipeline.md).

---

## 1. Requirements

| Requirement        | Version / note                                                                           | Why                        |
| ------------------ | ---------------------------------------------------------------------------------------- | -------------------------- |
| **Git**            | any recent version                                                                       | clone the repository       |
| **Node.js**        | **≥ 20.9.0** (`engines` in `package.json`)                                               | Next.js 16 + React 19      |
| **npm**            | **≥ 10** (`packageManager` pins `npm@11.17.0`; 10.9 and 12.2 both install this lockfile) | workspaces, lockfile v3    |
| **Python**         | **≥ 3.11** (`services/ml/pyproject.toml`)                                                | inference service          |
| **Free ports**     | `3000` (website), `8000` (ML service)                                                    | defaults below             |
| **Network access** | HTTPS to `api.open-meteo.com`, and `*.convex.cloud` if you use Convex                    | weather inputs, saved runs |
| **Convex account** | free, only if you want saved forecasts                                                   | optional, see step 5       |

**Not required:** Docker, AWS, a database server, PostgreSQL/PostGIS, map-tile
hosting, or any API key. Open-Meteo is keyless. You do **not** need to train a
model — the artifact is committed.

### Already in the repository

- `data/daily_observations.csv` — 15,884 daily rows for Quezon City, Marikina,
  Manila and Pasig (2016-01-01 → 2026-11-14). This is the model's **training**
  data and the source of the historical charts. It is never read as the input to
  a forecast run.
- `ml/artifacts/model.json` — the trained model, exported as flat gradient-boosted
  trees. Re-training is optional (`ml/README.md`).
- `convex/` — schema, queries and mutations; a deployment learns about them only
  when you push (step 5).

Disk: roughly 850 MB for `node_modules`, plus a few MB of data and artifacts.

---

## 2. Step-by-step

All commands are run from the repository root unless stated otherwise.

### Step 1 — Get the code

```bash
git clone https://github.com/ZealStyx/RiverGuard-dev.git
cd RiverGuard-dev
```

### Step 2 — Install JavaScript dependencies

```bash
npm install
```

This installs the npm workspace `apps/web` plus the root tooling (Convex CLI,
Prettier) from the single root `package-lock.json`. Do not run `npm install`
inside `apps/web` as well.

Check your Node version if npm warns about `EBADENGINE`:

```bash
node -v   # must be 20.9.0 or newer
```

### Step 3 — Create the environment file

The website reads its configuration from **`apps/web/.env.local`** (not the
repository root — `next dev` runs with `apps/web` as its working directory).
That file is git-ignored.

The defaults are enough for a first run, so the smallest useful file is:

```bash
cat > apps/web/.env.local <<'EOF'
ML_API_BASE_URL=http://127.0.0.1:8000
WEATHER_PROVIDER=open-meteo
WEATHER_ALLOW_FIXTURE=false
EOF
```

[`.env.example`](.env.example) documents every variable, but its two Convex
values are placeholders — copy the file only if you are about to run step 5,
which overwrites them with a real deployment URL.

| Variable                 | Default                 | Required | Meaning                                                                                                                           |
| ------------------------ | ----------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL` | _(unset)_               | no       | Deployment the browser queries. Without it the site still renders, but forecast runs are **not saved** and the dashboard says so. |
| `ML_API_BASE_URL`        | `http://127.0.0.1:8000` | no       | Base URL of the local inference service.                                                                                          |
| `WEATHER_PROVIDER`       | `open-meteo`            | no       | `open-meteo` (live, keyless) or `fixture` (offline samples).                                                                      |
| `WEATHER_ALLOW_FIXTURE`  | `false`                 | no       | Opt in to the offline fixture when the provider fails. Only the exact string `true` enables it.                                   |

Only `NEXT_PUBLIC_*` values reach the browser. Never put keys or credentials in
those.

### Step 4 — Install and start the ML service

The website's forecast route calls this service; it must be running before you
request a forecast. The model path defaults to `ml/artifacts/model.json` relative
to the repository, so the service works from any checkout.

```bash
python3 -m venv .venv
source .venv/bin/activate            # Windows PowerShell: .\.venv\Scripts\Activate.ps1
python -m pip install -e "services/ml[dev]"
```

Start it (leave this terminal running):

```bash
cd services/ml
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Verify in another terminal:

```bash
curl http://127.0.0.1:8000/health
```

Expected: JSON with `"status":"ok"`, the model path and `"modelFilePresent": true`.
`http://127.0.0.1:8000/health/ready` additionally loads the model and returns its
version, operating threshold and warning. Interactive API docs:
`http://127.0.0.1:8000/docs`.

Run the service's tests (optional):

```bash
cd services/ml && python -m pytest -q
```

> If pip refuses with `error: externally-managed-environment`, you skipped the
> virtual environment. Use the `venv` above rather than
> `pip install --break-system-packages`.

### Step 5 — (Optional) Connect Convex for saved runs

Skip this if you only want to browse the site. Without a deployment, forecast
runs are computed and shown but not stored; the UI labels that state instead of
failing.

```bash
npm run convex:dev
```

- The first run opens a browser to log in or create a free Convex account.
- Choose **create a new deployment** / a **development** deployment when asked.
- The command writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` into
  `apps/web/.env.local`, generates `convex/_generated/`, and pushes `convex/`.

Leave it running while you work: it keeps the deployment in sync. If you stop it,
your deployment keeps the functions you already pushed.

> **`Could not find public function for 'forecasts:latestOutlook'`** means the
> deployment is behind the code — pull doesn't push. Run `npm run convex:dev`
> again (or `npx convex deploy` for a production deployment) so the functions
> exist, and make sure `NEXT_PUBLIC_CONVEX_URL` names the same deployment you
> pushed to. The dashboard now reports this instead of going blank.

### Step 6 — Start the website

In a second terminal, from the repository root:

```bash
npm run dev
```

Next.js prints the URL, normally <http://localhost:3000>. To use another port:

```bash
npm run dev --workspace @riverguard/web -- -p 3100
```

(Root `npm run dev -- -p 3100` does **not** forward the flag through the
workspace script — Next.js receives `3100` as a directory name.)

Useful entry points:

| URL                                                         | What it is                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| `/`                                                         | Landing page                                                |
| `/resident/outlook`, `/resident/locations`                  | Resident view                                               |
| `/lgu/outlook`, `/lgu/alerts`, `/lgu/reviews`               | LGU operator view                                           |
| `/admin/research`                                           | Admin research workspace — **start here**                   |
| `/admin/research/forecast/new`                              | Request a forecast run                                      |
| `/admin/research/runs`, `/admin/research/compare`           | Run history and comparison                                  |
| `/admin/data-sources`, `/admin/data-sources/daily-rainfall` | Dataset provenance: what is training data vs run-time input |
| `/design-system`                                            | Component reference                                         |

Open a location in the research workspace and request a forecast. The first run
takes a few seconds: the route fetches the weather window, derives today's rain,
the antecedent 3/7/30-day sums and soil moisture, and posts them to the ML
service.

### Step 7 — Smoke-test the API directly (optional)

With both servers running:

```bash
# Weather window + 7 days from the local model
curl -s -X POST http://localhost:3000/api/forecast \
  -H 'content-type: application/json' \
  -d '{"locationCode":"marikina"}' | head -c 600

# Attribution for the same input
curl -s 'http://localhost:3000/api/contributions?locationCode=marikina' | head -c 400

# Historical rows (training data + charts)
curl -s 'http://localhost:3000/api/historical?location=Marikina&limit=5'

# Dataset identity and coverage
curl -s http://localhost:3000/api/dataset
```

A healthy `/api/forecast` response has this shape:

```json
{
  "location": {
    "code": "marikina",
    "name": "Marikina",
    "alarms": [15, 16, 18]
  },
  "weather": { "provider": "open-meteo", "degraded": false, "days": [] },
  "observedState": {
    "source": "weather",
    "asOfDate": "2026-11-17",
    "rainSource": "open-meteo",
    "qualityStatus": "provisional",
    "waterLevelM": null
  },
  "forecast": { "modelVersion": "0.1.0-test", "days": [] },
  "persistence": { "enabled": true, "stored": true, "error": null },
  "warnings": []
}
```

The seven `forecast.days` start the day after `observedState.asOfDate` — `asOfDate`
is the last day of the provider's own window, so nothing is dated from the CSV.
With no Convex deployment, `persistence.enabled` is `false`, `error` says the
outlook was not saved, and `warnings` repeats it; the forecast itself still runs.

If the weather provider cannot be reached you get **HTTP 502** with
`"observedState": null` — that is deliberate. There is no silent fallback to the
CSV; see "Troubleshooting" below if you want the labelled offline fixture.

---

## 3. What runs where

| Process            | Command                            | Address                 | Required?                |
| ------------------ | ---------------------------------- | ----------------------- | ------------------------ |
| Next.js website    | `npm run dev`                      | <http://localhost:3000> | yes                      |
| FastAPI ML service | `uvicorn app.main:app --port 8000` | <http://127.0.0.1:8000> | yes, for forecasts       |
| Convex dev sync    | `npm run convex:dev`               | cloud deployment        | optional, for saved runs |
| Weather provider   | —                                  | `api.open-meteo.com`    | outgoing HTTPS           |

The browser never calls Open-Meteo or the ML service directly. `POST /api/forecast`
in the Next server is the only orchestrator — a cloud-hosted Convex function
cannot reach your loopback interface, so no Convex action is asked to.

---

## 4. Quality commands

```bash
npm run typecheck     # web + convex
npm run lint          # eslint, zero warnings allowed
npm run format:check  # prettier
npm run build         # production build
npm run format        # rewrite files with prettier
```

`data:validate` / `data:import` push the CSV into a Convex deployment
(`node scripts/import_historical_dataset.mjs --validate-only` to check it first);
neither is needed to run the website locally.

---

## 5. Troubleshooting

| Symptom                                                                                                                    | Cause and fix                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/forecast` → **502** "Weather provider failed and the offline forecast fallback is disabled."                    | No HTTPS access to `api.open-meteo.com` (offline machine, proxy, or corporate DNS). Fix the network, or for a demo without network set `WEATHER_PROVIDER=fixture` **and** `WEATHER_ALLOW_FIXTURE=true` in `apps/web/.env.local`, restart `npm run dev`, and accept that the run shows as `degraded` / "illustrative, not a forecast". |
| **503** "The local ML service did not produce a forecast." with detail "ML service unreachable at http://127.0.0.1:8000 …" | The ML service is not running, or `ML_API_BASE_URL` points elsewhere. Start step 4; check `curl http://127.0.0.1:8000/health`.                                                                                                                                                                                                        |
| Forecast fails with **503** `model artifact not found at …; run 'python3 ml/train_test_model.py' first`                    | `ml/artifacts/model.json` is missing (it is committed, so check your checkout) or `ML_MODEL_PATH` points at the wrong file. Re-training is optional; `ml/README.md` explains it.                                                                                                                                                      |
| Dashboard panels are empty and mention Convex                                                                              | No deployment configured, or `npm run convex:dev` is not running / was never run. Optional — forecasts still run, they just aren't saved.                                                                                                                                                                                             |
| `Could not find public function for 'forecasts:…'`                                                                         | Deployment is behind `convex/`. Re-run `npm run convex:dev`; confirm `NEXT_PUBLIC_CONVEX_URL` matches that deployment.                                                                                                                                                                                                                |
| `Another next dev server is already running`                                                                               | One `next dev` per directory. Stop the other process, or start on another port with `npm run dev --workspace @riverguard/web -- -p 3100`.                                                                                                                                                                                             |
| `Invalid project directory provided, no such directory: …/3101`                                                            | You passed `-p` to the root `npm run dev`; npm swallows the flag and Next.js reads the number as a directory. Use `npm run dev --workspace @riverguard/web -- -p 3101`.                                                                                                                                                               |
| `EADDRINUSE` on port 3000 / 8000                                                                                           | Something else owns the port: `npm run dev --workspace @riverguard/web -- -p 3100`, or `uvicorn ... --port 8001` plus `ML_API_BASE_URL=http://127.0.0.1:8001`.                                                                                                                                                                        |
| `EBADENGINE` warnings from npm                                                                                             | Node is older than 20.9. Upgrade Node.                                                                                                                                                                                                                                                                                                |
| Python `ModuleNotFoundError: app`                                                                                          | Install the package (`pip install -e "services/ml[dev]"`) and start uvicorn from `services/ml`, or use the venv from step 4.                                                                                                                                                                                                          |
| Environment variables seem ignored                                                                                         | They must be in `apps/web/.env.local`. Restart `npm run dev` after editing — Next reads the file at startup.                                                                                                                                                                                                                          |

---

## 6. Stopping

`Ctrl-C` in each terminal. Nothing is left running and no state is kept outside
`apps/web/.env.local`, `convex/_generated/`, and the Convex deployment itself.
`npm run convex:dev` only pushes code; it does not create a background service.

---

## 7. Where to go next

- [`README.md`](README.md) §2 — architecture, scope, and execution policy.
- [`docs/guides/forecast-pipeline.md`](docs/guides/forecast-pipeline.md) — request flow, failure modes, provenance.
- [`docs/data-sources.md`](docs/data-sources.md) — training data vs run-time input, coverage, limits.
- [`docs/ml-methodology.md`](docs/ml-methodology.md) — features, validation, and the circularity warning that applies to any metric from this dataset.
- [`ml/README.md`](ml/README.md) — the test model and re-training.
- [`services/ml/README.md`](services/ml/README.md) — inference endpoints.

---

**Reminder:** RiverGuard is a research prototype. Its forecasts are illustrative,
not PAGASA advisories or evacuation instructions, and the site and ML service are
not to be deployed publicly.
