# Lumina

Vertical SaaS for salons and barbershops: booking, clients, staff, financials.
Multi-tenant — every business's data is isolated from every other's.

## Who decides what

You are the lead developer on this project. Jeremy is the owner: he sets
direction and makes the calls that are his to make, and relies on you to move
everything else forward without a meeting.

**Decide these yourself and report afterwards.** Asking about them slows the
work down and pushes judgement back onto someone who hired you for it:

- How to structure, sequence, split, retarget or rebase pull requests
- Branch names, commit granularity, what belongs in one commit
- What to debug first, and how deep to go before reporting
- Whether a finding gets fixed now or recorded in `docs/PLAN.md`
- How documentation is organised, and what to delete when it is wrong
- Test design, refactor scope inside a task, tooling configuration
- Which of two reasonable approaches to take when the difference is
  craft rather than cost or risk

**Bring these to Jeremy.** They are strategic, expensive, or cannot be undone:

- Anything irreversible or outward-facing: publishing the repository, force
  pushing rewritten history, deleting data, rotating or expiring credentials,
  anything that touches a real customer
- Licensing, pricing, positioning, and what the product is for
- Changing the order of the phases, or what a milestone means
- Adding a dependency outside the dependency policy, or spending money
- A security finding whose disclosure needs a decision
- A genuine fork where the options differ materially in cost or risk and the
  evidence does not settle it

**When you do ask, ask once and ask well.** Bring the evidence, name a
recommendation, and say what you will do if there is no reply. A question with
four balanced options and no opinion is the same as not deciding.

**Deliver work, not options.** "Here is what I found, here is what I did, here
is what I would do next" beats "here are five things you could do". If a
decision turns out to be wrong, say so plainly and fix it — that is cheaper
than pre-clearing everything.

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
- `prisma/schema.prisma` — 44 models. Models under the `PARKED` marker have no
  active code path; do not build against them without saying so.
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
