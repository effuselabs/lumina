# Lumina

Vertical SaaS for salons and barbershops: booking, clients, staff, financials.
Multi-tenant — every business's data is isolated from every other's.

## Stack

Next.js 14 App Router · React 18 · TypeScript strict · PostgreSQL 15+ · Prisma
· NextAuth v5 · Tailwind · Radix UI · Resend · Jest · Playwright · Railway.
**Node 22.**

## Commands

```bash
npm run dev                          # dev server
npm run build                        # production build — must pass before any commit
npm run type-check                   # tsc on application sources
npx tsc -p tsconfig.test.json --noEmit   # tsc on tests and e2e
npm test                             # Jest
npm run test:e2e                     # Playwright
npm run db:migrate && npm run db:seed
```

## Architecture

- `app/` — routes. `app/api/**/route.ts` are the HTTP handlers.
- `components/` — `ui/` holds primitives; feature folders hold the rest.
- `lib/services/` — domain logic (availability, conflicts, appointments).
- `lib/repositories/` — data access.
- `prisma/schema.prisma` — 53 models, and many have no active code path. There
  is no marker distinguishing them, so check for a repository, service or route
  that actually reads a model before building on it. Say so explicitly if you
  are the first.
- `auth.config.ts` is Edge-safe and has no providers; `auth.ts` adds the
  Node-only Credentials provider. `middleware.ts` must import `auth.config.ts`
  — importing `auth.ts` drags bcrypt and Prisma into the Edge runtime.

## Non-negotiables

1. **Tenant scoping.** Every query touching business data filters by
   `businessId`. Before serving a tenant-scoped route, verify the session user
   belongs to that business — use `requireBusinessAccess` in `lib/auth.ts`.
   Never trust a `businessId` or `businessSlug` from the URL or body alone.
2. **Every route authenticates.** Public routes are only those listed in
   `middleware.ts` (`PUBLIC_EXACT_ROUTES` / `PUBLIC_ROUTE_PREFIXES`). Adding a
   route there is a security decision — say so explicitly.
3. **Validate input with Zod** at every API boundary. No unvalidated
   `request.json()`.
4. **No secrets at import time.** Never construct a credential-checking client
   at module scope. Resolve it lazily on first use, or `next build` breaks
   wherever secrets are absent — including CI. This has bitten this repo three
   times.
5. **One design token source.** Colors, spacing, radii, shadows and fonts live
   in `lib/design/tokens.ts` and nowhere else. No raw hex in `.tsx`. Tailwind
   config and the brand guide are generated from it.
6. **No `any`.** Especially not as a function return type — an `: any` mapper
   is how required database fields silently went missing here.
7. **Don't leave TODOs** in place of implementation. Either build it or don't
   merge it.

## Testing

The old suite was deleted: 101 of 114 suites failed and coverage was 0%.
Rebuild deliberately.

- Unit-test real logic (`availability-calculator`, `conflict-detection-engine`,
  `appointment-service`). Don't chase coverage on presentational components.
- `e2e/booking-loop.spec.ts` is the definition of done for the current
  milestone: owner signs up → creates services, staff, hours → client books at
  `/book/[businessId]` → both parties emailed → appointment on the calendar.
- Prefer a failing test first, then make it pass.

## How to know you're done

```bash
npm run type-check && npm run lint && npm test && npm run build && npm run test:e2e
```

All five green. Nothing is "complete" because it was written — only because
that command passes. This project stalled once by treating written code as
finished work; the seed factory had been broken for months, so nobody could
run the app with data, so nothing was ever verified.

## Conventions

- **One branch per pull request**, named for the change — `fix/availability-
recursion`, `docs/add-plan`, `test/tenant-isolation`. Branch from the current
  `main`, merge, delete. Never a long-lived branch, and never one per phase: a
  phase is weeks of work, and a weeks-long branch means a huge PR, conflicts
  against a moving `main`, and no feedback until the end — which is how this
  project stalled the first time. Small batches beat big ones.
- Conventional commits. Never commit to `main` directly; CI gates it.
- Prisma: camelCase fields, snake_case tables via `@@map`. Index foreign keys
  and common composite query paths.
- Prefer functional, declarative code. Reuse what exists — check
  `lib/services/` and `lib/repositories/` before writing a new module.
- If the same correction comes up twice, add a lint rule or a test instead of
  writing it down. Enforcement beats documentation.
