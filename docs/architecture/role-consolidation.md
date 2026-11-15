# Current Role Model and Research Workspace

**Status:** Accepted for the local prototype (November 2026)

## Decision

RiverGuard does not use a separate Researcher product role in the current prototype. The active user-facing roles are:

- **Resident** — views the simplified resident experience and official-source links.
- **LGU operator** — reviews assigned-area outlooks and records controlled assessments.
- **Administrator** — manages governance and uses the research tools.

This is an intentional small-team decision. It avoids creating a Researcher account when there is no dedicated research operator, while keeping the research workflows available to the administrator responsible for data and model review.

## Administrator workspace

The Administrator shell has six task-level areas:

1. Overview
2. Research
3. Forecasts
4. Users & access
5. Configuration
6. Audit

Research workflows use the `/admin/research/*` route family. Configuration domains remain canonical under `/admin/locations`, `/admin/data-sources`, and `/admin/models`, with research/detail tabs where appropriate.

## Capabilities

The application keeps internal capabilities even though they currently belong to one role:

- `research.read`
- `research.runForecast`
- `research.reviewModels`
- `governance.manageUsers`
- `governance.configureSystem`
- `governance.viewAudit`

The frontend uses these capabilities to decide which Admin navigation items are visible. Once authentication and Convex authorization are connected, the same checks must be enforced in backend queries and mutations; hidden navigation is not authorization.

## Authentication and onboarding

- Resident signup remains available.
- LGU operator access uses an access request and administrator approval.
- Administrator access is invitation-only and requires MFA in the prototype flow.
- Researcher is not offered in signup, access requests, pending approval copy, demo login, or onboarding.
- Research orientation is included in Administrator onboarding.

## Route compatibility

Existing Researcher URLs are compatibility aliases, not a separate role workspace:

- `/researcher/*` → `/admin/research/*`
- `/researcher/data-sources/*` → `/admin/data-sources/*?view=research`
- `/researcher/models/*` → `/admin/models/*?view=research`
- `/researcher/locations/*` → `/admin/locations/*?view=research`

New internal links must use the Administrator route families directly.

## Backend role contract

The current Convex validator uses:

```text
resident | lgu | admin
```

The frontend and Convex role names must stay aligned. There is no deployed user migration in this prototype, so the role validator can be edited directly rather than maintaining a legacy Researcher migration path.

## Source-of-truth files

- `apps/web/src/data/prototype.ts` — roles, capabilities, and navigation.
- `apps/web/src/components/prototype/AppShell.tsx` — Admin shell and capability-aware navigation.
- `apps/web/src/components/prototype/PrototypeRouter.tsx` — route selection and compatibility handling.
- `apps/web/src/components/prototype/PublicScreens.tsx` — auth, signup, access request, and onboarding flows.
- `apps/web/src/components/prototype/ResearcherScreens.tsx` — existing research workflow implementation mounted under Admin.
- `apps/web/src/components/prototype/RoleScreens.tsx` — Admin routes and configuration/research tabs.
- `convex/validators.ts` — backend role validator.
- `docs/designs/frontend-route-inventory.md` — current route inventory.
