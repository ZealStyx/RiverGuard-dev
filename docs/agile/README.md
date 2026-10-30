# Agile Development — RiverGuard

This folder contains Agile development documentation and templates for the RiverGuard project.

RiverGuard follows an Agile (Scrum/Kanban hybrid) delivery model. Work is organized into time-boxed sprints with a prioritized product backlog, regular ceremonies, and continuous improvement through retrospectives.

## Folder organization

| File | Purpose |
|------|---------|
| [`agile-process.md`](agile-process.md) | Overall Agile process, cadence, ceremonies, and team roles |
| [`sprint-planning-template.md`](sprint-planning-template.md) | Template for sprint planning sessions |
| [`product-backlog.md`](product-backlog.md) | Prioritized product backlog of user stories and epics |
| [`user-story-template.md`](user-story-template.md) | Template for writing user stories with acceptance criteria |
| [`definition-of-ready.md`](definition-of-ready.md) | Definition of Ready (DoR) — when a story can enter a sprint |
| [`definition-of-done.md`](definition-of-done.md) | Definition of Done (DoD) — when a story is complete |
| [`sprint-review-template.md`](sprint-review-template.md) | Template for sprint review / demo sessions |
| [`sprint-retrospective-template.md`](sprint-retrospective-template.md) | Template for sprint retrospectives |
| [`kanban-board.md`](kanban-board.md) | Kanban board columns, WIP limits, and workflow states |
| [`burndown-tracking.md`](burndown-tracking.md) | Sprint burndown tracking and velocity |
| [`roles-responsibilities.md`](roles-responsibilities.md) | Agile roles: Product Owner, Scrum Master, Development Team |

## Agile cadence (suggested)

| Ceremony | Frequency | Timebox | Attendees | Purpose |
|----------|-----------|---------|-----------|---------|
| Sprint Planning | Start of each sprint | 2–4 hours | PO, SM, Dev Team | Select backlog items, define sprint goal |
| Daily Standup | Every weekday | 15 minutes | SM, Dev Team | Synchronize, surface blockers |
| Backlog Refinement | Mid-sprint | 1–2 hours | PO, SM, Dev Team | Clarify and estimate upcoming stories |
| Sprint Review | End of each sprint | 1–2 hours | PO, SM, Dev Team, stakeholders | Demo completed work, gather feedback |
| Sprint Retrospective | End of each sprint | 45–90 min | PO, SM, Dev Team | Improve process, identify action items |

## Sprint length

Suggested sprint length: **2 weeks**. Adjust based on team velocity and project needs after the first 2–3 sprints.

## Guiding principles

- Deliver working software in small, testable increments.
- Prioritize the highest-value backlog items first (data acquisition and ML baseline before UI polish).
- Keep WIP (Work in Progress) low to maintain flow.
- Empirical process: inspect and adapt through reviews and retrospectives.
- No experimental predictions are presented as operational public-safety warnings (see root README safety section).

## Related docs

- [`docs/plan/MASTER_PLAN_ROADMAP.md`](../plan/MASTER_PLAN_ROADMAP.md) — phased delivery plan (the epics behind this backlog)
- Root [`README.md`](../../README.md) — project overview, objectives, and safety limitations
- [`docs/architecture/riverguard-architecture.md`](../architecture/riverguard-architecture.md) — technical architecture decisions
