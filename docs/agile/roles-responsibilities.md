# Agile Roles and Responsibilities — RiverGuard

## Product Owner (PO)

**Accountable for:** Maximizing the value of the product and the work of the Development Team.

### Responsibilities
- Owns and prioritizes the [`product-backlog.md`](product-backlog.md).
- Defines and communicates the product goal and sprint goal.
- Writes and refines user stories with clear acceptance criteria.
- Represents stakeholders, LGUs, disaster-risk offices, and end users.
- Makes trade-off decisions on scope, schedule, and resources.
- Accepts or rejects completed stories at the Sprint Review based on acceptance criteria.
- Ensures safety-critical stories (forecasts, alerts, thresholds) are reviewed with appropriate stakeholders before acceptance.

### Authority
- Final say on backlog ordering and acceptance of work.
- Cannot assign tasks directly to the Development Team; the team self-organizes.

## Scrum Master (SM)

**Accountable for:** Ensuring the team understands and enacts Agile/Scrum practices; removing impediments.

### Responsibilities
- Facilitates all Scrum ceremonies (keeps them timeboxed and effective).
- Removes blockers and impediments raised by the Development Team.
- Coaches the team on Agile principles, Definition of Ready, and Definition of Done.
- Protects the team from scope creep and interruptions during the sprint.
- Tracks and maintains the sprint burndown (see [`burndown-tracking.md`](burndown-tracking.md)).
- Facilitates retrospectives and drives improvement action items to closure.

### Authority
- No authority over backlog content or priority (that is the PO's role).
- No authority over how the team turns backlog items into increments (that is the Development Team's role).

## Development Team

**Accountable for:** Delivering a potentially shippable increment at the end of each sprint.

### Responsibilities
- Self-organizes to turn Product Backlog items into working increments.
- Pulls items from the top of the refined backlog during Sprint Planning.
- Estimates stories and commits to a realistic sprint backlog.
- Writes code, tests, documentation, and updates `docs/` as needed.
- Ensures every completed story meets the [`Definition of Done`](definition-of-done.md).
- Surfaces blockers immediately in Daily Standups.

### Composition (suggested)
- Frontend developer (Next.js, TypeScript, Tailwind, MapLibre)
- Backend/Convex developer (schema, queries, mutations, actions)
- ML engineer (Python, FastAPI, XGBoost, Scikit-learn, SHAP)
- DevOps / infrastructure (AWS Lambda, ECR, Convex, Vercel)
- QA / test engineer (test plans, validation, stakeholder demos)

> RiverGuard is proprietary software. Contributions are accepted only from people authorized by the project owner or organization (see root README [Contributing](../../README.md#contributing)).

## Stakeholders

- Local government units (LGUs), disaster-risk reduction offices, and communities.
- Hydrological / disaster-risk subject matter experts (for threshold review).
- Academic advisers (for model validation).
- Project owner (authorization and funding).

Stakeholders attend Sprint Reviews and provide feedback but do not direct the Development Team during a sprint.

## Decision escalation

| Decision type | Decider | Escalation path |
|---------------|---------|-----------------|
| Backlog priority | Product Owner | Project owner |
| Sprint scope / commitment | Development Team + PO | Scrum Master (facilitate) |
| Technical approach | Development Team | Scrum Master / architecture doc |
| Safety / public-warning content | Product Owner + stakeholders | Project owner / legal |
| Budget / credit use (AWS $130) | Project owner | N/A |
