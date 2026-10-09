# ClientFlow Pilot API Contracts

All `/api` JSON errors use `{ "error": { "code": "...", "message": "..." } }`, except the intentionally generic sign-in response. Protected APIs validate the NextAuth session cookie on the server and derive authorization from `Membership`; the optional `organizationId` query must match that membership. The browser does not send a user ID or bearer token. Portal routes use only their signed project/contact token and do not require the app session.

## Authentication

| Method + path | Auth | Request | Response and errors |
|---|---|---|---|
| `POST /api/auth/signin` | Public | `{ "email": "owner@example.com" }` | Always `{ "success": true, "message": "If that address is registered, a sign-in link is on its way." }` for valid email shape. Invalid input `400`; throttled requests return the same generic success. Token expires in 15 minutes and only its SHA-256 hash is stored. |
| `GET /api/auth/verify?token=...` | Public one-time token | Query token | Valid token redirects to `/login/verify?token=...`; invalid/expired/used redirects to `/login?error=expired`. This GET does not consume the token. |
| `POST /api/auth/callback/magic-link` | NextAuth credentials callback | `{ token }` as NextAuth credentials | Atomically consumes token and sets signed HTTP-only JWT cookie; invalid/expired/reused token is rejected. Frontend must call `signIn("magic-link", { token })`. |
| `GET|POST /api/auth/[...nextauth]` | NextAuth | NextAuth protocol | Session, CSRF, callback, and sign-out operations. |

## Workspace Data

| Method + path | Auth | Request | Response and errors |
|---|---|---|---|
| `GET /api/clients?organizationId=` | Session + membership | Optional organization query | Client list with `{ id, name, contacts: [{ id, name, email }] }`. |
| `POST /api/clients?organizationId=` | Session + membership | `{ name, contactName?, contactEmail? }` | Created client (201). Contact fields must be both present or both omitted. |
| `POST /api/clients/:id/contacts` | Session + membership | `{ name, email }` | Created reviewer contact (201); cross-org client returns 403. |
| `GET /api/projects?organizationId=` | Session + membership | Optional organization query | Projects, client summaries, deliverable summaries, newest first. |
| `POST /api/projects?organizationId=` | Session + membership | `{ name, clientId }` | Created project with client and deliverables (201); foreign client returns 404. |
| `GET /api/projects/:id` | Session + membership | Path id | Project with client and deliverables; 403/404 when inaccessible/missing. |
| `GET /api/deliverables?projectId=` | Session + membership | Project query | Deliverables with current version summary and version count. |
| `POST /api/deliverables` | Session + membership | `{ projectId, name }` | Created draft (201). |
| `GET /api/deliverables/:id` | Session + membership | Path id | Full version history, comments, decisions, project/client context, and internal download paths. `fileKey` is never returned. |
| `POST /api/deliverables/:id/comments` | Session + membership | `{ content, isInternal }` | Created comment (201) on current version; 409 if no version. |
| `PATCH /api/deliverables/:id/status` | Session + membership | `{ status }` | Updated deliverable. Illegal transition 409; team-side `APPROVED` is rejected with 403. |
| `GET /api/dashboard/inbox?organizationId=` | Session + membership | Optional organization query | `{ waitingOnClient, needsTeamAction, approvedThisWeek }`. |
| `GET /api/activity-log?organizationId=&limit=` | Session + membership | Optional org; limit 1–100 (default 50) | Recent organization log entries with actor. |
| `GET /api/org/settings?organizationId=` | Session + membership | Optional organization query | `{ id, name, slug, logoUrl, primaryColor }`. |
| `PATCH /api/org/settings?organizationId=` | Owner/Admin session | `{ name?, logoUrl?, primaryColor? }` | Updated branding. Color is `#RRGGBB`; logo URL is valid HTTP(S). |

## File Storage

| Method + path | Auth | Request | Response and errors |
|---|---|---|---|
| `POST /api/deliverables/:id/upload-url` | Session + membership | `{ fileName, contentType }` | `{ uploadUrl, fileKey, expiresInSeconds: 600 }`. Browser PUTs bytes to the signed URL with the same `Content-Type`. |
| `POST /api/deliverables/:id/version` | Session + membership | `{ fileKey, fileName, contentType }` | Verifies the R2 object exists, creates the next version, resets status to draft, returns version (201). Keys must be under that deliverable's upload prefix. |
| `GET /api/deliverables/:id/download?versionId=` | Session + membership | Version query | 302 redirect to a five-minute signed GET URL. |
| `GET /api/portal/file?token=&versionId=` | Portal token | Token and version query | 302 redirect to a five-minute signed GET URL after project/contact ownership check. |

R2 should stay private. Browser CORS allows exact application origins, `PUT, GET, HEAD`, and `Content-Type`. Never expose `fileKey` or a permanent public object URL to the browser.

## Client Portal

| Method + path | Auth | Request | Response and errors |
|---|---|---|---|
| `POST /api/portal/generate-link` | Session + membership | `{ clientContactId, projectId }` | `{ portalUrl, expiresInSeconds: 1209600 }` (201). Contact and project must share the same client. Link creation does not send email; share it through the agency's chosen channel. |
| `GET /api/portal/verify?token=` | Portal token | Query token | `{ valid, expired, expiresAt, client, organization, project, deliverables }`. 401 invalid/expired; 403 revoked/mismatched scope. No app session required. |
| `GET /api/portal/deliverables?token=` | Portal token | Query token | Scoped deliverables, latest version, public comments and decisions only. Internal comments are excluded. |
| `POST /api/portal/approve` | Portal token | `{ token, deliverableId, note? }` | `{ message, status: "APPROVED" }`; stores decision for current version and activity log transactionally. 409 if not awaiting approval. Reviewer identity comes from the signed contact, not the request body. |
| `POST /api/portal/comments` | Portal token | `{ token, versionId, content }` | `{ message, status: "CHANGES_REQUESTED" }` (201); comment is forced public and tied to a version. 409 unless item is in review. |

## Operations

| Method + path | Auth | Request | Response and errors |
|---|---|---|---|
| `POST /api/webhooks/stripe` | Stripe signature | Raw Stripe event body + `Stripe-Signature` header | Handles `checkout.session.completed` and `customer.subscription.deleted`; invalid/stale signatures return 400. |

## Known Contract Boundaries

- First workspace owner is provisioned by `npm run db:seed`; there is no public signup or invitation endpoint in this pilot.
- Users with multiple memberships default to their oldest organization unless they pass a membership ID as `organizationId`.
- Portal links are generated for copy/share; Resend integration currently handles internal sign-in links only.
- Stripe webhook is present, but a checkout-session creation route is not part of the pilot UI.
- Rate limits use per-instance memory and are best-effort only on Vercel.
