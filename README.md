# Lumina

> **Intelligent software for small business growth**

Lumina is a vertical SaaS platform for salons and barbershops. It consolidates
booking, client management, and financials into a single system.

**"Stop managing your business and start building your passion."**

---

## Status

This project is mid-rebuild. Rather than claim a completion percentage, this
section states only what is mechanically verified.

| Check | Command | Status |
|---|---|---|
| Type check | `npm run type-check` | Passing |
| Production build | `npm run build` | Passing (85 static pages) |
| Database migrations | `npm run db:migrate` | Passing, zero schema drift |
| Database seed | `npm run db:seed` | Passing |
| Unit/integration tests | `npm test` | **Failing** — suite is being rebuilt |
| End-to-end tests | `npm run test:e2e` | **Not yet running** |

The test suite is being rebuilt from scratch against a working application.
Until `npm test` and `npm run test:e2e` are green, treat every feature below
as unverified.

## Feature status

Working end-to-end and verified is a higher bar than "code exists". Code
exists for considerably more than this list; that gap is precisely what is
being corrected.

**In active development**

- Public booking flow — client books an appointment without an account
- Business onboarding — services, staff, opening hours
- Appointment calendar

**Parked** — models remain in `prisma/schema.prisma` under the `PARKED`
section, but there is no working UI and no seed data: products/inventory,
gift cards, promotions, marketing campaigns, loyalty, reviews, POS, and the
analytics event pipeline. These return one at a time, each with its own
end-to-end test.

**Post-MVP** — Stripe payments.

## Tech stack

- **Framework** Next.js 14 (App Router) · React 18 · TypeScript strict
- **Database** PostgreSQL 15+ · Prisma ORM
- **Auth** NextAuth.js v5 (Auth.js), multi-tenant with business-scoped access
- **Styling** Tailwind CSS · Radix UI primitives
- **Email** Resend
- **Testing** Jest · React Testing Library · Playwright
- **Hosting** Railway
- **Monitoring** Sentry (staging and production only)

## Getting started

Requires Node 22 and a PostgreSQL 15+ database.

```bash
npm ci
cp .env.example .env          # then fill in DATABASE_URL and NEXTAUTH_SECRET
npm run db:migrate
npm run db:seed
npm run dev
```

The app runs at `http://localhost:3000`.

Seeded demo accounts (password `demo123` for all):

| Role | Email |
|---|---|
| Owner | `owner@lumina-demo.com` |
| Staff | `mike@lumina-demo.com` |
| Staff | `emma@lumina-demo.com` |

Docker Compose is available for Postgres and Redis: `npm run docker:dev`.

See [docs/development-setup.md](docs/development-setup.md) for detail.

## Common commands

```bash
npm run dev            # development server
npm run build          # production build
npm run type-check     # tsc --noEmit (application sources)
npm run lint           # ESLint
npm test               # Jest
npm run test:e2e       # Playwright
npm run db:migrate     # apply migrations
npm run db:seed        # seed demo data
npm run db:studio      # Prisma Studio
```

Test sources are type-checked separately, so that a broken test config can
never block a production build:

```bash
npx tsc -p tsconfig.test.json --noEmit
```

## Brand

- **Archetype** Creator — innovative, inspiring, empowering
- **Primary** Lumina Radiant Gradient `#FFD25A` → `#FF7A5A`
- **Secondary** Deep Teal `#0B2B33`
- **Typography** Inter (primary), IBM Plex Mono (accent)

Design tokens are being consolidated into a single typed source of truth, from
which both the Tailwind config and the brand guide are generated — so the guide
cannot drift from the application. Until that lands there is no design-system
documentation, by choice.

## Documentation

- [Development setup](docs/development-setup.md)
- [Project overview](docs/project-overview.md)
- [API reference](docs/api/README.md)
- [Contributing](CONTRIBUTING.md)

## License

Proprietary. All rights reserved.
