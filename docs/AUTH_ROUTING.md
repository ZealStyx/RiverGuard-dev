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

### Account and shared routes

- `/{role}/settings` — profile, security, and links to workspace access.
- `/auth/request-access` — approved workspace links, additional role or LGU reassignment requests, decision history, and invitations.
- `/auth/invitation` — verified recipient’s invitation inbox.
- `/auth/mfa` — enroll an authenticator app; Firebase challenges enrolled accounts at sign-in.

There is no onboarding route or completion flag. Name, city, organization, and role-specific application details belong in registration/profile or a role request. Optional display preferences are not authorization inputs. Unknown top-level sections return 404.

## Registration, login and approval

Login (Google or password) queries `users.getCurrent` with the newly authenticated person's Firebase token. A missing record opens registration with that credential; a failed lookup never creates a record or selects a fallback workspace. Only explicit registration calls `users.register`. Retrying registration cannot overwrite a stored role, profile, or status. Firebase email/password verification uses the emailed Firebase link, not a local code. A verified email and active Convex account are both required for workspace operations.

Resident registration is active immediately. Researcher and LGU registration creates a pending account **and** a pending request in one transaction. Approval in `/admin/requests` activates an initial account; rejection denies access. An active member’s additional request never disables their existing roles. Approval adds a grant, rejection leaves prior access unchanged. An LGU reviewer assignment must be a supported city; applicant-editable profile data never establishes operational scope. Approvals and invitation acceptance record actor, target, role, time, and assignment in the audit log.

`/admin/users` sends invitations to a normalized email address. The verified recipient can accept once within seven days, as an active member or for their matching pending signup role. For a new account, register first and open the inbox in workspace access or pending status. Invitations are delivered **in-app** by default. For email notifications set `RESEND_API_KEY`, `RIVERGUARD_INVITE_FROM` (a verified sender), and `RIVERGUARD_APP_URL` (the trusted app origin) **on Convex**, never in public frontend variables. Administrators see inbox-only, queued, sent (provider accepted), or failed delivery. The notification link itself grants nothing.

## Rollout and checks

1. Enable Google and email/password sign-in in Firebase; authorize the app domain for popup sign-in and verification links. TOTP enrollment requires Firebase Authentication with Identity Platform and the TOTP provider enabled. Test enrollment and a subsequent sign-in in your own staging tenant.
2. Configure matching Firebase project IDs in the web app and Convex, and the web app’s `NEXT_PUBLIC_CONVEX_URL`. Deploy the schema and functions together with the updated client. A disconnected/missing database denies workspace access, including Admin; there is no development user bypass. Trusted server-to-server API credentials are separate.
3. Bootstrap the first verified administrator through a trusted deployment operator. Inspect old records without `status` and explicitly approve only known authorized accounts: missing status is **not** active. Do not auto-promote or identify privileged users by email. Existing resident accounts created by the old Google login cannot be distinguished reliably; keep them and use the reviewed access-change workflow.
4. Backfill pre-existing pending LGU/Researcher accounts: run `npx convex run applications:migratePending '{}'` against the intended deployment. If it returns a cursor, run again with `'{"cursor":"<returned value>"}'` until it returns `null`. The backfill is idempotent; it does not grant access or change account status.
5. Run `npm run test:auth` (Node 22.12+) for the signup/login UI, workspace gate, and in-memory Convex authorization tests. These simulate Firebase credentials, not Google's consent screen or delivery of real mail. For staging, repeat email/Google registration and existing-user login, verify an emailed link, try the wrong workspace and a pending account, submit/decide an upgrade, accept an invitation, then disconnect Convex and check denial. Do not use production credentials for these checks.
