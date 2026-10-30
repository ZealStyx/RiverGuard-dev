# Sprint Burndown Tracking — RiverGuard

Track remaining work during the sprint to visualize progress toward the sprint goal and forecast completion.

## Burndown chart (template)

Maintain a simple table updated daily (or from GitHub issue/PR state):

| Day | Date | Planned remaining (points) | Actual remaining (points) | Notes |
|-----|------|----------------------------|---------------------------|-------|
| 0 | Sprint start | | | Sprint planning committed total |
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |
| 9 | | | | |
| 10 | Sprint end | | | Should be 0 |

## How to update

1. At Sprint Planning, record total committed story points as Day 0 planned remaining.
2. Each day, the Scrum Master sums the points of stories **not yet accepted as Done** → actual remaining.
3. Plot planned vs. actual (a line chart in a spreadsheet or GitHub project insight).
4. If actual is above planned for 2+ days, raise as a risk in Daily Standup; consider descoping.

## Velocity tracking

| Sprint # | Points committed | Points completed | Velocity | Notes |
|----------|------------------|------------------|----------|-------|
| 1 | | | | First sprint; establish baseline |
| 2 | | | | |
| 3 | | | | |
| **Average (last 3)** | | | | Use for future planning |

Use the 3-sprint average velocity to forecast how much the team can commit in upcoming sprints.

## Warning signs

- Burndown flat for 2+ days → work blocked or not being updated; raise in standup.
- Scope creep mid-sprint → new items added without removing others; PO must approve trade-off.
- Stories consistently carried over → over-committing or stories too large; refine smaller.

## Tools

- GitHub Projects burnup/burndown insights (if using GitHub Issues).
- Spreadsheet (manual) for early sprints.
- Jira/Linear burndown reports if adopted later.

## Related

- [`sprint-planning-template.md`](sprint-planning-template.md)
- [`kanban-board.md`](kanban-board.md)
- [`definition-of-done.md`](definition-of-done.md)
