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

**Railway deploys staging itself.** The service has GitHub auto-deploy enabled
with **Wait for CI**, so a push to `main` deploys only once the CI check is
green. Nothing in GitHub Actions drives it.

`railway.json` supplies the safety rails:

- `deploy.preDeployCommand` runs `prisma migrate deploy` inside Railway, where
  `DATABASE_URL` resolves to the Postgres plugin. Railway aborts the release if
  it fails, so new code never meets an un-migrated schema.
- `deploy.healthcheckPath` points at `/api/health`. Railway will not promote a
  release that fails to answer, so a broken deploy does not take staging down.

This is deliberately simpler than driving deploys from a workflow: no token to
manage or rotate, no coupling to the service name, and no chance of two systems
deploying at once. `.github/workflows/deploy.yml` is manual-only, for
re-deploying by hand and for promoting production.

### Health contract

`/api/health` is what Railway polls before promoting a release.

| Condition                | `status`    | HTTP    | Effect                                                   |
| ------------------------ | ----------- | ------- | -------------------------------------------------------- |
| All checks pass          | `healthy`   | 200     | Release promoted                                         |
| Memory pressure only     | `degraded`  | 200     | Promoted — the app still serves correctly                |
| **Database unreachable** | `unhealthy` | **503** | **Release rejected; staging stays on the last good one** |

The database case is deliberately fatal. Without a database the instance
cannot serve a booking page, authenticate anyone, or read a calendar, so
promoting it would publish a broken release. This previously returned 200 for
every state, which is exactly how a deploy that could not reach its database
was promoted anyway — the gate existed but could never fire.

Memory pressure stays 200 on purpose: taking a working instance out of rotation
would cause an outage rather than prevent one.

On failure the response includes `databaseError` with Prisma's code, a one-line
reason, and the **host** it tried to reach — enough to tell Railway's internal
networking host from a public proxy host or a stale localhost without opening
deploy logs. Credentials are never included.

Confirm what is actually running at any time:

```bash
curl -s https://staging.uselumina.app/api/health | jq
# → "runtime": "v22.x.x"   the Node version actually in use
#   "commit":  "abc1234"   the deployed commit
```

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
   points the healthcheck at `/api/health`. Note that Railway prefers a
   root-level `Dockerfile` over `railway.json`'s declared builder if one
   exists; this repo deliberately has none.
4. Note the **service** name (the repo service, e.g. `lumina`) — it is not the
   project name, and the manual deploy workflow refers to the service.
5. Under **Settings → Networking**, add the custom domain
   `staging.uselumina.app`. Railway shows a CNAME target.
6. In **Settings → Source**, enable GitHub auto-deploy from `main` **with
   "Wait for CI" turned on**, so Railway deploys only after the CI check passes.
7. In **Variables**, set the following. For `DATABASE_URL`, use Railway's
   **"Add a Variable Reference"** button and pick the Postgres service's
   `DATABASE_URL` — do not paste a connection string, or it will break the next
   time credentials rotate. Typing `${{Postgres.DATABASE_URL}}` by hand does the
   same thing, where `Postgres` is the exact name of the database service.

   | Variable                     | Value                                                     |
   | ---------------------------- | --------------------------------------------------------- |
   | `DATABASE_URL`               | `${{Postgres.DATABASE_URL}}` — reference, never a literal |
   | `NEXTAUTH_SECRET`            | `openssl rand -base64 32`, unique to this environment     |
   | `NEXTAUTH_URL`               | `https://staging.uselumina.app`                           |
   | `NEXT_PUBLIC_APP_URL`        | `https://staging.uselumina.app`                           |
   | `RESEND_API_KEY`             | from Resend                                               |
   | `EMAIL_FROM`                 | `noreply@mail.uselumina.app`                              |
   | `EMAIL_FROM_NAME`            | `Lumina`                                                  |
   | `CRON_SECRET`                | `openssl rand -hex 32`                                    |
   | `PUBLIC_BOOKING_CSRF_SECRET` | `openssl rand -hex 32`, unique to this environment        |
   | `SENTRY_DSN`                 | from Sentry                                               |
   | `NODE_ENV`                   | `production` (staging runs a production build)            |
   | `NODE_OPTIONS`               | `--dns-result-order=ipv6first` — see note below           |

   `NODE_OPTIONS` is needed because Railway's private networking host
   (`postgres.railway.internal`) resolves **IPv6-only**. Without it Node may try
   an IPv4 address that does not exist and the database is unreachable at
   runtime, even though `DATABASE_URL` is correct and migrations succeed during
   pre-deploy.

8. Create a **project token** (Settings → Tokens). Only the manual deploy
   workflow needs it; routine deploys do not.

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

Repository **Settings → Environments**: create `staging` and `production`.

**Branch protection is intentionally not enforced.** Rulesets on a private repo
require a paid GitHub plan, and with a two-person project the cost is not yet
worth it. The convention instead: work on a branch, open a PR, let CI run, merge
when green. Railway's "Wait for CI" enforces the part that actually matters —
a red commit cannot reach staging even if it lands on `main`.

Revisit when a third person joins, or when a bad merge costs more than a few
dollars a month.

### 6. Verify

Push to `main`. CI runs; when it goes green Railway deploys, applies migrations
via `preDeployCommand`, and refuses to promote the release unless
`/api/health` answers. Then:

```bash
curl -s https://staging.uselumina.app/api/health | jq
```

Expect `"status": "healthy"`, `"runtime": "v22.x.x"`, and a `"commit"` matching
what you pushed. A `"degraded"` status means the app is up but a dependency is
not — the `checks` object says which.

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
| `.../booking/[id]/book`    | CSRF token + rate limit     |

`POST /api/public/booking/[businessId]/book` cannot require a session — the
person booking is a stranger. It is guarded by a double-submit CSRF token
issued by `GET .../csrf-token`, signed with `PUBLIC_BOOKING_CSRF_SECRET`, plus
per-IP rate limiting. Public booking routes return no client PII: a lookup
answers "is this a returning client" with a boolean and nothing more.

The staff-invite routes must be reachable without a session: a new staff member
has no account until they accept, so requiring one would deadlock the flow.
