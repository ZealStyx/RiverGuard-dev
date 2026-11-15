# Phase 6 — Alerts & Operational Validation

**Project:** RiverGuard  
**Folder:** `docs/plan/phase-06-alerts-operational-validation.md`  
**Status:** Blocked on real observations (Model A/B No-Go)  
**Dependencies:** Phase 5 complete (map + explainability UI operational)

---

> **Dataset note (2026-11-15):** dataset v2 (`data/RiverGuard_NCR_Dataset_v2.xlsx`, 2016-01-01 → 2026-11-14,
> 15,884 rows) exists and is usable for schema and pipeline work. `WaterLevel_m`, `SoilMoisture_pct`,
> and `FloodOccurrence` are **derived from rainfall**, so anything built on them demonstrates plumbing,
> not validated hydrology — the UI must label them as such. See [`docs/data-sources.md`](../data-sources.md).

## Objective

Add alerting, test failure modes, and validate warning workflows with stakeholders before any operational use.

---

## Entry criteria

- Phase 5 exit criteria met.
- Map and explainability UI operational.

---

## Key tasks

| #   | Task                                                 | Details                                                                                                                                           |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | Implement configurable alert rules + alert history   | Convex: alert rules, alert history, acknowledgement workflow. User roles: residents, LGU personnel, system administrators.                        |
| T2  | Test service failures + missing/invalid observations | Simulate ML endpoint downtime, missing/stale/invalid readings, deployment rollback. Confirm no silent zero-filling; confirm graceful degradation. |
| T3  | Benchmark inference performance                      | Cold-start time, warm execution time, memory consumption, prediction latency using representative station payloads.                               |
| T4  | Validate warning workflows with stakeholders         | Review thresholds, escalation rules, and public messaging with LGU / disaster-risk stakeholders or academic advisers.                             |
| T5  | Record phase retrospective                           | Document lessons learned in `docs/report/`.                                                                                                       |

---

## Exit criteria

- Alert rules + acknowledgement workflow function end-to-end.
- Failure and missing-data handling behave as specified.
- Stakeholder validation documented.
- **No experimental predictions presented as operational public-safety warnings.**

---

## Risks

- Presenting model output as an official warning; RiverGuard is decision support only, not an evacuation-order authority.
- Undetected silent failures in missing-data handling; test explicitly.
- Latency too high for time-sensitive use; benchmark before operational claims.

---

## Deliverables

| Deliverable                            | Location                         |
| -------------------------------------- | -------------------------------- |
| Alert rules + acknowledgement workflow | `convex/`                        |
| User roles (resident / LGU / admin)    | `convex/` + `apps/web/`          |
| Failure-mode test results              | `docs/report/` or `docs/issues/` |
| Inference latency benchmark            | `docs/report/`                   |
| Stakeholder validation record          | `docs/report/` or `docs/issues/` |
| Phase 6 retrospective                  | `docs/report/`                   |

---

## Related

- Root README: [Alerts and Administration](../README.md#alerts-and-administration), [Safety, Reliability, and Limitations](../README.md#safety-reliability-and-limitations), [Development Roadmap — Phase 6](../README.md#phase-6--alerts-and-operational-validation)
- `docs/plan/MASTER_PLAN_ROADMAP.md`
- `docs/architecture/riverguard-architecture.md` (Section 10)
