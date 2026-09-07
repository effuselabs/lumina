# Lumina

**Booking, clients, staff and financials for salons and barbershops.**

Lumina is open-source software a salon can run for itself. A client opens a
salon's public booking page, picks a service and a time that is genuinely
available, books, and the appointment lands on the owner's calendar with both
parties emailed. Every business's data is isolated from every other's.

Self-hosting is free and always will be. If you would rather not run it
yourself, [Effuse Labs](https://effuse.io) offers managed hosting and
support — that is where the money comes from, not from restricting the code.

---

## Status

Pre-release, and in an honest rebuild. The booking loop works end to end and is
gated by CI on every merge; a lot of the surrounding product is not finished.
See [docs/PLAN.md](docs/PLAN.md) for what is being worked on, what is parked,
and why — it is kept current rather than aspirational.

Not yet suitable for a salon's real customers. It is suitable for reading,
running locally, and contributing to.

The project stalled once before and was restarted deliberately;
[docs/history.md](docs/history.md) explains what went wrong and why the
conventions here look the way they do.

## Quick start

Requires **Node 22** and **PostgreSQL 15+**.

```bash
git clone https://github.com/effuselabs/lumina.git
cd lumina
npm ci
cp .env.example .env          # fill in DATABASE_URL and NEXTAUTH_SECRET
npm run db:migrate
npm run db:seed
npm run dev
```

The app runs at `http://localhost:3000`. If you would rather not install
Postgres, `npm run docker:dev` starts it (and Redis) in containers.

Seeded demo accounts, password `demo123`:

| Role  | Email                   |
| ----- | ----------------------- |
| Owner | `owner@lumina-demo.com` |
| Staff | `mike@lumina-demo.com`  |
| Staff | `emma@lumina-demo.com`  |

The seed prints a public booking URL — open it to walk the flow as a client
would.

Longer setup notes: [docs/development-setup.md](docs/development-setup.md).

## Commands

```bash
npm run dev            # development server
npm run build          # production build
npm run type-check     # tsc on application sources
npm run lint           # ESLint
npm test               # Jest
npm run test:e2e       # Playwright
npm run db:migrate     # apply migrations
npm run db:seed        # seed demo data
npm run db:studio      # Prisma Studio
```

Tests are type-checked separately, so a broken test config can never block a
production build: `npx tsc -p tsconfig.test.json --noEmit`.

## How it is built

- **Framework** — Next.js 14 (App Router), React 18, TypeScript in strict mode
- **Data** — PostgreSQL 15 with Prisma
- **Auth** — NextAuth v5, multi-tenant with business-scoped access
- **Styling** — Tailwind CSS and Radix UI, from a single typed token source
- **Email** — Resend
- **Testing** — Jest, Playwright
- **Hosting** — Railway

Routes live in `app/`, domain logic in `lib/services/`, data access in
`lib/repositories/`. The rules that matter — tenant scoping, input validation,
where design tokens live — are in [CLAUDE.md](CLAUDE.md), which is the working
agreement rather than a style guide.

## Security

Found something that crosses a tenant boundary, or anything else security
related? Please report it privately rather than in an issue —
[SECURITY.md](SECURITY.md) explains how, and what is already known.

## Contributing

Contributions are welcome, and small ones especially. Start with
[CONTRIBUTING.md](CONTRIBUTING.md): it covers the local setup, the one rule
that catches most people (every query touching business data filters by
`businessId`), and the sign-off that AGPL requires.

Please open an issue before a large change, so nobody spends a weekend on
something that turns out to be parked.

## Licence

[GNU Affero General Public License v3.0](LICENSE).

In practice: run it, modify it, self-host it, for free and forever. If you
offer a modified Lumina to other people over a network, you have to offer them
your modified source as well. That obligation is the point — it keeps the
project open regardless of who is running it, including us.

## Credits

Built by [Effuse Labs](https://effuse.io).
