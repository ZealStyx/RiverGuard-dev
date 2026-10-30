# Definition of Done (DoD) — RiverGuard

A user story is considered **Done** only when every applicable item below is satisfied. The Development Team confirms DoD before marking a story complete; the Product Owner accepts it at the Sprint Review.

## Universal DoD (all stories)

- [ ] Code implemented and committed to the branch.
- [ ] Code reviewed (peer review) and approved.
- [ ] Automated tests added/updated and passing (unit + integration where applicable).
- [ ] Manual QA performed on the feature.
- [ ] No console errors, lint errors, or type errors introduced.
- [ ] Documentation updated under `docs/` as identified in the story (architecture, data contracts, API, methodology).
- [ ] Story linked to its PR and the PR is merged to the integration branch.
- [ ] Definition of Ready items that were open are now closed.

## Story-type specific DoD

### Frontend stories (Next.js)
- [ ] Responsive on target breakpoints; Tailwind/shadcn/ui used consistently.
- [ ] Accessibility basics checked (keyboard navigation, ARIA where applicable).
- [ ] MapLibre layers/controls render without CORS or console errors.
- [ ] Charts (Recharts) display correct data with units and labels.

### Convex / backend stories
- [ ] Schema updated and deployed to Convex dev deployment.
- [ ] Indexes defined for actual access patterns (e.g., `stationId` + `timestamp`).
- [ ] Queries bounded and paginated (no unbounded full-history reads).
- [ ] Environment variables documented (no secrets committed).

### ML / Python service stories
- [ ] Model trains locally and is reproducible (seeded, versioned).
- [ ] Evaluation metrics documented in `docs/report/` (MAE/RMSE, precision/recall/F1, calibration).
- [ ] FastAPI endpoint returns structured JSON matching the versioned contract.
- [ ] `/health` endpoint responds.
- [ ] SHAP explanations generated where applicable.
- [ ] Model artifact not committed if large; storage strategy documented.

### Data stories
- [ ] Data provenance, license, units, timezone, and update frequency documented in `docs/reference/` or `docs/data-sources.md`.
- [ ] Missing values preserved as distinguishable state (no silent zero-filling).
- [ ] Ingestion pipeline documented; sample data not committed to Git.

### Safety-critical stories (forecasts, risks, alerts)
- [ ] Stakeholder review completed (LGU / hydrological adviser as applicable).
- [ ] Output labeled with model version, forecast horizon, input-data window, and data freshness.
- [ ] Causality disclaimer present (explainability ≠ causation).
- [ ] No operational public-safety warning claims (RiverGuard is decision support only).

## Who decides

- The **Development Team** confirms all applicable DoD items are met.
- The **Product Owner** accepts or rejects the story at the Sprint Review against acceptance criteria and DoD.
- The **Scrum Master** ensures DoD is consistently applied.

## Done ≠ Done-Done

A story may meet DoD within a sprint but still depend on Phase-gate exit criteria (e.g., Phase 1 Go/No-Go) before downstream work begins. See [`MASTER_PLAN_ROADMAP.md`](../plan/MASTER_PLAN_ROADMAP.md).
