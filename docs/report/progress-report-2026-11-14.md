# RiverGuard — Progress Report

**Reporting period:** 30 October 2026 – 13 November 2026
**Report date:** 14 November 2026
**Repository:** `ZealStyx/RiverGuard-dev`
**Branch / commit:** `arena/432d3391-riverguard-dev` at `e06d3fa` (merge of PR #2)
**Baseline:** initial commit `3f63e80` (30 October 2026)
**Prepared by:** Engineering progress review, generated from repository history and a live build check

---

## 1. Executive summary

In 15 calendar days (5 active working days) the project moved from an empty repository to a
runnable, locally executing Next.js application with a documented scope, a design system, a
dashboard shell, and a Convex application schema. 21 commits from 4 contributors touched
116 tracked files, and the current tree builds cleanly.

What is genuinely working today: `npm install`, `npm run typecheck`, `npm run lint`
(`--max-warnings=0`) and `npm run build` all pass, producing two statically prerendered routes
(`/` and `/design-system`).

What is not yet working: the Python/FastAPI ML service is still an empty scaffold, no
observations have been ingested, the dashboard renders hard-coded illustrative sample data
rather than data from Convex, and no model has been trained. Phases 1–3 of the six-phase
roadmap are therefore **partially** complete; Phases 4–6 have not started.

---

## 2. Scope and constraints established

The most consequential work in this period was documentation, because it fixed what the system
is allowed to claim.

- **Study area:** National Capital Region (NCR). Coverage is limited to the four cities present
  in the supplied dataset — Quezon City, Marikina, Manila, and Pasig — at city/day granularity.
- **Execution model:** the Next.js app, the FastAPI service, preprocessing, training, and
  inference all run on the developer's computer. Convex is the only hosted application
  dependency; a weather forecast API is the only external runtime data integration.
- **Deployment policy:** no public hosting of the website or ML service, and no AWS or other
  managed infrastructure under the current scope.
- **Safety framing:** the prototype produces experimental decision support, never official
  warnings or evacuation guidance. Model output cannot be described as validated.

The scope was deliberately tightened on 6 November: an earlier AWS-oriented architecture
(including a US$130 credit constraint, Lambda/ECR hosting, and remotely hosted Project NOAH
PMTiles) was replaced by the local-only NCR prototype scope. This is reflected in the root
README, the architecture document, and `docs/plan/roadmap-phases.md`.

---

## 3. Work completed, in chronological order

### 30 October 2026 — Inception and documentation foundation (12 commits)

- `3f63e80` Initial commit and repository creation.
- Technical architecture document authored; a merge reconciled two parallel copies of it.
- `2c463a8` Scaffolded the intended monorepo layout: 64 placeholder files across
  `apps/web`, `convex`, `services/ml`, `data`, and `docs`. This created the directory contract
  the team has been filling in since.
- `8b3d613`, `8d807d0` README rewritten into the project's primary specification, including the
  audit of the supplied `Flood_Prediction_NCR_Philippines.csv`.
- `e46fe38` Proprietary "all rights reserved" LICENSE added.
- `45b2e3d` Drafted a minimal AWS architecture (later superseded).
- `bb84efa`, `04b7ee2`, `f678d65` Six-phase delivery roadmap with per-phase entry/exit criteria,
  plus a full Agile working folder (backlog, DoR/DoD, Kanban, sprint templates, roles).

### 6 November 2026 — Scope realignment (1 commit)

- `a039f56` Rewrote the README and architecture document for the local NCR prototype and removed
  the AWS/deployment assumptions: 1,183 deletions against 852 insertions across three documents.
  This is the commit that made the project's claims defensible.

### 11 November 2026 — Design and frontend foundation (3 commits)

- `0cee590` Added a 780-line UI/UX cheat sheet covering roles, authentication, onboarding,
  screens, forms, permissions, system states, and end-to-end flows.
- `ec01252` Frontend foundation: npm workspaces, Next.js 16 / React 19 / TypeScript 7 /
  Tailwind 4, ESLint and Prettier configuration, root scripts for dev, build, lint, typecheck,
  format, and Convex typecheck.
- `56650f2` Design system: 11 reusable UI primitives (Button, Panel, Toggle, SelectField,
  StatusLabel, Tooltip, Divider, IconButton, SectionHeading, and loading/empty/error states),
  design tokens in `globals.css`, and a live `/design-system` reference page.

### 12 November 2026 — Dashboard and backend foundation (3 commits)

- `0a7cf34` "Spatial Ledger" researcher dashboard: map workspace with an illustrative NCR
  background image and hazard-layer control, risk summary, rainfall chart, model-contribution
  panel, station details, responsive navigation, and an accompanying `design-qa.md` verification
  record.
- `9c110b2` Convex application foundation: a 10-table schema (users, LGU profiles, stations,
  sensor readings, model versions, forecast runs, forecasts, risk assessments, alerts, hazard
  layers) with indexes for real access patterns, shared validators, seven bounded query modules,
  and the client provider.
- Merge of PR #1 (`6ae9558`).

### 13 November 2026 — Visual identity and process closeout (2 commits)

- `44cfc06` Applied the approved blue–teal palette (`#284B63`, `#3C6E71`, `#353535`, `#D9D9D9`,
  `#FFFFFF`) across all components by replacing colour-specific tokens with semantic roles
  (brand-primary, brand-secondary, neutral, warning, danger). Contrast verified at 9.22:1, 5.74:1,
  and 12.27:1; `design-qa.md` records the pass.
- Merge of PR #2 (`e06d3fa`), the current head.

---

## 4. Current state of the repository

| Area | Current state |
|---|---|
| Tracked files | 116 (38 of them intentionally empty placeholders) |
| History | 21 commits, 4 contributors, 5 active working days |
| Documentation | 25 files, ~3,320 lines of Markdown |
| Web application | ~1,900 lines of TS/TSX/CSS under `apps/web/src` |
| Convex backend | ~390 lines, 10 tables, 7 query modules, validators |
| Python ML service | Scaffold only — every file is 0 bytes |
| Data | Two sample CSVs with headers and no rows |
| Tests | Three empty test files; no executable test suite |

### Verification performed for this report

| Check | Result |
|---|---|
| `npm ci` | Pass |
| `npm run typecheck` (web + Convex) | Pass, no errors |
| `npm run lint` (`--max-warnings=0`) | Pass, no warnings |
| `npm run build` | Pass — `/`, `/_not-found`, `/design-system` prerendered |

### Deliverables inventory

- **Product documentation:** root README (project specification and CSV audit), architecture
  document, six-phase roadmap plus master plan, data-sources and ML-methodology stubs,
  UI/UX cheat sheet, `design-qa.md`.
- **Process documentation:** 12-file Agile folder — process, roles, backlog mapped to phases,
  user-story template, DoR, DoD, Kanban, burndown, and sprint planning/review/retrospective
  templates.
- **Application:** design tokens, 11 UI primitives, `/design-system` reference page, and the
  dashboard composition (map workspace, risk summary, charts, model contributions, station
  details).
- **Backend contract:** Convex schema and query surface that the future ingestion and forecast
  pipeline is expected to write into.

---

## 5. Phase status against the six-phase roadmap

| Phase | Planned outcome | Status | Evidence |
|---|---|---|---|
| 1 — Data acquisition and feasibility | Verified, documented NCR dataset | Partial | CSV fully audited and its provenance limitations documented, but no verified observations, event records, station metadata, boundaries, or DEM acquired. The Go/No-Go decision (D1) is still open. |
| 2 — Local ML prototyping | Baselines trained and evaluated chronologically | Not started | `services/ml` is a 0-byte scaffold; no features, models, SHAP output, or metrics. |
| 3 — Application foundation | Next.js + Convex dashboard on real data | Partial | Dashboard and schema exist and build; no ingestion, no mutations, no data flow — the UI reads static sample data. |
| 4 — Weather API and ML integration | End-to-end forecast run | Not started | No route handlers, no provider adapter, no FastAPI endpoints. |
| 5 — GIS map and explainability UI | Real map layers and explanations | Not started | Map is an illustrative background image with sample markers; no MapLibre, no geographic assets. |
| 6 — Validation and research review | Verified local demo | Not started | No test suite, no failure-mode testing, no stakeholder review. |

---

## 6. Risks, gaps, and open issues

**High priority**

1. **The ML service does not exist yet.** Every file under `services/ml` is empty, so the
   project's central claim — explainable water-level and flood-risk forecasting — is currently
   unevidenced. This is the critical path.
2. **The dashboard shows invented values.** Rainfall, water level, risk labels, and model
   contributions are hard-coded in `apps/web/src/data/dashboard.ts`. They are labelled as
   illustrative sample data, which is correct, but the UI cannot yet demonstrate the real
   pipeline and any external reader may misread the charts.
3. **No data has entered the system.** The Convex schema has 10 tables and no mutation or action
   to populate a single one; `data/samples/*.csv` contain headers only.
4. **Provenance of the supplied dataset is unresolved.** The CSV has no data dictionary, source
   citation, station metadata, or methodology. Until its semantics are verified, no metric
   derived from it may be reported as real NCR prediction performance.

**Medium priority**

5. **Documentation drift.** The root README, architecture document, and `roadmap-phases.md` were
   realigned to the local-only scope, but `docs/plan/MASTER_PLAN_ROADMAP.md`, the six per-phase
   plan files, `docs/agile/product-backlog.md`, and the sprint templates still describe AWS
   Lambda/ECR hosting, Vercel deployment, and remotely hosted PMTiles. Readers can still be
   pointed at infrastructure the project has ruled out.
6. **Empty documentation stubs.** `docs/data-sources.md` and `docs/ml-methodology.md` are 0 bytes
   despite being referenced from the README's documentation index.
7. **No automated tests.** Three test files exist as placeholders; nothing verifies schema,
   query, or rendering behaviour, and the Definition of Done requires passing tests.
8. **Type-safety bypasses.** Four Convex queries use `as any` on index builders, so index
   mistakes will fail at deployment time rather than at compile time.

**Lower priority**

9. **No authentication or role enforcement** is wired to the existing `users` and `lguProfiles`
   tables, although the Agile backlog treats roles as a Phase 6 requirement.
10. **No failure-state surfaces in the running app.** Loading, empty, error, and unavailable
    components exist in the design system but are not yet driven by real service states.
11. **History note.** Merged pull requests #3–#13 (the static `prototype/` design variants and the
    3D flood prototype) are recorded on GitHub but are not ancestors of this branch's `main`,
    and no `prototype/` path exists in this lineage. The work in this report is strictly what the
    current branch contains.

