# Lumina rebuild plan

Living document. Update it in place as things land — do not create a second
plan, a per-phase plan, or a status report. This project already failed once by
accumulating 335 documents and 85 spec files describing work that did not run.

**Detail lives where it is enforced, not here.** Rules are in `CLAUDE.md`,
environment mechanics in `docs/environments.md`, why a change was made in its
commit message, and the definition of done in `e2e/booking-loop.spec.ts`. This
file is only the map: where we are, what is next, and what is deliberately
parked.

---

## Why this rebuild exists

Development stalled after ~118 commits across several AI tools. The cause was
not lack of code — it was building without a feedback loop. Measured at the
start:

| Check                   | Before                                 | Now                       |
| ----------------------- | -------------------------------------- | ------------------------- |
| `npm run build`         | fails                                  | passes, 80/80 pages       |
| `npm run db:seed`       | fails                                  | exits 0                   |
| `npm run type-check`    | 686 errors                             | 0                         |
| `npm run lint`          | 180 errors, not run at build           | 0 errors, gates the build |
| Jest                    | 101 of 114 suites failing, 0% coverage | 56 tests green in CI      |
| Deployment              | never happened                         | auto-deploys on green CI  |
| Booking loop            | never completed once                   | green in CI, end to end   |
| Prod high/critical CVEs | 16 (6 direct)                          | 2 (1 direct)              |

The mechanical root cause was a seed factory that computed required fields and
never returned them. No seed data meant no working local app, which meant no
end-to-end test was possible, which meant nothing was ever verified. That is
how "MVP 86% complete" and 0% coverage coexisted for months.

---

## Status

| Phase                                            | State                                  |
| ------------------------------------------------ | -------------------------------------- |
| 0 — Ground truth                                 | Done                                   |
| 1 — Unblock and demolish                         | Done                                   |
| 2 — Foundation (`CLAUDE.md`, auth, tokens, lint) | Done                                   |
| 3 — Environments and pipeline                    | Done — `staging.uselumina.app` healthy |
| **4 — Make the booking loop work**               | **In progress**                        |
| 5 — Design system collapse                       | Not started                            |
| 6 — Brand assets + production launch             | Not started                            |
| 7 — Ratchet and expand                           | Not started                            |

### Phase 4 — the current milestone

`e2e/booking-loop.spec.ts` is the definition of done: a stranger opens a
salon's public booking page, picks a service and a time, enters their details,
books — and the appointment lands in the database against the right business,
staff member and client.

- [x] **4a** Write the failing spec; trim Playwright from 7 browser projects to 2
- [x] **4b** Availability returns real slots — 43 slots in 1.24s cold, 0.61s warm
- [x] **4c** Walk the remaining layers until the spec passes — **all four tests
      green**, and the E2E job now gates `main`
- [ ] **4d** Delete the legacy `__tests__` suite and rebuild ~30 real tests

---

## Working agreement

- **Decision rights are in `CLAUDE.md`.** The lead developer decides how the
  work is structured — pull requests, branches, debugging order, what gets
  fixed now versus recorded here. The owner decides direction, licensing, and
  anything irreversible or outward-facing.

- **One branch per PR**, named for the change. Never per phase.
- Failing test first, then make it pass.
- `type-check && lint && test:ci && build` green locally before every commit.
- Verify, then claim. Run the thing; do not infer from the code.
- Merging to `main` deploys staging automatically. `/api/health` must report
  `healthy` — a database failure returns 503 and Railway refuses to promote.

---

## Open source positioning

Lumina becomes a public repository, with self-hosting free and revenue coming
from managed hosting and support. That is a licensing and documentation change,
not just a visibility toggle, and two parts of it are blocking.

**Blocking before the repository goes public:**

- **There is no licence.** No `LICENSE` file exists and `package.json` declares
  `"license": "UNLICENSED"`. Published in that state the code is legally all
  rights reserved — nobody may use, modify or redistribute it, which is the
  opposite of the intent. Nothing else on this list matters until a licence is
  chosen and added.
- **Run a real secret scan over the full history**, with a tool built for it
  (gitleaks or trufflehog), not a grep. A manual pass found nothing dangerous —
  `.env` has never been committed and `.gitignore` covers it; the only hits are
  `sk_test_fake_key_for_testing` in `test-utils/env-setup.js` and
  `lumina_dev_password` in an old `docker-compose.yml`, both local-only
  placeholders. Confirm that with a proper tool before publishing, because
  history cannot be un-published once it is forked or indexed.
