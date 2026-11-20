# Role Model — Proposal, and What Actually Ships

**Status:** the proposal below was **not implemented**. It is kept as a record of the decision that
was considered, and superseded by the shipped behaviour described in the next section.

The audit of this repository found the documentation claiming a three-role model while the code,
the Convex validators, the signup screen, and the router all still carried a fourth role. That
contradiction is now resolved in favour of the code, because the code is what users experience.

## What actually ships

Four roles, defined in `convex/validators.ts` and mirrored by `apps/web/src/data/prototype.ts`:

```text
resident | lgu | researcher | admin
```

| Role | Workspace | How the account is created |
|---|---|---|
| Resident | `/resident` | Signup, stored `active` |
| LGU operator | `/lgu` | Access request, stored `pending` until an administrator approves |
| Researcher | `/researcher` | Access request, stored `pending` until an administrator approves |
| Administrator | `/admin` | Provisioned by an existing administrator; signup cannot request it |

`users.register` treats the requested role as a request, not a grant: only `resident` is
`active` immediately, `lgu` and `researcher` are stored `pending`, and a requested `admin` throws.
`WorkspaceGate` reads the stored role and status, and refuses when either cannot be verified.

`/researcher/*` is a mounted workspace with its own screens (`ResearcherScreens.tsx`), not a
redirect to `/admin/research/*`.

## The proposal that was not implemented

For the record, the earlier plan was to collapse the research workflows into the Administrator
workspace: three roles (Resident, LGU operator, Administrator), research tools under
`/admin/research/*`, `resident | lgu | admin` in the validator, and `/researcher/*` kept only as
compatibility aliases.

None of that shipped. The validator still accepts `researcher`, signup still offers it, and the
`/researcher` route still renders the research workspace. Anyone reading the git history will find
this file claiming otherwise; that is why the claim is being retired rather than deleted.

If the consolidation is ever wanted, it is a product change of its own: remove the role from the
validator, the signup screen, the router, and the onboarding copy in one change, migrate the
existing `researcher` rows, and update this file and `docs/AUTH_ROUTING.md` in the same commit.

## Capabilities

The capability names are still used to decide what the administrator navigation shows:

- `research.read`
- `research.runForecast`
- `research.reviewModels`
- `governance.manageUsers`
- `governance.configureSystem`
- `governance.viewAudit`

Hidden navigation is not authorisation. The backend checks that matter live in `convex/auth.ts`
(`requireCurrentUser`, `requireRole`), in the mutations that guard writes, and in
`apps/web/src/lib/api-auth.ts` for the API routes.

## Source-of-truth files

- `convex/validators.ts` — the role enum.
- `convex/users.ts` — account creation and the "request, not grant" rule.
- `apps/web/src/data/prototype.ts` — roles and navigation.
- `apps/web/src/components/prototype/PrototypeRouter.tsx` — which section mounts which workspace.
- `apps/web/src/components/auth/WorkspaceGate.tsx` — the access check, fail-closed.
- `docs/AUTH_ROUTING.md` — routes, statuses, and the signup contract.
