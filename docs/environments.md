# Environments

Four environments, one direction of travel: **local → PR → staging → production.**
Nothing skips a step, and production is only ever reached by a manual promotion.

| Environment    | Host           | Database                      | URL                     | Deploys when          |
| -------------- | -------------- | ----------------------------- | ----------------------- | --------------------- |
| **Local**      | `npm run dev`  | Local Postgres                | `localhost:3000`        | —                     |
| **PR**         | none (CI only) | ephemeral Postgres in CI      | —                       | every push to a PR    |
| **Staging**    | Railway        | Railway Postgres              | `staging.uselumina.app` | CI passes on `main`   |
| **Production** | Railway        | Railway Postgres (backups on) | `uselumina.app`         | manual promotion only |

There are no per-PR preview deployments. Railway's PR environments are not
available on the Hobby plan, and the previous hand-rolled version (creating a
Railway service per PR from a workflow) was fragile enough to be worse than
nothing. PRs are verified by CI and locally; staging is the first deployed
environment. Revisit if the plan changes.

## Local

```bash
cp .env.example .env          # then fill in the values it describes
docker compose up -d postgres # or use a local Postgres on :5432
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

`.env` is gitignored. Its secrets are throwaway and **must never be reused in a
deployed environment** — a leaked local secret should never grant access to
staging or production.

Verify: <http://localhost:3000/api/health> should return `"status":"healthy"`.

## Staging

Purpose: the last place a change is checked before customers can see it. It runs
the same code, same migrations and same build as production, with seeded demo
data rather than real client records.

Deploys automatically when CI passes on `main`. The workflow applies migrations
_before_ deploying, so new code never meets an old schema, then polls
`/api/health` until it reports healthy. A deploy that never becomes healthy
fails the workflow rather than silently "succeeding".

## Production

Purpose: real salons, real client data.

Deploys **only** via `workflow_dispatch` with `environment: production`. The
GitHub `production` environment should have a required reviewer, so a human
approves every release. Production is not provisioned until Phase 6; until then
the job exits with a clear error rather than half-deploying.

Before the first production deploy:

- [ ] Enable Postgres backups in Railway (**not** on by default)
- [ ] Set a `NEXTAUTH_SECRET` unique to production
- [ ] Point `uselumina.app` and `www` at the production service
- [ ] Enable Sentry with the production DSN
- [ ] Publish a privacy policy and terms — the product stores client PII
      (names, emails, phone numbers) and neither document exists yet

## Environment variables

`.env.example` is the reference and explains each variable. Deployed
environments set these in the Railway dashboard, never in a file.

Two that are easy to get wrong:

- **`NEXTAUTH_SECRET` must differ per environment.** Sharing one means a
  staging session token is also valid in production.
- **`DATABASE_URL` on Railway** should reference the Postgres plugin
  (`${{Postgres.DATABASE_URL}}`), never a pasted connection string, so it keeps
  working when credentials rotate.

## Scheduled jobs

`POST /api/cron/reminders` processes appointment reminders and expects
`Authorization: Bearer $CRON_SECRET`. It is reachable without a session — the
middleware allows `/api/cron/`, and the handler does its own check — so
`CRON_SECRET` is the only thing protecting it. If unset, the endpoint returns
500 and reminders never send.

This previously ran on a Vercel cron declared in `vercel.json`, which could
never have fired because the app deploys to Railway. Configure it as a Railway
cron (every 15 minutes) when reminders are wired up in Phase 4.

## Routes that bypass session auth

`middleware.ts` redirects unauthenticated traffic, with two allow-lists. Adding
to either is a security decision and should be called out explicitly in review.

Genuinely public: `/`, `/api/health`, `/auth/*`, `/api/auth/*`, `/api/public/*`,
`/book/*` (the public booking page), `/booking/*` (booking confirmation).

Public at the middleware layer but **authenticated by other means** — each
carries its own check and must keep it:

| Route                      | Authenticated by            |
| -------------------------- | --------------------------- |
| `/api/cron/*`              | `Bearer $CRON_SECRET`       |
| `/api/payments/webhook`    | Stripe signature            |
| `/api/staff/invite/verify` | single-use invitation token |
| `/api/staff/invite/accept` | single-use invitation token |

The staff-invite routes must be reachable without a session: a new staff member
has no account until they accept, so requiring one would deadlock the flow.