- **Rotate the Railway API token.** It was pasted in plaintext into a chat
  transcript and has not been rotated.

**The licence decision: AGPL-3.0.** Decided 2026-09-06. The requirement — free
to self-host, revenue from running it for people — is the case AGPL-3.0 exists
for: OSI-approved open source, while making it unattractive for someone else to
offer Lumina as a closed hosted service. The alternatives were permissive
(MIT/Apache-2.0, simpler and friendlier to contributors, but nothing stops a
competitor hosting it) or source-available (BSL/SSPL, which are not open source
and would contradict the positioning).

Two consequences that follow from it, and are easier to handle now than later:

- **A CLA is needed from the first external contribution onward** if selling a
  proprietary licence stays an option. Without it, every contributor holds
  copyright in their own work under AGPL, and relicensing later means tracking
  down each of them individually. Adding a CLA on day one costs a bot and a
  file; retrofitting one can be impossible.
- **AGPL's obligations reach across the network.** Anyone running a modified
  Lumina as a service must offer their users the modified source. That is the
  point, and it also applies to us: our own deployment is unmodified upstream,
  so the obligation is satisfied by the public repository, but that stops being
  true the moment staging or production carries a patch that is not pushed.

Adding the `LICENSE` file and the matching `package.json` field is its own
change — the licence text is a legal document, and it should be reviewable on
its own rather than buried in a documentation diff.

