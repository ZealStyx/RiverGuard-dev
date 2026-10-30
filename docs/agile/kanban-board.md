# Kanban Board — RiverGuard

This document defines the Kanban board columns, workflow states, and WIP (Work in Progress) limits used alongside the Scrum cadence.

## Board columns

| Column | Definition | WIP limit | Entry criteria | Exit criteria |
|--------|------------|-----------|----------------|---------------|
| Backlog | Refined stories ready to be pulled | None | Meets DoR ([`definition-of-ready.md`](definition-of-ready.md)) | Pulled into sprint or "To Do" |
| To Do | Committed for current sprint, not started | None | In sprint backlog | Developer starts work |
| In Progress | Actively being worked on | 2 per developer (suggested) | Developer assigned | PR opened for review |
| Code Review | PR open, awaiting review/approval | 3 total | PR opened, tests passing | Approved + merged |
| QA / Testing | Under test (manual + automated) | 3 total | Merged to integration branch | Passes QA |
| Done | Meets DoD ([`definition-of-done.md`](definition-of-done.md)), accepted | None | QA pass + PO acceptance | Demoed at Sprint Review |
| Blocked | Cannot proceed (impediment) | None | Blocker raised in standup | Blocker resolved |

## Workflow rules

1. **Pull, don't push:** Developers pull the highest-priority item from "To Do" (or Backlog if sprint capacity allows) when they have capacity.
2. **WIP limits respected:** Do not start new work if a column is at its WIP limit; swarm to unblock instead.
3. **Blockers visible:** Move item to "Blocked" immediately; raise in Daily Standup; Scrum Master works to unblock.
4. **Definition of Done applies:** An item only reaches "Done" when it meets [`definition-of-done.md`](definition-of-done.md).
5. **No skipping columns:** Work flows left to right; an item cannot jump from "In Progress" to "Done" without Review + QA.

## Suggested tooling

- GitHub Projects (Kanban board) linked to issues/PRs.
- Alternatively: Trello, Jira, or a physical board for co-located teams.

## Mapping columns to git

| Board column | Git / GitHub state |
|--------------|--------------------|
| Backlog | Open issue, not in a sprint milestone |
| To Do | Issue in current sprint milestone, no branch yet |
| In Progress | Feature branch open, work in progress |
| Code Review | Pull request open, review requested |
| QA / Testing | PR merged to integration branch, under test |
| Done | PR merged to main, demoed at Sprint Review |
| Blocked | Issue labeled `blocked`, comment with blocker detail |

## Labels (suggested)

`phase-1` … `phase-6`, `frontend`, `backend`, `ml`, `data`, `infrastructure`, `safety`, `documentation`, `bug`, `blocked`, `ready`, `doing`, `review`, `done`
