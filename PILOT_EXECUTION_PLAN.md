# ClientFlow Pilot Execution Plan

> Recommended next action if no reply in 2 hours: configure the Supabase staging URL and provider environment variables, then apply the initial migration.

## 1. Objective
- Launch a usable client-review workflow within two weeks.
- Onboard 3–5 agencies and measure time from first invite to first approval.
- Success means one agency creates a client/project, uploads a version, shares a review link, receives approval or changes, and sees the audit entry.

## 2. Current State
- **Done:** Next.js starter replaced with a responsive workspace shell, email-only login UI, dashboard, project board/detail, deliverable detail, token portal, settings, and activity views.
- **Done:** Prisma pilot schema, generated initial migration, idempotent owner seed, tenant-checked APIs, private S3-compatible file redirects, and portal decision records.
- **Done:** API contracts and outreach pack documented.
- **In progress:** Local validation; auth/API logic has type-checked, but the full build/lint pass remains.
- **Blocked:** Database migration application, email delivery, storage upload, and staging deployment. `.env` currently points to a placeholder localhost database; provider variables are absent.

## 3. Open Gaps
- **Blocked:** Apply `prisma/migrations/20261009000000_pilot_foundation/migration.sql` to the Supabase staging database.
- **Blocked:** Verify Resend sender and deliver a real magic link.
- **Blocked:** Configure private R2 bucket, exact CORS origins, and test presigned PUT/GET.
- **Blocked:** Set Vercel project/environment values and test the deployment.
- **Not started:** Stripe test event against a configured Stripe webhook. Checkout creation is not part of this pilot UI.
- **Not started:** Agency owner provisioning is via `npm run db:seed`; public signup and team invitations are intentionally not implemented.
- **Not started:** Send review links by email. The deliverable screen creates a 14-day link for the team to copy/share.
- **Pilot constraint:** Rate limiting uses per-instance memory and is not durable across Vercel instances/cold starts.

## 4. Decisions Already Locked
- **Locked:** Email-only magic-link authentication; no passwords.
- **Locked:** NextAuth v4 Credentials provider exchanges a one-time email token for a signed JWT session cookie.
- **Locked:** Session cookie protects app routes; every protected API independently checks the session and organization membership.
- **Locked:** Portal uses a separate signed, 14-day project/contact token; it does not use app auth.
- **Locked:** Vercel + Supabase Postgres + private Cloudflare R2 + Resend; Stripe test mode only.
- **Locked:** Use exact staging/production browser origins in R2 CORS. No wildcard origin for credentialed requests.
- **Out of scope:** Docker, Redis/workers, SSO, public signup, custom domains, broad white-labeling, and enterprise/on-prem packaging.

## 5. Build Order
1. **Done:** Add Prisma data model, generate client, and generate the initial migration.
2. **Done:** Implement shared NextAuth session and server-side tenant authorization.
3. **Done:** Implement sign-in request/token handoff, portal token verification, and approval/feedback APIs.
4. **Done:** Add project, client, deliverable, settings, inbox, activity, and private upload/download routes.
5. **Done:** Wire the six agreed screens to real APIs, plus project detail and activity view.
6. **In progress:** Run full local build/lint and fix implementation errors.
7. **Blocked:** Configure Supabase, Resend, R2, Stripe test, and Vercel staging variables.
8. **Blocked:** Apply migration and seed pilot owner; verify actual email and object storage.
9. **Not started:** Run the end-to-end validation checklist.
10. **Draft prepared, not sent:** Cold outreach, follow-up, LinkedIn, and demo call materials; send only after the 15 validation checks pass.