---

## 7. Recommended next steps

1. **Close out Phase 1's open decision (D1).** Either obtain verified NCR observations and event
   records, or record an explicit, documented "proceed with the smoke-test dataset only"
   decision that constrains all downstream claims.
2. **Implement the FastAPI service** with `/health` and a versioned forecast contract, then stand
   up Phase 2 baselines against the audited CSV, reporting metrics as pipeline validation — not
   as real-world performance.
3. **Add the first Convex mutation and ingestion path**, import a small labelled sample, and
   switch the dashboard's charts from static data to live queries with freshness and quality
   indicators.
4. **Reconcile the stale planning documents** with the local-only scope so the roadmap, backlog,
   and sprint templates stop referencing removed infrastructure.
5. **Write `docs/data-sources.md` and `docs/ml-methodology.md`**, and add the first automated
   tests for the Convex schema and the web build.


---

## Notes on method

Findings are drawn from the commit history and file contents of this branch, plus a dependency install and a full typecheck, lint, and production build run on 14 November 2026. Line counts exclude merge commits, so no change is counted twice. The Google Docs version of this report is a formatted copy of this file.

---

## Appendix A — Commit history

| # | Commit | Date | Author | Summary |
|---:|---|---|---|---|
| 1 | `3f63e80` | 2026-10-30 | J. J. Comendador | Initial commit |
| 2 | `ecd96f6` | 2026-10-30 | J. J. Comendador | Add RiverGuard technical architecture doc |
| 3 | `9f47883` | 2026-10-30 | J. A. Alcazar | Create riverguard-architecture.md |
| 4 | `19afb00` | 2026-10-30 | J. A. Alcazar | Merge branch main (architecture reconciliation) |
| 5 | `2c463a8` | 2026-10-30 | J. A. Alcazar | Scaffold RiverGuard monitoring platform |
| 6 | `8b3d613` | 2026-10-30 | J. A. Alcazar | Update README.md |
| 7 | `e46fe38` | 2026-10-30 | J. A. Alcazar | Create LICENSE |
| 8 | `8d807d0` | 2026-10-30 | Zeal | Update README.md |
| 9 | `45b2e3d` | 2026-10-30 | J. A. Alcazar | Document RiverGuard minimal AWS architecture |
| 10 | `bb84efa` | 2026-10-30 | yun xiansheng | Revise development roadmap phases and tasks |
| 11 | `04b7ee2` | 2026-10-30 | J. A. Alcazar | Add phased RiverGuard delivery roadmap |
| 12 | `f678d65` | 2026-10-30 | J. A. Alcazar | Add Agile workflow documentation |
| 13 | `a039f56` | 2026-11-06 | J. A. Alcazar | Align docs with local NCR prototype scope |
| 14 | `0cee590` | 2026-11-11 | yun xiansheng | Add UI/UX design cheat sheet to documentation |
| 15 | `ec01252` | 2026-11-11 | yun xiansheng | chore(web): establish frontend foundation |
| 16 | `56650f2` | 2026-11-11 | yun xiansheng | feat(web): add RiverGuard design foundation |
| 17 | `0a7cf34` | 2026-11-12 | yun xiansheng | feat(web): build and refine Spatial Ledger dashboard |
| 18 | `9c110b2` | 2026-11-12 | yun xiansheng | feat(backend): add Convex application foundation |
| 19 | `6ae9558` | 2026-11-12 | yun xiansheng | Merge pull request #1 |
| 20 | `44cfc06` | 2026-11-13 | yun xiansheng | feat(web): apply RiverGuard blue-teal palette |
| 21 | `e06d3fa` | 2026-11-13 | yun xiansheng | Merge pull request #2 (current head) |

## Appendix B — Activity by date and contributor

| Date | Commits | Lines added | Lines removed |
|---|---:|---:|---:|
| 2026-10-30 | 12 | 3,946 | 1,054 |
| 2026-11-06 | 1 | 852 | 1,183 |
| 2026-11-11 | 3 | 8,869 | 19 |
| 2026-11-12 | 3 | 2,287 | 47 |
| 2026-11-13 | 2 | 289 | 124 |

(Merge commits are excluded; their contents are counted once through the merged commits.)

| Contributor | Commits |
|---|---:|
| John Alex Alcazar | 9 |
| yun xiansheng | 9 |
| Jay Justine Comendador | 2 |
| Zeal | 1 |

---

*This report describes repository state only. RiverGuard is a research prototype; nothing in it
constitutes a validated forecast, an official warning, or operational guidance.*
