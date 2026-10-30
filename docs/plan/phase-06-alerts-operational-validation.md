# Phase 6 — Alerts & Operational Validation

**Project:** RiverGuard  
**Folder:** `docs/plan/phase-06-alerts-operational-validation.md`  
**Status:** Planned  
**Dependencies:** Phase 5 complete (map + explainability UI operational)

---

## Objective

Add alerting, test failure modes, and validate warning workflows with stakeholders before any operational use.

---

## Entry criteria

- Phase 5 exit criteria met.
- Map and explainability UI operational.

---

## Key tasks

| # | Task | Details |
|---|------|---------|
| T1 | Implement configurable alert rules + alert history | Convex: alert rules, alert history, acknowledgement workflow. User roles: public users, LGU personnel, system administrators. |
| T2 | Test service failures + missing/invalid observations | Simulate ML endpoint downtime, missing/stale/invalid readings, deployment rollback. Confirm no silent zero-filling; confirm graceful degradation. |
| T3 | Benchmark inference performance | Cold-start time, warm execution time, memory consumption, prediction latency using representative station payloads. |
| T4 | Validate warning workflows with stakeholders | Review thresholds, escalation rules, and public messaging with LGU / disaster-risk stakeholders or academic advisers. |
| T5 | Record phase retrospective | Document lessons learned in `docs/report/`. |

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

| Deliverable | Location |
|-------------|----------|
| Alert rules + acknowledgement workflow | `convex/` |
| User roles (public / LGU / admin) | `convex/` + `apps/web/` |
| Failure-mode test results | `docs/report/` or `docs/issues/` |
| Inference latency benchmark | `docs/report/` |
| Stakeholder validation record | `docs/report/` or `docs/issues/` |
| Phase 6 retrospective | `docs/report/` |

---

## Related

- Root README: [Alerts and Administration](../README.md#alerts-and-administration), [Safety, Reliability, and Limitations](../README.md#safety-reliability-and-limitations), [Development Roadmap — Phase 6](../README.md#phase-6--alerts-and-operational-validation)
- `docs/plan/MASTER_PLAN_ROADMAP.md`
- `docs/architecture/riverguard-architecture.md` (Section 10)
