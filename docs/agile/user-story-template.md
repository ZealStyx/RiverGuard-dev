# User Story Template — RiverGuard

Use this template when writing product backlog items. The Product Owner owns story quality; the Development Team estimates during backlog refinement.

## Template

```markdown
# US-<id> — <short title>

**As a** <role>,
**I want** <goal/feature>,
**so that** <benefit/value>.

**Acceptance Criteria:**
- [ ] Given <context>, when <action>, then <outcome>
- [ ] ...
- [ ] (Include safety/data-quality checks where relevant)

**Phase:** <1–6 | Epic: E<x.x>>
**Priority:** Must / Should / Could / Won't (MoSCoW)
**Estimate:** <story points or T-shirt size>
**Dependencies:** <list any story IDs this depends on>
**Safety review required:** Yes / No
**Documentation updates required:** `docs/` files to touch
```

## Example

```markdown
# US-3.2 — Convex schema with station and reading indexes

**As a** developer,
**I want** a Convex schema with tables for stations and sensor readings,
**so that** the dashboard can query bounded time windows of observations.

**Acceptance Criteria:**
- [ ] Convex schema includes `monitoring_stations` and `sensor_readings` tables.
- [ ] Compound index on `sensor_readings` by `stationId` + `timestamp` exists.
- [ ] Queries are bounded by station and time range (no full-history loads).
- [ ] Units, source timestamp, ingestion timestamp, and quality flags are preserved.
- [ ] No silent zero-filling of missing values.

**Phase:** 3 | Epic: E3.1
**Priority:** Must
**Estimate:** 5
**Dependencies:** US-1.1 (data available)
**Safety review required:** No
**Documentation updates required:** `docs/architecture/riverguard-architecture.md` (Section 8), `docs/plan/phase-03-application-foundation.md`
```

## Writing guidelines

- **INVEST:** Independent, Negotiable, Valuable, Estimable, Small, Testable.
- Keep acceptance criteria testable and observable.
- For ML/data stories, include data-quality and missingness acceptance criteria (never silently replace missing measurements with zero).
- For forecast/risk/user-facing stories, mark "Safety review required: Yes" — these need stakeholder review before acceptance (see root README safety limitations).
- Update the relevant documentation under `docs/` when architecture or data contracts change.

## Story lifecycle

Backlog → Refined (meets DoR) → Sprint Backlog → In Progress → Done (meets DoD) → Accepted at Sprint Review

See [`definition-of-ready.md`](definition-of-ready.md) and [`definition-of-done.md`](definition-of-done.md).