**Documentation to follow the decision:** a `LICENSE` file and a matching
`package.json` field; a README that leads with what Lumina is and how to run it
yourself rather than with internal rebuild status; self-hosting instructions
(`docs/environments.md` currently documents _our_ Railway staging, not a
stranger's deployment); a CONTRIBUTING file; and a clear statement of what is
free and what is paid, so the boundary is not something people have to infer.

Sequence it with Phase 6, alongside brand assets and the production launch —
the repository going public and the project page describing it are the same
announcement.

## Dependency policy

Two triggers, and only two:

1. **A CVE affecting production.** Pull it forward immediately, whatever phase
   we are in. The number that matters is prod high/critical CVEs — 16 at the
   start, 2 now (1 direct) — not whether a newer version exists.
2. **Phase 7**, where a full review happens deliberately: majors surveyed,
   upgraded in small reviewable PRs, each verified by the five gates.

Everything else waits. A version bump has no observable outcome — the booking
loop cannot tell you it worked — so it is precisely the kind of work that
consumed this project the first time while nothing shipped. `next@16` is
already parked on these grounds.

**Do not upgrade to a release candidate.** The Prisma CLI currently advertises
`8.0.0-rc.13` from `5.22.0` in its update banner. That is a pre-release across
three majors, and taking it mid-rebuild trades a working stack for an
unsupported one. Revisit when 8.x is stable, in Phase 7.

## Tooling: when to add plugins

Three plugins are available and none are enabled. Deliberately — capability
arriving ahead of the work it serves is how this project accumulated 335
documents.

| Plugin        | When                        | Why                                                                                                                                                                                                                                                 |
| ------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `design`      | **Phase 5**                 | `/design:ux-copy` for empty states, errors and confirmation copy; `/design:critique` on the booking flow once it works. Skip `/design:handoff` (needs Figma files we don't have) and `/design:research-synthesis` (needs research we haven't done). |
| `brand-voice` | **Phase 6**, if needed      | Only for the voice-and-tone section of the brand guide — the one part not generated from `lib/design/tokens.ts`.                                                                                                                                    |
| `marketing`   | **After production launch** | SEO, campaigns and competitor analysis all presume customers and content. Neither exists yet.                                                                                                                                                       |

**The rule that makes these safe:** any audit output must become a test or a
lint rule, never a document. `/design:accessibility` produces a _report_; our
contrast check produces a _gate_ that fails CI. Reports were what the 29
archived design-system documents each were, at the time. Run an audit once for
discovery, then encode every finding — or it will rot the same way.

## Parked, not forgotten

Deferred deliberately. Each returns with its own end-to-end spec, one at a
time, after the booking loop works.

- Client CRM, staff management, analytics dashboards
- Stripe payments and POS
- Prisma models with no active code path — roughly 20 of the 53 in
  `schema.prisma`. Tables still exist, nothing is lost. **There is no `PARKED`
  marker**, despite this document and `CLAUDE.md` both having claimed one:
  check for a repository, service or route that reads a model before building
  on it. A marker, or a test asserting no application code imports a parked
  model, would make the rule real — worth doing when the models are next
  touched
- Playwright browser projects beyond Chromium and Mobile Safari
- Raising lint rules from `warn` to `error` as their counts reach zero:
  **56** routes importing Prisma directly, **167** raw hex colours in `.tsx`

## Known, unaddressed

- `npm run test:e2e` needs `DATABASE_URL` exported; it does not read `.env`.
  CI supplies it as a job variable so the gate is unaffected, but a fresh clone
  with a working `.env` cannot run the spec without setting it by hand. Same
  root cause as the seed-reset bug: a process that instantiates Prisma directly
  gets no `.env`, because only the Prisma and Next CLIs load it.

- ~~**Availability times are timezone-wrong.**~~ **Fixed** in
  `fix/availability-business-timezone`. The API emitted naive local times
  tagged as UTC — a salon open 09:00 Los Angeles returned
  `2026-09-14T09:00:00.000Z` — so a 9-to-6 salon showed 4:00 AM slots to a
  UTC-3 visitor and asking for Wednesday returned Tuesday's slots.

  `AvailabilityCalculator` now resolves the timezone from the business row
  itself rather than trusting a caller to pass one, and computes with
  `TimeZoneHandler.localToUTC`. Fixed alongside it: the booking page sent
  `toISOString()` of a browser-local midnight and rendered slots with no
  `timeZone`; `book/route.ts` formatted confirmation emails and staff
  notifications with the server's clock; `alternative-slots-service.ts` had the
  same `setHours` defect in the fallback path.

  The gate is `__tests__/lib/services/availability-calculator-timezone.test.ts`
  in `test:ci`, asserting absolute instants so it fails in UTC too — a test
  that only failed under `TZ=America/Halifax` would gate nothing on a UTC
  runner. `playwright.config.ts` now runs three distinct zones: salon in Los
  Angeles, server in Halifax (`webServer.env.TZ`), browser in Sydney
  (`timezoneId`). Both halves are needed; `timezoneId` alone moves only the
  browser while every conversion at issue happens in Node.

  **What the fix actually taught.** The availability calculator and the
  conflict engine that re-validates its output were wrong in the same
  direction, so they agreed, and the bug hid in the agreement — fixing one and
  not the other turned a wrong answer into no answer at all, and the public
  endpoint returned zero slots for a day the salon was open. Both now share
  `lib/services/business-time.ts`, which holds the only conversions between a
  salon's wall clock and an instant. Two more silent failures surfaced the same
  way, both fixed: `AvailabilityCache` is a Postgres table whose key had no
  timezone, so every row computed by the old code would have kept being served
  after deploy; and `getAvailableStaff` filtered on a relation named
  `staffServices` where the schema declares `services`, so Prisma rejected the
  query and the surrounding catch turned that into an empty staff list.

  `timezone-aware-availability.ts` is still to be deleted — dead, wrapping the
  broken calculator rather than replacing it, 13 of its 19 tests failing, and
  its `getBusinessTimeZone` a stub returning a hardcoded `'America/New_York'`.
  Its own PR, per 4d.

- **An appointment outside business hours is invisible on the calendar.**
  `components/appointments/week-view.tsx:95-108` bounds the grid to the
  earliest `openTime` and latest `closeTime` across the week, so anything
  before opening or after closing has nowhere to render. Found on staging: a
  booking taken at 8:30 for a salon opening at 09:00 confirmed successfully,
  holds a real slot, and does not appear on the owner's calendar.

  The timezone bug is what puts appointments there, so fixing that removes the
  common cause — but not the class. A manually created appointment, a
  rescheduled one, or an owner shortening their hours after a booking all
  reproduce it, and in every case the salon silently loses sight of a client
  who will still turn up. The grid should span business hours _union the
  appointments actually present_, and say so when it extends.

- **Business metrics should bucket by the salon's day, not UTC.**
  `business-metrics-tracker.ts` bucketed by the _server's_ day, so two hosts in
  different zones wrote two rows for the same date and neither could find the
  other's — the upsert key is (businessId, date, type). Pinned to UTC in
  `fix/availability-business-timezone`, because production runs in UTC and every
  row already written uses UTC midnight, so that keeps them all reachable. But
  UTC is not what a salon owner means by "Tuesday's bookings", and the
  peak-hours histogram is a chart of the wrong hours. Bucketing by business
  timezone changes what the numbers mean and needs a migration for the existing
  rows; it belongs with the analytics work, not behind a bug fix.

  Worth noting how it was found: `npm run test:ci` was **red on `main`** for
  anyone outside UTC, and had been. CI never saw it. The three-zone Playwright
  config now closes that hole for the booking path; nothing yet closes it for
  the rest of the suite.

- **`npm run test:visual` has never run.** `e2e/visual-test.config.ts:105`
  resolves `./e2e/global-setup` from inside `e2e/`, so Playwright cannot load
  the config at all, and `tsc -p tsconfig.test.json` reports two further errors
  in the same file (an invalid `fontFamily` option and a duplicate key). Five
  npm scripts point at it — `test:visual`, `:ui`, `:update`, `:headed` and
  `:setup`. Either fix it or delete the visual-regression setup; leaving five
  scripts that cannot start is worse than either.

- **`npm run format:check` fails on 772 files**, so the `ci:lint` script in
  `package.json` would fail if anyone ran it. CI runs `lint` rather than
  `ci:lint`, so nothing is currently broken — but a contributor following the
  script names hits it immediately. Either format the repo once and add
  `format:check` to CI, or drop it from `ci:lint`.

- **Merging two pull requests within seconds of each other skips a deploy.**
  The CI workflow sets `cancel-in-progress: true` on a concurrency group keyed
  by ref, so a second merge cancels the first merge's run — and Railway reads a
  cancelled check suite as failed and skips that deployment
  (`skippedReason: "CI check suite failed"`). Observed on 2026-09-06 with #108
  and #109: harmless there because the second commit contained the first's
  code, but merging in the other order would have skipped the deploy of the
  code that mattered, with no failure anywhere to notice. Space merges out, or
  wait for each to go green.

- **What a first `knip` run found**, recorded as input to 4d rather than as a
  task in itself. 112 unused files, 10 unused dependencies and 8 unused
  devDependencies, 25 unlisted dependencies, 363 unused exports — and, most
  usefully, **13 unresolved imports**: test files importing modules that do not
  exist (`lib/daily-status-blocker-tracker`, `lib/documentation-audit`,
  `@/components/appointments/appointment-dashboard`,
  `@/test-utils/appointment-mocks`, `@/lib/services/booking-api`,
  `@/lib/framework-integration`). Those suites cannot pass under any
  circumstances. `__tests__/agent-hooks/` is the same category: tests for the
  previous era's process tooling, not for this application.

  Treat the output as candidates, not a delete list — it flags `public/sw.js`
  (a service worker, loaded at runtime), the `app/design-tokens/*.css` files
  (reachable via CSS `@import`, which knip does not trace), and `husky` and
  `lint-staged` (which it simultaneously reports as used by the pre-commit
  hook). Verify against the gates, in small batches.

- **Availability re-validates every slot two or three times over.** Measured:
  one request issued **1,318 database queries**, reading the day's opening
  hours 180 times. The calculator checks each slot it generates through the
  conflict engine; the real-time service then re-checks each survivor through
  `CalendarIntegration`, which calls the calculator again. Each layer keeps its
  own copy of the same queries.

  `schedule-cache.ts` brought that to **391 queries / 312ms**, which is enough:
  the booking page aborts its own request after 8 seconds
  (`use-network-resilience.ts:174`), and it was exceeding that on CI while
  returning correct answers. But memoising reads treats the symptom. Removing a
  validation layer is the fix, and it is not a tidy-up — it touches the booking
  write path, so it wants its own PR, its own failing test, and this
  measurement to check itself against. `Appointment.findMany` is still issued
  per slot and is the largest remaining item.

- **The booking write re-checks conflicts outside its transaction.**
  `book/route.ts:297` queries for conflicting appointments, then opens a
  transaction at `:442` to create the appointment. Two clients booking the same
  slot at the same time can both pass the check before either writes. Not
  reachable by the e2e spec, which books alone; the fix is either to move the
  check inside the transaction or to add a unique constraint on (staffId,
  startTime) and handle the violation. Worth doing before real customers, not
  before the loop works.

- **Railway had stopped reading `railway.json`.** The service's
  `railwayConfigFile` was null and every setting it supplied had reverted to
  defaults — no `healthcheckPath`, no `preDeployCommand`, `RAILPACK` instead of
  `NIXPACKS`. So the guarantee `deploy.yml` documents ("Railway aborts the
  release if the pre-deploy command fails, so new code can never go live
  against an un-migrated schema") was not true. Restored to `/railway.json`
  with its six settings on 2026-09-06.

  Cause: a `railway config` run created `.railway/railway.ts` and switched the
  service to Infrastructure-as-Code, but that file was never committed and its
  `builder` and `preDeployCommand` are commented out. **Config as Code stops
  working 2026-12-01** — migrating to `.railway/railway.ts` properly, which
  needs the `railway` package as a devDependency, is Phase 7 work with a real
  deadline.

  Separately: a deploy is skipped, not failed, when CI is red — `skippedReason:
"CI check suite failed"`. Staging silently ran week-old code. Worth knowing
  that a red `main` is invisible from the staging URL.

- **`npm run test:e2e` cannot pass — two spec files fail to load at all.**
  `cross-browser-responsive.spec.ts:21` and `public-booking-e2e.spec.ts:174`
  call `test.use({ browserName })` inside a `test.describe`, which Playwright
  rejects before running anything. So the documented five-gate command is
  currently unrunnable as a whole, and the working measure is the four
  collectable specs. Of those, 23 of 40 fail identically on `main` — legacy
  suites from the deleted-tests era, in `appointment-management.spec.ts` and
  friends. Part of 4d.

- The Clients page's staff filter matches `Client.preferredStaff`
  (`app/api/clients/route.ts:108`), not the staff a client has actually
  booked with. A client who books through the public page never has that
  field set, so filtering by the staff member they just booked with is
  guaranteed to hide them. Found on staging looking for a real booking.
  Belongs with client CRM when that is unparked; the query wants to go
  through `appointments.some({ staffId })`.

- The booking page opens on today and offers no way forward when the salon is
  closed that day. A visitor arriving on a Sunday sees an empty slot list and
  must guess to advance the calendar, even though the availability API already
  returns `nextAvailableDate` in the same response. Honour it — land on the
  next open day, and say so. Found because the e2e spec hit the same dead end.

- **Prisma is bundled into the browser on the booking page.**
  `components/booking/staff-time-selection.tsx` is a `'use client'` component
  and imports `AlternativeSlotsService` (line 15), which imports
  `@/lib/prisma` at module scope. Every run of the e2e suite logs
  `PrismaClient is unable to run in this browser environment`, caught and
  swallowed — so the "here are some other times" feature has never worked, and
  the failure is invisible to anyone not reading the console. Ships the Prisma
  client into the page bundle as well. Move the call behind an API route.

- The landing page links to `/book/demo` (`app/page.tsx`), which 404s. The route
  resolves a business by cuid, not by slug or any friendly name, so no static
  href can work. Either give `Business` a public booking slug and resolve on it,
  or drop the link. Phase 5, with the marketing page.

- The public booking page now hides services no active staff can perform. A
  salon whose only nail technician leaves will see nail services disappear from
  their booking page with no notice. Better than the dead end it replaces — the
  service was listed, selectable, and unbookable — but the owner should be told.
  Belongs with staff management, when that is unparked.

- `app/api/booking/*` duplicates the public booking API. `/api/booking/[id]` is
  **live** (it serves the booking confirmation page); the rest is dead, and
  `components/booking/offline-support.tsx` fetches an endpoint that does not
  exist. Clean up with the Phase 4d rebuild.
- `components/booking/booking-confirmation.tsx`, `public-booking-interface.tsx`
  and `simple-booking-layout.tsx` are now unreferenced by the live flow — step 4
  uses `booking-confirmation-step.tsx`. Delete them in 4d, after confirming no
  importers remain.
- The client form's `<Input>` sets `aria-label` from its placeholder, which
  overrides the visible `<Label>`. Screen-reader users hear "Enter your email
  address" where the label says "Email Address". Fix with the Phase 5 primitive
  rebuild.
- "Confirm Booking" renders white text on the coral/gold gradient — 2.57:1,
  already listed in `prohibitedPairs` in `lib/design/tokens.ts`. The contrast
  test covers tokens, not rendered components; Phase 5.
- `optimized-booking-interface.tsx` is the **live** booking UI.
  `public-booking-interface.tsx` and `simple-booking-layout.tsx` have zero
  importers. An earlier demolition list had this backwards — do not delete the
  wrong one.
- `next` carries advisories that need `next@16`, a major upgrade not
  appropriate mid-rebuild.
- Before real customers: `/api/gdpr/export` and `/delete` are untested while
  handling PII, and there is no privacy policy or terms.
- Tenant isolation has no test coverage. 67 API routes reference `businessId`;
  33 verify membership. Some of the gap is legitimate (public booking routes
  take a businessId by design), but this is the highest-value security work
  outstanding — schedule it with the Phase 4d rebuild.
