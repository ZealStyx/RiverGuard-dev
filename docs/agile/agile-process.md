# Agile Process — RiverGuard

## Overview

RiverGuard is developed using an Agile Scrum/Kanban hybrid model. This document describes the process, cadence, ceremonies, and team roles.

## Cadence

- **Sprint length:** 2 weeks (recommended starting point; adjust after 2–3 sprints based on velocity).
- **Ceremonies:** Sprint Planning, Daily Standup, Backlog Refinement, Sprint Review, Sprint Retrospective.

## Artifacts

| Artifact | Owner | Location | Description |
|----------|-------|----------|-------------|
| Product Backlog | Product Owner | `product-backlog.md` | Prioritized list of epics and user stories |
| Sprint Backlog | Development Team | sprint planning output | Stories committed for the current sprint |
| Increment | Development Team | Working software | Potentially shippable product at end of sprint |
| Burndown Chart | Scrum Master | `burndown-tracking.md` | Remaining work vs. time in sprint |

## Ceremonies

### Sprint Planning
- **Frequency:** Start of each sprint
- **Timebox:** 2–4 hours
- **Attendees:** Product Owner, Scrum Master, Development Team
- **Outputs:** Sprint goal, sprint backlog, capacity commitment

### Daily Standup
- **Frequency:** Every weekday
- **Timebox:** 15 minutes
- **Attendees:** Scrum Master, Development Team (PO optional)
- **Format:** What did I do yesterday? What will I do today? Any blockers?

### Backlog Refinement
- **Frequency:** Mid-sprint (once per sprint)
- **Timebox:** 1–2 hours
- **Attendees:** Product Owner, Scrum Master, Development Team
- **Outputs:** Refined, estimated stories ready for upcoming sprints

### Sprint Review
- **Frequency:** End of each sprint
- **Timebox:** 1–2 hours
- **Attendees:** PO, SM, Dev Team, stakeholders
- **Outputs:** Demo of completed work, stakeholder feedback, backlog updates

### Sprint Retrospective
- **Frequency:** End of each sprint
- **Timebox:** 45–90 minutes
- **Attendees:** PO, SM, Development Team
- **Outputs:** What went well, what didn't, actionable improvement items

## Roles and responsibilities

See [`roles-responsibilities.md`](roles-responsibilities.md).

## How phases map to sprints

The phased delivery plan in [`docs/plan/MASTER_PLAN_ROADMAP.md`](../plan/MASTER_PLAN_ROADMAP.md) defines six delivery phases. Each phase is decomposed into epics and user stories in [`product-backlog.md`](product-backlog.md). Sprints pull from the prioritized backlog, starting with Phase 1 (Data Acquisition & Exploration), which is on the critical path.

**Rule:** Do not start Phase N+1 development work until Phase N's exit criteria are met, even within an Agile cadence. The phased plan remains the governing roadmap; Agile is the execution mechanism within and across phases.

## Workflow states (Kanban)

See [`kanban-board.md`](kanban-board.md) for column definitions and WIP limits.

## Safety and compliance within Agile

- RiverGuard supports decision-making; it does not issue official evacuation orders or replace LGUs/government agencies.
- No experimental predictions are presented as operational public-safety warnings.
- Definition of Done includes safety review for any user-facing forecast or risk output.
- Static Project NOAH maps are not forecasts; return periods are not schedules; ML explainability is not causality.
