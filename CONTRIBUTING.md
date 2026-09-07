# Contributing to Lumina

Contributions are welcome, and small ones especially. This is what you need to
know before opening a pull request.

## Before a large change, open an issue

Some of the codebase is deliberately parked — models and screens that exist but
have no active code path, waiting behind the current milestone. Nothing is more
discouraging than spending a weekend on something that turns out to be parked
on purpose, so please raise an issue first and we will tell you honestly where
it sits. [docs/PLAN.md](docs/PLAN.md) is kept current and is the best map.

## Local setup

Requires **Node 22** and **PostgreSQL 15+**. The version is pinned in `.nvmrc`
(`nvm use` on macOS and Linux; `nvm use 22` on NVM for Windows, which does not
read the file).

```bash
npm ci
cp .env.example .env          # fill in DATABASE_URL and NEXTAUTH_SECRET
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run docker:dev` starts Postgres and Redis in containers if you would
rather not install them. The seed prints a public booking URL and creates demo
accounts — `owner@lumina-demo.com` and two staff logins, all with the password
`demo123`.

More detail: [docs/development-setup.md](docs/development-setup.md).

## The rule that catches everyone

**Every query touching business data filters by `businessId`.** Lumina is
multi-tenant: one salon must never see another's clients, staff or takings. A
missing filter is not a bug that shows up as a wrong number on a page — it is
one salon reading another salon's customer list.

Two things follow from it, and reviewers will check both:

- Before serving a tenant-scoped route, verify the session user belongs to that
  business. Use `requireBusinessAccess` in `lib/auth.ts`.
- Never trust a `businessId` or `businessSlug` from a URL or request body on its
  own. Anyone can type a different one.

The rest of the working agreement is in [CLAUDE.md](CLAUDE.md) — input
validation with Zod at every API boundary, no secrets resolved at import time,
design tokens from a single source, and no `any`.

## Branches and commits

- One branch per pull request, named for the change: `fix/availability-recursion`,
  `docs/add-plan`, `test/tenant-isolation`. Branch from current `main`, merge,
  delete.
- Never a long-lived branch and never one per phase. A branch open for weeks
  means a huge diff, conflicts against a moving `main`, and no feedback until
  the end.
- [Conventional commits](https://www.conventionalcommits.org/): `fix:`, `feat:`,
  `docs:`, `test:`, `chore:`, `perf:`.
- Explain _why_ in the commit message. The diff already shows what changed.

## Before you open the pull request

```bash
npm run type-check && npm run lint && npm test && npm run build && npm run test:e2e
```

Nothing is finished because it was written — only because that passes. This
project stalled once by treating written code as finished work, so please run
it rather than assuming.

Two things worth knowing about the suite:

- The legacy unit tests are being replaced rather than repaired, so `npm test`
  is not green yet. CI runs a curated set (`npm run test:ci`) that is, and that
  set only grows. If you fix a legacy suite, add it there in the same PR.
- Prefer a failing test first, then make it pass. Tests that assert absolute
  values rather than whatever the code currently produces are the ones that
  catch real defects.

## Sign your commits off

Lumina is AGPL-3.0, and we ask every contributor to certify they have the right
to submit their work under it. That is the
[Developer Certificate of Origin](https://developercertificate.org/), and you
agree to it by signing off each commit:

```bash
git commit -s -m "fix: ..."
```

which appends `Signed-off-by: Your Name <your@email.com>`. No paperwork, no
copyright assignment — you keep the copyright in your own contribution.

If Effuse Labs ever needs to offer Lumina under a different licence as well, we
will ask contributors then rather than collecting rights up front.

## Reporting a bug

Include what you expected, what happened, and enough to reproduce it — the
route, the role you were signed in as, and whether the business had data
seeded. Timezone matters more than you would expect in this codebase: say what
zone your machine and your test business were in.

**Security issues do not belong in a public issue.** Use GitHub's private
vulnerability reporting — _Security_ → _Report a vulnerability_ on this
repository — so we get a chance to fix it before disclosure.

## Licence

By contributing you agree that your work is licensed under
[AGPL-3.0](LICENSE), the same as the rest of the project.
