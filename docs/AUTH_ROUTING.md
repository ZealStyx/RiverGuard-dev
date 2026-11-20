# RiverGuard Authentication and Routing

## 1. Identity and application access

RiverGuard uses two connected systems:

1. Firebase Authentication verifies the person through Google or email/password.
2. Convex stores RiverGuard access data: `externalId`, email, role, status, and `roleProfile`.

Firebase login alone does not grant access to a RiverGuard workspace. Convex must find the
matching Firebase identity and confirm that the account is active and has the requested role.

## 2. Public routes

- `/welcome` — public landing page.
- `/about`, `/methodology`, `/official-sources` — public information pages.
- `/auth/login` — Google or email/password login.
- `/auth/signup` — choose Resident, LGU operator, or Researcher and submit the required profile details.
- `/auth/verify` — email-verification flow for email signup.
- `/auth/pending` — approval status for LGU and Researcher requests.

## 3. Complete application route map

The Next route catch-all is handled by `PrototypeRouter`, which interprets the first URL segment
as a section and the remaining segments as that section's screen or detail route.

### Resident workspace

- `/resident` — resident overview
- `/resident/locations` — saved and supported locations
- `/resident/outlook` — resident forecast/outlook
- `/resident/hazard-context` — hazard context
- `/resident/preferences` — notification and display preferences

### LGU workspace

- `/lgu` — LGU overview
- `/lgu/map` — map-focused outlook
- `/lgu/locations` — locations
- `/lgu/outlook` — operational outlook
- `/lgu/reviews` — review queue
- `/lgu/reviews/:id` — review detail
- `/lgu/alerts` — alerts
- `/lgu/alerts/new` — alert draft
- `/lgu/alerts/approval` — alert approval

### Researcher workspace

- `/researcher` — primary forecast workspace
- `/researcher/map` — map workspace
- `/researcher/locations` — location details
- `/researcher/history` — historical data
- `/researcher/forecast/new` — select location, three- or seven-day horizon, and explanation option
- `/researcher/forecast/review` — verify the exact request before a provider or model call
- `/researcher/forecast/progress` — execute weather → ML → storage and inspect the result
- `/researcher/runs` — shared history of stored forecast runs
- `/researcher/runs/:runId` — run detail
- `/researcher/compare` — compare runs
- `/researcher/data-sources` — data-source catalog
- `/researcher/data-sources/:id` — data-source detail
- `/researcher/models` — read-only model and data documentation
- `/researcher/models/:id` — read-only model evidence and limitations

### Administrator workspace

- `/admin` — system overview
- `/admin/research/*` — legacy boundary page; researcher execution is not mounted in the admin workspace
- `/admin/requests` — access requests
- `/admin/requests/:id` — request detail
- `/admin/users` — users and roles
- `/admin/locations` — location configuration
- `/admin/data-sources` — data-source configuration
- `/admin/provider` — provider configuration
- `/admin/models` — model configuration
- `/admin/hazard-layers` — hazard-layer configuration
- `/admin/audit` — audit log
- `/admin/settings` — administrator settings

Administrators manage access, configuration, and audit evidence. They do not run the researcher
workflow through an administrator route. An approved researcher account uses `/researcher`.

### Shared routes

- `/onboarding/:role` — role-specific onboarding
- `/settings/:screen` — shared settings, currently admin-gated

Unknown role screens fall back to the relevant workspace home. Unknown top-level sections fall back
to the public welcome screen.

## 4. Signup flow

Residents submit their name, email, and city. Their Convex account is created as `active`.

LGU operators submit their agency, position, requested area, and operational purpose. Researchers
submit their researcher type, organization/school, requested area, and research purpose. These roles
are created with `status: pending` and must be approved by an administrator.

Administrators are not publicly selectable during signup. They should be pre-provisioned by an
administrator or through a controlled Convex setup process.

## 5. Login and workspace routing

After successful Firebase login, `users.ensureCurrent` creates or updates the Convex profile.
The user is routed according to the Convex role:

| Role | Workspace | Access condition |
|---|---|---|
| Resident | `/resident` | `status: active` (set at signup) |
| LGU operator | `/lgu` | `status: active` (created `pending`; an administrator approves it) |
| Researcher | `/researcher` | `status: active` (created `pending`; an administrator approves it) |
| Admin | `/admin` | `status: active` (provisioned by an administrator — signup cannot request it) |

`WorkspaceGate` checks Firebase authentication, Convex authentication, the current Convex user,
the role, and the status. Unauthenticated users return to `/auth/login`; inactive users see an
access-denied message; users opening another role's URL are redirected to their own workspace.

## 6. Admin verification

The intended flow is:

```text
Firebase login → match Convex externalId → check role/status → allow or deny workspace
```

The current signup form stores role-profile information in Convex. The admin review screen still
needs to read those profiles and provide approve/reject actions. Do not allow a public client to
assign itself the `admin` role.

## 7. Resetting test accounts

Firebase accounts and Convex profiles are separate. To fully reset a test account, remove it from
Firebase Authentication and remove the matching Convex `users` row. Deleting only the Convex row
does not prevent the Firebase identity from signing in again.