## 6. Route Contract Checklist
- **Done** `POST /api/auth/signin` — public; body `{ email }`; generic `{ success, message }`; 400 invalid input. Per-instance 10/IP and 4/email per 15 minutes. Creates a hashed 15-minute token and emails after response.
- **Done** `GET /api/auth/verify?token=` — public; valid token redirects to `/login/verify?token=...`; invalid/expired redirects to `/login?error=expired`.
- **Done** `POST /api/auth/callback/magic-link` — NextAuth Credentials callback; consumes token atomically and sets NextAuth JWT cookie; invalid/expired credentials are rejected.
- **Done** `GET|POST /api/auth/[...nextauth]` — NextAuth session/sign-out endpoints.
- **Done** `GET /api/projects?organizationId=` — session; optional org id must match membership; returns project, client, and deliverable summaries.
- **Done** `POST /api/projects?organizationId=` — session; `{ name, clientId }`; client must belong to selected org; returns project (201).
- **Done** `GET /api/projects/[id]` — session + org membership; returns project and deliverables.
- **Done** `GET /api/clients?organizationId=` — session; returns clients and contacts.
- **Done** `POST /api/clients?organizationId=` — session; `{ name, contactName?, contactEmail? }`; optional contact fields must be supplied together.
- **Done** `POST /api/clients/[id]/contacts` — session; `{ name, email }`; adds a reviewer to an owned client.
- **Done** `GET|POST /api/deliverables` — session; GET query `projectId`; POST `{ projectId, name }`.
- **Done** `GET /api/deliverables/[id]` — session; returns all versions/comments/decisions and protected application download paths.
- **Done** `POST /api/deliverables/[id]/upload-url` — session; `{ fileName, contentType }`; returns `{ uploadUrl, fileKey, expiresInSeconds }`; browser PUTs directly to R2.
- **Done** `POST /api/deliverables/[id]/version` — session; `{ fileKey, fileName, contentType }`; verifies object exists and creates next version (201).
- **Done** `GET /api/deliverables/[id]/download?versionId=` — session + tenant; redirects to five-minute S3-compatible signed GET URL.
- **Done** `PATCH /api/deliverables/[id]/status` — session + tenant; `{ status }`; enforces state transitions. Team-side `APPROVED` is rejected; approval is portal-only.
- **Done** `POST /api/deliverables/[id]/comments` — session; `{ content, isInternal }`; applies to latest version.
- **Done** `POST /api/portal/generate-link` — session; `{ clientContactId, projectId }`; contact and project must belong together; returns `{ portalUrl, expiresInSeconds }`.
- **Done** `GET /api/portal/verify?token=` — portal token; returns validity/expiry, client, project, organization branding, deliverable/status/version summary. Expired/invalid/access-revoked states are distinct.
- **Done** `GET /api/portal/deliverables?token=` — portal token; returns only scoped project data and public comments.
- **Done** `GET /api/portal/file?token=&versionId=` — portal token; version must belong to the token’s client/project; redirects to short-lived signed GET.
- **Done** `POST /api/portal/approve` — portal token; `{ token, deliverableId, note? }`; records version-specific approval, changes status, logs activity.
- **Done** `POST /api/portal/comments` — portal token; `{ token, versionId, content }`; stores public feedback, requests changes, logs activity.
- **Done** `GET /api/dashboard/inbox?organizationId=` — session; returns `waitingOnClient`, `needsTeamAction`, `approvedThisWeek` for the member’s org.
- **Done** `GET /api/activity-log?organizationId=&limit=` — session; limit 1–100; returns org activity with actor.
- **Done** `GET|PATCH /api/org/settings?organizationId=` — session; GET current member org; PATCH owner/admin only with `{ name?, logoUrl?, primaryColor? }`.
- **Done** `POST /api/webhooks/stripe` — public endpoint; verifies timestamped Stripe signature; handles checkout completion and subscription deletion.
- **Error shape:** API validation/authorization errors generally return `{ error: { code, message } }`; sign-in intentionally uses the same generic success response for known and unknown emails.

## 7. Frontend Contract Checklist
- **Done** `/login` — email input; generic success, resend/try-another, expired/invalid states.
- **Done** `/login/verify?token=` — exchanges one-time token for NextAuth cookie, redirects to dashboard, shows invalid/expired state.
- **Done** `/dashboard` — inbox/stats; skeleton, empty queue, retryable error.
- **Done** `/projects` — searchable grid/list, status counts, create project/client/reviewer contact; loading/empty/error.
- **Done** `/projects/[id]` — project detail, add deliverable, loading/missing/error.
- **Done** `/deliverables/[id]` — version preview/history, direct upload, comments/privacy control, review status, create/copy client link; loading/401/403/404/no-file/no-comments.
- **Done** `/portal/[token]` — no app chrome/session, branding, private file access, public feedback, approve/request-changes, expired/invalid/revoked states.
- **Done** `/settings` — branding fetch/save, live preview, loading/error.
- **Done** `/activity` — audit list, loading/empty/error.
- **Assumption:** Users with multiple organizations default to their oldest membership unless the API query explicitly chooses another membership. Workspace switching is not implemented.

### Acceptance Criteria (Done means)
- **Auth flow — In progress:** Known email receives a one-time link, token is single-use and expires after 15 minutes, successful exchange creates a NextAuth cookie, and a protected API returns authorized data. Currently blocked on real DB/Resend config.
- **Dashboard — UI done, integration blocked:** Inbox and stats render from the member's org with loading, empty, and retryable error states; no org data is exposed without membership.
- **Project Board — UI done, integration blocked:** Search/grid/list work; a new project and optional reviewer can be created; zero-project state is actionable.
- **Deliverable Detail — UI done, integration blocked:** Version upload/history, comments privacy, review status and link creation render; inaccessible/missing/no-file/no-comment states are explicit.
- **Client Portal — UI done, integration blocked:** A valid project token loads scoped public review data, private file downloads and approve/change-request actions; invalid/expired/revoked tokens are distinguishable.
- **Settings — UI done, integration blocked:** Owner/Admin can fetch/save workspace branding; other roles are rejected; preview reflects unsaved values.
- **Staging deploy — Blocked:** Vercel preview loads with configured Supabase, Resend, private R2, and auth variables; migration and seed complete; login and upload smoke checks pass.

