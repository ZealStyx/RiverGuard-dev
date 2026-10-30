# Definition of Ready (DoR) — RiverGuard

A user story must meet all of the following before it can be pulled into a sprint during Sprint Planning.

## DoR checklist

- [ ] **Written:** Story follows [`user-story-template.md`](user-story-template.md) (As a / I want / so that).
- [ ] **Valuable:** Business or user value is clear; maps to a delivery phase in [`docs/plan/MASTER_PLAN_ROADMAP.md`](../plan/MASTER_PLAN_ROADMAP.md).
- [ ] **Independent:** Can be completed without waiting on another in-flight story (dependencies identified).
- [ ] **Estimable:** The Development Team can estimate size (story points / T-shirt size).
- [ ] **Small:** Fits within one sprint; if too large, it is split during refinement.
- [ ] **Testable:** Acceptance criteria are observable and verifiable.
- [ ] **Acceptance criteria defined:** Clear, testable pass/fail criteria listed.
- [ ] **Data-quality addressed:** For data/ML stories, missingness, units, timezones, and quality flags are addressed (no silent zero-filling).
- [ ] **Safety flagged:** Stories touching forecasts, risks, or alerts are marked "Safety review required" and have a stakeholder review path.
- [ ] **Documentation identified:** `docs/` files to create or update are listed.

## Who decides

- The **Product Owner** confirms value, priority, and acceptance criteria.
- The **Development Team** confirms estimability, size, and technical feasibility during backlog refinement.
- The **Scrum Master** confirms the checklist is complete before the story enters Sprint Planning.

## Phase-gate rule

Even if a story meets DoR, development work for Phase N+1 does not begin until Phase N's exit criteria / go-no-go decision is met (per [`MASTER_PLAN_ROADMAP.md`](../plan/MASTER_PLAN_ROADMAP.md)).

## Example: a story that is NOT ready

> "Build the ML forecasting service." — Too large, no acceptance criteria, no data source confirmed, no API contract, safety not addressed.

## Example: a story that IS ready

> "US-3.2 — Convex schema with station and reading indexes" — Clear tables, index defined, bounded queries, data preserved, docs identified, estimable (5 points).
