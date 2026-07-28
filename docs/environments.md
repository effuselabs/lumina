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

Deploys automatically when CI passes on `main`, then polls `/api/health` until
it reports healthy. A deploy that never becomes healthy fails the workflow
rather than silently "succeeding".

Migrations run through `deploy.preDeployCommand` in `railway.json`, inside
Railway, where `DATABASE_URL` resolves to the Postgres plugin. Railway aborts
the release if that command fails, so new code can never go live against an
un-migrated schema.

> **Turn Railway's own auto-deploy OFF** for the service (Settings → Source →
> disable automatic deploys). Railway's GitHub integration and the `Deploy`
> workflow will otherwise both fire on every push to `main`, deploying twice
> and racing each other. GitHub Actions is the single driver, so that deploys
> only happen after CI is green.

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

## Provisioning a deployed environment

Run once per environment. Written for staging; production in Phase 6 is the
same list with production values.

### 1. Railway

1. Create a project, e.g. `lumina`.
2. Add a **Postgres** database to it.
3. Add a service from this GitHub repo. Set **Root Directory** to `/` and let
   Nixpacks build — `railway.json` supplies the build and start commands and
   points the healthcheck at `/api/health`.
4. Name the service something stable, e.g. `lumina-staging`. The workflow refers
   to it by name.
5. Under **Settings → Networking**, add the custom domain
   `staging.uselumina.app`. Railway shows a CNAME target.
6. In **Variables**, set:

   | Variable              | Value                                                     |
   | --------------------- | --------------------------------------------------------- |
   | `DATABASE_URL`        | `${{Postgres.DATABASE_URL}}` — reference, never a literal |
   | `NEXTAUTH_SECRET`     | `openssl rand -base64 32`, unique to this environment     |
   | `NEXTAUTH_URL`        | `https://staging.uselumina.app`                           |
   | `NEXT_PUBLIC_APP_URL` | `https://staging.uselumina.app`                           |
   | `RESEND_API_KEY`      | from Resend                                               |
   | `EMAIL_FROM`          | `noreply@mail.uselumina.app`                              |
   | `EMAIL_FROM_NAME`     | `Lumina`                                                  |
   | `CRON_SECRET`         | `openssl rand -hex 32`                                    |
   | `SENTRY_DSN`          | from Sentry                                               |
   | `NODE_ENV`            | `production` (staging runs a production build)            |

7. Create a **project token** (Settings → Tokens) for CI.

### 2. DNS on `uselumina.app`

| Record      | Name      | Value                       |
| ----------- | --------- | --------------------------- |
| CNAME       | `staging` | the target Railway shows    |
| TXT / CNAME | as issued | Resend's SPF + DKIM records |

Production later adds an apex record and `www` for `uselumina.app`.

### 3. Resend

Sending is from the **`mail.uselumina.app` subdomain**, not the apex. The apex
is hosted at DreamHost, whose MX handling makes it impractical to add Resend's
records there without disturbing existing mail. A dedicated sending subdomain is
the normal pattern anyway: it isolates sending reputation from the root domain,
so a deliverability problem never affects mail to `@uselumina.app`.

1. Add `mail.uselumina.app` as a domain in Resend.
2. Publish the records it issues on `uselumina.app`:
   - **TXT** — SPF, on `mail`
   - **TXT** — DKIM, on the selector host Resend names (e.g. `resend._domainkey.mail`)
   - **MX** — on `mail`, for bounce and complaint handling
3. Wait for Resend to report the domain verified. Sending fails until it does.
4. Create an API key.

`EMAIL_FROM` is therefore `noreply@mail.uselumina.app`. Replies still work if
you set a `Reply-To` of `@uselumina.app` later.

### 4. Sentry

Create a project (platform: Next.js) and copy its DSN. Only staging and
production set `SENTRY_DSN`; local leaves it blank, which disables Sentry.

### 5. GitHub

Repository **Settings → Secrets and variables → Actions**:

| Kind     | Name                      | Value                                   |
| -------- | ------------------------- | --------------------------------------- |
| Secret   | `RAILWAY_STAGING_TOKEN`   | Railway project token                   |
| Variable | `RAILWAY_STAGING_SERVICE` | the service name, e.g. `lumina-staging` |

Repository **Settings → Environments**: create `staging`, and create
`production` with a required reviewer.

Repository **Settings → Branches**: protect `main` — require the `CI` status
check, and disallow direct pushes.

### 6. Verify

Merge any small PR to `main`. CI runs, `Deploy` triggers on success, migrations
apply, and the workflow polls until
`https://staging.uselumina.app/api/health` reports `"status":"healthy"`.

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