## 8. Deployment Checklist
- **Blocked** Vercel project: connect repository; set separate Preview and Production variables.
- **Required env:** `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `PORTAL_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=auto`, `AWS_S3_BUCKET`, `S3_ENDPOINT_URL`, `STRIPE_WEBHOOK_SECRET` (and `STRIPE_SECRET_KEY` only when adding checkout).
- **Required seed vars:** `SEED_OWNER_EMAIL`, optional `SEED_OWNER_NAME`, `SEED_ORGANIZATION_NAME`; run `npm run db:seed` after migration.
- **Supabase:** use a suitable runtime connection string; ensure the migration command uses a direct connection.
- **Migration:** run `npm run db:migrate` only after replacing the current placeholder `DATABASE_URL` with the intended Supabase staging URL.
- **Resend:** verify sender domain; preview sign-in links use that deployment’s `NEXTAUTH_URL`; do not share one production URL across all preview builds.
- **R2:** keep bucket private. Configure CORS with exact staging and production origins, `PUT, GET, HEAD`, and `Content-Type` as an allowed header. If dynamically echoing origins, validate against an allowlist and return `Vary: Origin`. No app cookies are sent to R2.
- **Stripe:** configure test-mode endpoint `https://<staging-domain>/api/webhooks/stripe`; subscribe to `checkout.session.completed` and `customer.subscription.deleted`.
- **Preview note:** set `NEXTAUTH_URL` separately for Preview and Production. For a stable staging deployment, use its fixed Vercel domain.

## 9. Validation Checklist
- **1. Blocked — Resend + DB:** Request sign-in for a seeded known owner; expect generic success and one delivered 15-minute link.
- **2. Blocked — DB:** Request sign-in for an unknown email; expect the exact same success payload and no token/email.
- **3. Blocked — Resend + DB + secret:** Open a valid link; expect dashboard redirect and an HTTP-only NextAuth session cookie.
- **4. Blocked — DB:** Open an expired link; expect `/login?error=expired` and no session.
- **5. Blocked — DB:** Reuse a consumed link; expect credential rejection and no new session.
- **6. Blocked — migrated/seeded DB:** Call `GET /api/projects` with a valid session; expect only the member's org projects.
- **7. Blocked — migrated DB:** Call `GET /api/projects` without a cookie; expect 401.
- **8. Blocked — signed portal token + DB:** Open portal review without an app cookie; expect scoped review data, while dashboard APIs remain 401.
- **9. Blocked — DB:** Approve through portal; expect status `APPROVED`, version decision, and activity record; team PATCH to `APPROVED` must return 403.
- **10. Blocked — DB:** Submit portal change request; expect public comment, `CHANGES_REQUESTED`, and activity record.
- **11. Blocked — R2 + DB:** Upload a file and commit a version; expect object present and monotonically incremented version.
- **12. Blocked — Stripe test setup:** Send a valid signed webhook; expect subscription update; invalid and stale signatures return 400.
- **13. Blocked — two seeded orgs:** Org A requests Org B project/deliverable; expect 403/404 and no data.
- **14. Blocked — Vercel Preview + Resend:** Confirm preview magic-link domain, delivery, callback, and cookie behavior.
- **15. Blocked — three seeded orgs:** Exercise board, comments, uploads, settings, and activity under each org; confirm no cross-tenant data.

## 10. Risks and Stop Signals
- **Stop:** Do not run migrations while `DATABASE_URL` is a placeholder; current local value resolves to localhost/mydb.
- **Stop:** Do not configure R2 as public; stored deliverables must remain private.
- **Stop:** Do not report authentication or tenant isolation as proven before running against a real migrated database.
- **Pilot risk:** In-memory rate limiter is best-effort only on Vercel; it resets across instances/cold starts. Redis-backed shared limiting is post-pilot unless abuse is observed.
- **Would revisit Docker:** persistent worker processes, on-prem hosting, or multi-service orchestration become required.
- **Do not build now:** Docker packaging, Redis workers, SSO, public signup, custom domains, invoicing, broad admin/team management.
- **Requires configuration before staging:** real Supabase URL, Resend verified sender/key, R2 bucket/credentials/endpoint, stable Vercel staging URL, and Stripe test webhook secret.

## 11. Deliverables
- **Done this iteration:** pilot Prisma schema and generated migration; auth/session; tenant-scoped APIs; private file upload/download; six requested screens; supporting project detail/activity; owner seed; API/env docs; outreach draft (not sent).
- **Blocked this week:** apply migration, seed owner, configure Vercel Preview variables, and test sign-in/upload against staging.
- **Not started next week:** run the validation checklist with pilot agencies, correct observed workflow defects, then begin outreach.

## 12. Questions Requiring My Decision
- **Blocked:** Provide/configure the real Supabase staging connection string in `.env`/Vercel; recommended: Supabase project selected for this pilot.
- **Blocked:** Confirm the verified Resend sender address and R2 bucket/domain exist; credentials should be entered directly into Vercel or local env, not shared in chat.
- **No other decision required:** R2, Resend, Vercel, cold outreach, and Stripe test-mode defaults are already locked.
