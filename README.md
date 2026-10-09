# ClientFlow

A focused client review workspace for agencies: deliverable versions, comments, approval decisions, and an audit trail in one place.

## Local setup

```bash
npm install
Copy-Item .env.example .env
```

Set a real PostgreSQL `DATABASE_URL`, `NEXTAUTH_SECRET`, `PORTAL_SECRET`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` before testing sign-in. For local secrets in PowerShell:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Generate two different secrets. Do not commit `.env` or share secret values in chat.

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Set `SEED_OWNER_EMAIL` and optionally `SEED_OWNER_NAME` / `SEED_ORGANIZATION_NAME` in `.env` before seeding. The seed creates the first workspace owner; the pilot intentionally has no public signup or password flow.

**Do not run migrations against the current workspace `.env` as-is.** It currently points at the placeholder `localhost/mydb`. Configure the intended Supabase staging database first. `db:migrate` uses checked-in SQL migrations; `db:seed` is idempotent.

## Environment

Copy `.env.example` as a key list. Production/preview values belong in separate Vercel environments:

- Supabase Postgres: `DATABASE_URL` (direct connection for migrations)
- NextAuth: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- Portal token signing: `PORTAL_SECRET` (different from `NEXTAUTH_SECRET`)
- Resend: `RESEND_API_KEY`, verified `RESEND_FROM_EMAIL`
- Private R2 bucket: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=auto`, `AWS_S3_BUCKET`, `S3_ENDPOINT_URL`
- Pilot seed only: `SEED_OWNER_EMAIL`, `SEED_OWNER_NAME`, `SEED_ORGANIZATION_NAME`
- Stripe test webhook: `STRIPE_WEBHOOK_SECRET`; a Stripe secret key is only needed if checkout is added later

Keep the R2 bucket private. Configure CORS for exact staging and production app origins, allowing `PUT`, `GET`, `HEAD` and `Content-Type`. Files are uploaded directly to R2 with short-lived presigned URLs, and downloaded through an authenticated/token-scoped redirect.

## Commands

- `npm run dev` — local development server
- `npm run lint` — ESLint
- `npx tsc --noEmit` — TypeScript validation
- `npm run build` — production build
- `npm run db:generate` — regenerate Prisma Client
- `npm run db:migrate` — apply migrations to the configured database
- `npm run db:seed` — provision/update the pilot owner and organization

## Routes and contracts

See [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md) for request/response and auth contracts. The current milestone status, acceptance gates, deployment checklist, and blockers are in [PILOT_EXECUTION_PLAN.md](PILOT_EXECUTION_PLAN.md). Outreach copy and demo call script are in [docs/PILOT_OUTREACH.md](docs/PILOT_OUTREACH.md).

## Pilot security boundaries

- The app uses one-time email links exchanged for NextAuth JWT cookies; all protected APIs still authorize the current membership server-side.
- Client portal links are separate, project-scoped, signed tokens. Portal APIs only return public comments and authorize private downloads against the token scope.
- Client-side route middleware is only a navigation experience; it is not a substitute for API guards.
- The in-memory sign-in limiter is a temporary best-effort pilot control and is not shared across Vercel instances.
- Stripe webhook signature verification is implemented. Checkout creation and automated client-review email delivery are not in the pilot UI.
