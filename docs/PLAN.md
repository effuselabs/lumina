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
| Jest                    | 101 of 114 suites failing, 0% coverage | 495 tests green in CI     |
| Deployment              | never happened                         | auto-deploys on green CI  |
| Booking loop            | never completed once                   | green in CI, end to end   |
| Prod high/critical CVEs | 16 (6 direct)                          | 0, gated daily and per PR |

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
| 4 — Make the booking loop work                   | Done                                   |
| **5 — Design system collapse**                   | **Next**                               |
| 6 — Brand assets + production launch             | Not started                            |
| 7 — Ratchet and expand                           | Not started                            |

### Phase 4 — done

`e2e/booking-loop.spec.ts` is the definition of done: a stranger opens a
salon's public booking page, picks a service and a time, enters their details,
books — and the appointment lands in the database against the right business,
staff member and client.

- [x] **4a** Write the failing spec; trim Playwright from 7 browser projects to 2
- [x] **4b** Availability returns real slots — 43 slots in 1.24s cold, 0.61s warm
- [x] **4c** Walk the remaining layers until the spec passes — **all four tests
      green**, and the E2E job now gates `main`
- [x] **4d.1** Delete the legacy suite — 133 files, and the whole of Jest is
      the gate again: **32 suites, 427 tests, green in 7.7s**, down from 117 of
      159 suites failing
- [x] **4d.2** Make the E2E suite runnable — legacy specs deleted, the suite
      collects and passes for the first time: **18 tests, 22s**, and CI runs
      `npm run test:e2e` rather than one named file
- [x] **4d.3** Rebuild the missing tests, starting with tenant isolation —
      **495 tests, 35 suites**, and tenant isolation went from untested to
      enforced by a gate that fails the build for any new unguarded route

### Phase 5 — the demolition is done; the collapse is next

Deleting 133 test files removed the only importer many components had, and
what that exposed was larger than the phase originally assumed: 85 of 187
components rendered nowhere. Five batches later:

|                                   | Before 4d                             | After the sweep |
| --------------------------------- | ------------------------------------- | --------------- |
| Unused files                      | 112 reported, 181 once the tests went | **0**           |
| `components/`                     | 187 files                             | **106**         |
| `components/ui` primitives        | 57                                    | 37              |
| Lines removed across five batches | —                                     | **~49,000**     |

Nothing reported unused now. The eleven that knip still flagged were all
legitimate — the Railway IaC file, `public/sw.js` registered at runtime by
`offline-support.tsx`, and the resolver script itself — so `knip.json` records
them as entry points rather than leaving a report everyone learns to ignore.

**What the sweep taught, kept because the next sweep will need it.** Grep is
not a dependency graph: matching importers by basename made
`lib/availability/availability-calculator` look alive because a different
directory holds a file of the same name, and matching only same-directory
relative imports missed `../lib/theme-validation`. Both are now handled by
`scripts/maintenance/find-importers.js`, which resolves specifiers to files.
It still is not the authority — knip proposes, the script narrows, the five
gates decide, and `npm run db:seed` runs by hand on anything near
`prisma/factories`.

**Next, in order:**

1. ~~**28 unused dependencies**~~ **Done** — 26 removed, 120 packages out of
   `node_modules`. `husky` and `railway` are recorded in `knip.json` as used,
   and `glob` is gone from `scripts/migrate-calendar-data.ts` rather than
   declared. knip now reports no unused dependencies, unlisted dependencies or
   files.
2. ~~**Next.js 15.5.24**~~ **Done** — on 15.5.26 and React 19, and
   `npm audit` reports nothing, dev dependencies included. Taken ahead of the
   collapse because it was a security fix under the dependency policy's first
   trigger, and because the collapse rewrites the same components React 19
   touches. `.github/workflows/dependency-audit.yml` now fails any pull
   request, and a daily run, on a high or critical production advisory.
3. **The collapse itself**, against 37 primitives instead of 57 and a
   component tree that is entirely reachable.
   - [x] **3a — every colour in a `.tsx` comes from `lib/design/tokens.ts`.**
         162 raw hex across 23 files (224 across 31 before the sweep deleted
         the rest), now **0**, and the lint rule is an **error** that
         matches hex anywhere in a string — the old form saw 93 of the 162.
         Done at identical values: 9 of 11 pages pixel-identical before and
         after, the analytics chart within its run-to-run noise, and the
         design-system page changed only where it had been wrong (below).
   - [ ] **3b — reconcile the second palette.** Its values sit in
         `tokens.legacy` — `#808285` against `neutral[600]` `#525252`,
         `#22C58B` against `status.success`, and so on — copied into
         components from `app/design-tokens/colors.css`. That file turned out
         never to have been loaded (see 3e), so this is now purely a question
         of which value each component should show. Choosing changes what
         people see, so it goes page by page with screenshots.
   - [x] **3c — `status` colours meet AA as text.** success `#15803D` and
         warning `#B45309` (both 5.02:1 on white, and white on them), were
         3.30 and 3.19. `status.info` is now `#2563EB`, what `text-info`
         actually rendered — `tokens.ts` said `#0284C7` while the CSS said
         otherwise, and `__tests__/design/css-token-parity.test.ts` now fails
         if `globals.css` and `tokens.ts` disagree. Every status colour is in
         `contrastPairs`, both ways round. Screenshots: only status-coloured
         text changed (the home page's trend lines, analytics, the
         design-system swatches).
   - [ ] **3c′ — brand gold as text.** `.text-lumina-primary` in
         `globals.css` renders gold, 1.44:1 on white, and 51 elements use it:
         service titles, client and staff dialogs, analytics. It changes how
         the brand colour is used, so it is Jeremy's call — see the decision
         raised on 2026-09-29.
   - [x] **3d — the Button's injected stylesheet is gone**, and the
         variants carry what it had been papering over. Primary text is deep
         teal on the gradient (5.81:1 at the coral end, where white was 2.57:1)
         — "Confirm Booking" included, and four call sites that set white text
         themselves. Outline borders are full `foreground` (its `/30` was about
         1.9:1, under the 3:1 UI minimum); links are deep teal, gold in dark.
         `__tests__/design/gradient-text.test.ts` fails on white text on the
         gradient anywhere in `app/` or `components/`.
     - It also found that `dark:` utilities followed the OS, not the theme.
       Tailwind defaulted to `darkMode: 'media'` while the app is light-only
       by design, so a dark-OS visitor got dark styles on the light page — the
       booking page's search box turned black. It is `class` now; the same
       page went from 76,570 px different between OS settings to 0.

   - [x] **3e — hex outside `.tsx`.** No stylesheet, config or `.ts`
         under the lint gate writes a colour of its own; `tokens.ts` is the
         one place a value lives.
     - `app/design-tokens/` is gone: ten CSS files, 2,210 lines, that
       nothing imported. `knip.json` had ignored it on the belief that it
       was reached through `@import`, which is why no report flagged it.
     - `.ts`: the email templates and every other module import tokens, and
       the hex lint rule covers `.ts`. All 60 email renders hashed the same.
       `lib/theme-accessibility.ts` had its own drifted palette and now
       grades what renders, which surfaced 3f.
     - `tailwind.config.ts`: a dead safelist (87 rules, 11 KB, for the
       Button override 3d removed) is gone and its 67 tint steps live in
       `tokens.scales`; the CSS was byte-identical after the move.
     - CSS: `app/tokens.css` is generated from `tokens.ts`
       (`npm run tokens:css`), and `globals.css` and `booking-mobile.css`
       refer to its properties. `__tests__/design/tokens-css.test.ts` fails
       if the file is stale or either stylesheet gains a hex. Every existing
       custom property resolved the same on six pages, light and `.dark`, and
       every element's computed colours matched.
     - Left: `prisma/seed.ts` (1), outside `next lint`'s directories.
   - [ ] **3f — dark mode does not work, and would fail AA if it did.**
     - The `.dark` overrides never apply. `:root` in `globals.css` is
       unlayered and `.dark` sits in `@layer base`; the theme switcher puts
       `dark` on `<html>`, the element `:root` matches, and unlayered
       declarations beat layered ones whatever their specificity. Measured:
       with `.dark` on `<html>`, `--color-background` stays `#ffffff`.
     - Dark mode reuses the light `--semantic-*` values, which on the dark
       surface `#171717` reach 3.47–3.71:1 (info lowest).
     - The app is light-only by design (see 3d), so the question is whether
       to fix dark mode or delete it — a product call, not a refactor.
   - [ ] **3g — `--lumina-peach` has never been defined.** `bg-lumina-peach`
         and three other references resolve to nothing, so those elements
         have no fill. Defining it paints them for the first time, so it goes
         with screenshots.
4. [x] **Unused exports** — 334 exports and 237 exported types by `knip`,
       taken a directory at a time.
   - `lib/email/` (166): done. Its barrel `index.ts` re-exported everything
     and had one consumer, which now imports `notification-service` directly;
     with the barrel gone, `business-branding.ts`, `retry-logic.ts` and
     `template-repository.ts` (965 lines) had no importer at all and
     were deleted. The rest lost only an `export` keyword.
   - `prisma/factories/` (59): done, 1,458 lines. Five of the six validator
     classes (`BusinessLogicValidator` and the four it composed) were reached
     only through the barrel, as were two seeding helpers and 21 interfaces;
     `DataIntegrityValidator`, which `data-reset-manager` uses, stays. The
     seed runs as before.
   - `lib/security/` (47): done, 408 lines. Read before deleting, because
     an unused security module can mean an unapplied protection. None was:
     the public booking POST requires CSRF, rate-limits and checks for abuse
     through `securePublicBookingPOST`; security headers come from
     `next.config.js` (live on staging), so `generateSecurityHeaders` was a
     second copy; the GDPR helpers were aliases of the service methods the
     routes call. `DataProtectionService.encrypt` is never called — no field
     is encrypted at the application level — but nothing claims otherwise.
   - `components/ui/` (46): done, 216 lines. Six components and props
     types nothing rendered are deleted (`FilterChips`, `LoadingTable`,
     `LoadingList`, `ThemeIndicator`, `ThemeStatus`, …); the rest lose an
     `export`. The shadcn/Radix wrappers (`alert-dialog`, `dialog`,
     `dropdown-menu`, `select`, `table`) keep their full surface —
     `DialogClose` or `SelectGroup` unused today is a vendored kit, not dead
     code — and `knip.json` says so through `ignoreIssues`.
   - `types/` (about 70): done, 675 lines net — 66 type declarations
     nothing referenced. Type-only, so type-check is the whole proof.
   - `lib/validations/` (24): done — 16 schemas and request types nothing
     parsed with. `lib/auth/public-routes.ts` keeps its route lists, now
     unexported: `middleware.ts` reaches them through `isPublicRoute`.
   - `lib/auth.ts` (15) is held back, deliberately. knip is right that
     nothing calls `requireBusinessAccess` — and `CLAUDE.md` names it as the
     page-level tenant check. Every one of the 13 `/dashboard/[businessSlug]`
     pages hand-writes that check instead (a `users where userId` include and
     a redirect). All 13 do check, so there is no gap today, but it is the
     same five-ways-hand-rolled pattern that left 30 API routes unchecked.
     The fix is for the pages to call `requireBusinessAccess` and for a test
     to hold them to it, as `tenant-isolation.test.ts` does for routes —
     not to delete the helper the rule points at.
   - The remainder (components, hooks, monitoring, performance, theme,
     utils, errors, services): done — 85 declarations nothing referenced,
     among them `lib/theme-utils.ts`'s own theme engine (the switcher uses
     `hooks/use-theme-switcher.ts`), six unused formatters in `lib/utils.ts`
     and two error classes nothing threw. New unused locals were checked
     against a baseline from `main`: only the seven orphaned imports were
     new, and they are removed.
   - Closed with `knip.json` `ignoreIssues` entries, each for a reason that
     is not "dead": the vendored shadcn/Radix kit; `lib/design/tokens.ts`,
     the design system's surface; and payments (`lib/stripe.ts`,
     `lib/financial/`, `components/payments/`), which is **parked**, not
     unused. The server side is live — payment intents, refunds and the
     webhook — while `POSInterface`, `TransactionHistory` and `PaymentForm`
     (1,281 lines) are built but wired to nothing, behind "Coming Soon" POS,
     transactions and reports pages. Deleting parked feature work is a
     product decision; it returns with its own spec (see _Parked_).
   - knip now reports exactly one thing: `lib/auth.ts`, deliberately not
     silenced. It clears when the dashboard pages adopt
     `requireBusinessAccess` — the next item.

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

**Done.** The repository is public at `github.com/effuselabs/lumina` under
AGPL-3.0, self-hosting free, revenue intended from managed hosting and support.

The licence decision, made 2026-09-06: the requirement — free to self-host,
revenue from running it for people — is the case AGPL-3.0 exists for. It is
OSI-approved open source while making it unattractive for someone else to offer
Lumina as a closed hosted service. The alternatives were permissive
(MIT/Apache-2.0, friendlier to contributors, but nothing stops a competitor
hosting it) or source-available (BSL/SSPL, which are not open source and would
contradict the positioning).

Everything that blocked publication is closed: `LICENSE` and the matching
`package.json` field (`AGPL-3.0-only`), a gitleaks scan over the full history
running as a CI workflow, the Railway token rotated, `CONTRIBUTING.md`, and a
README that leads with what Lumina is rather than with rebuild status.

The history rewrite deserves recording, because the obvious approach does not
work. A Kiro MCP configuration containing an API key was found in the history.
Rewriting with `git filter-repo` and force-pushing is **not sufficient**:
GitHub keeps the original commits of every pull request at `refs/pull/N/head`
indefinitely, and they stay reachable by SHA. The repository was rebuilt from
scratch under the `effuselabs` organisation and the original archived, which is
why the history starts where it does. The key was revoked regardless.

**Still open, and worth doing before the first outside contribution:**

- **A CLA**, if selling a proprietary licence is ever to stay an option.
  Without one, every contributor holds copyright in their own work under AGPL,
  and relicensing later means tracking each of them down individually. Adding
  one on day one costs a bot and a file; retrofitting it can be impossible.
- **Self-hosting instructions.** `docs/environments.md` documents _our_ Railway
  staging, not a stranger's deployment. Registration is closed by default now
  (`ALLOW_PUBLIC_SIGNUP`), with a first-account bootstrap so a fresh install is
  usable — that behaviour needs writing down where a self-hoster will find it.
- **A statement of what is free and what is paid**, so the boundary is not
  something people have to infer.
- An organisation profile README for `effuselabs`.

**AGPL's obligations reach across the network**, and that applies to us: our
own deployment is unmodified upstream, so the obligation is satisfied by the
public repository — but that stops being true the moment staging or production
carries a patch that is not pushed.

## Dependency policy

Two triggers, and only two:

1. **A CVE affecting production.** Pull it forward immediately, whatever phase
   we are in. The number that matters is prod high/critical CVEs — 16 at the
   start, 2 now (1 direct) — not whether a newer version exists.
2. **Phase 7**, where a full review happens deliberately: majors surveyed,
   upgraded in small reviewable PRs, each verified by the five gates.

Everything else waits. A version bump has no observable outcome — the booking
loop cannot tell you it worked — so it is precisely the kind of work that
consumed this project the first time while nothing shipped.

`next@16` was parked on these grounds, and that stopped being the right call
once two criticals landed with no 14.x patch; the upgrade went to 15.5.26, the
smallest line that fixed them. The lesson is in the first trigger's wording —
the count that matters is the one `npm audit --omit=dev` prints _today_. It
drifted from 2 to 5 high/critical between 2026-09-06 and 2026-09-29 without
any change on our side, and nothing noticed, so the trigger is now a workflow
rather than a sentence. `next@16` itself remains Phase 7 work.

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
  **43** of 63 routes importing Prisma directly (was 56; fifteen dead routes
  were deleted in 4d). Raw hex in `.tsx` reached zero and is an error.

## Known, unaddressed

- **`npm run lint` does not reach `hooks/`, `prisma/`, or root config.**
  `next lint` checks `app/`, `components/`, `lib/`, `pages/` and `src/` unless
  `eslint.dirs` says otherwise, so a rule can be at zero in the gate while
  `hooks/use-theme-switcher.ts` and `prisma/factories/` carry errors
  `npx eslint .` reports. Widening the gate means fixing those first.

- ~~**The booking loop spec fails about one local run in twenty.**~~
  **Fixed.** This entry said it failed "rather than a slow render", and that
  was wrong: the failure context shows step 1 still on its `<Suspense>`
  fallback ("Loading Services", 4s elapsed) when the heading assertion's
  default 5s ran out. Steps 2–4 already waited `STEP_TRANSITION_TIMEOUT` for
  exactly this — a lazy chunk the dev server compiles on first request — and
  step 1 had been missed. Under load it was far worse than one in twenty:
  `--repeat-each=3` at two workers failed two runs in three on `main`. With
  the step timeout, and one worker as CI runs it, `--repeat-each=5` is 20 of 20.

  Still true at two workers, and worth knowing before reading a local run:
  two copies of the _same_ project (which `--repeat-each` creates and a normal
  run does not) book the same day's first slot and can hold availability past
  15s while the dev server compiles for the other. Two projects book different
  days (`projectDayOffset`), so the suite as configured does not do this.

- ~~**The booking test can pick a service nobody is rostered to perform that
  day.**~~ **Fixed.** It clicked the first service card; about 4% of seeded
  services have nobody working on a given weekday, and which card is first is
  stable for a seed, so it failed on every retry. The spec now resolves the
  date first and books a service with staff rostered that weekday, through
  the same helper the availability test uses. The card is found by its
  accessible name, `Add Service: <name>` — every card's button used to read
  just "Add Service", which is the same defect for a screen-reader user as for
  the test, so fixing the name fixed both. The remove button in the selected
  list had no accessible name at all and now has one.

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

  `timezone-aware-availability.ts` is gone, along with the test that was its
  last remaining reference — dead, wrapping the broken calculator rather than
  replacing it, 13 of its 19 tests failing, and its `getBusinessTimeZone` a
  stub returning a hardcoded `'America/New_York'`.

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

- ~~**`npm run test:visual` has never run.**~~ **Deleted.** The config could
  not load — it resolved `./e2e/global-setup` from inside `e2e/` — and carried
  two further type errors. Five npm scripts pointed at it. Visual regression
  needs a design system to regress against, so it comes back in Phase 5, built
  against `lib/design/tokens.ts` rather than restored.

- ~~**`npm run format:check` fails on 772 files.**~~ **Resolved.** The
  repository was formatted in one pass and `format:check` is a CI gate, so it
  cannot drift back.

- **The manual staging deploy reported success against the old deployment.**
  `deploy.yml`'s wait step accepted the first `healthy` response, and the
  running deployment is healthy by definition. On 2026-09-29, during a Railway
  incident ("API degradation causing slow or stuck deployments", from 15:29
  UTC), Railway created no deployment for #26's merge and the manual
  `railway up` was never promoted — and the job went green 0.4s after
  uploading, while staging still served the previous commit. The step now
  requires a process younger than the deploy. The wider lesson: a green deploy
  job is not a deploy; `/api/health`'s `commit` and `uptime` are what say what
  is live.

- **No `Strict-Transport-Security` or `Content-Security-Policy` header.**
  `next.config.js` sets `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy` and `Permissions-Policy`, and staging serves them; it sets
  neither HSTS nor a CSP. Worth adding before production (Phase 6) — a CSP in
  report-only mode first, since inline styles are in use.

- **`npm run db:seed` is not idempotent.** Each run appends another copy of
  the catalogue: after six runs a local database held 264 services, each
  name six times, and the booking e2e failed because it needs a uniquely
  named service. CI is unaffected — it seeds an empty database — but anyone
  following `CLAUDE.md`'s `npm run db:migrate && npm run db:seed` twice gets
  a database the e2e cannot book against. `npx prisma migrate reset --force`
  recovers. The fix is for the seed to clear the demo business's rows first
  (`cleanExistingSeedData` once existed for this, but nothing ever called it).

- **Railway's native deploy can lag CI by a quarter of an hour.** After #32
  merged, main CI finished at 20:28 and the deployment went live at 20:42 —
  #30 and #31 had taken 8–9 minutes, #33 about 7. At 20:43 a manual
  `deploy.yml` run was dispatched as if the deploy had been skipped, and
  duplicated one that had gone live a minute earlier; its upload then
  replaced the native deployment with the same code under commit `unknown`.
  Wait about 20 minutes after CI before treating a deploy as stuck, and check
  Railway's deployment list rather than inferring from `/api/health` alone.

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
  (believed reachable via CSS `@import` — wrong, as it turned out: nothing
  imported them, knip had been right, and they were deleted in 3e), and
  `husky` and
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

- ~~**Railway had stopped reading `railway.json`.**~~ **Resolved**, and the
  service has since migrated to Infrastructure as Code entirely. The service's
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

- ~~**`npm run test:e2e` cannot pass — two spec files fail to load at all.**~~
  **Resolved in 4d.2.** `cross-browser-responsive.spec.ts` and
  `public-booking-e2e.spec.ts` called `test.use({ browserName })` inside a
  `test.describe`, which Playwright rejects at collection — so the command
  could not start, whatever you passed it. They and the rest of the
  deleted-tests-era specs are gone; three remain, and all 18 tests pass in 22s
  across both browser projects. CI runs the suite rather than one named file.

  One real defect surfaced on the way: `health-check.spec.ts` asserted
  `checks.memory === 'healthy'`, but the route downgrades to `'warning'` above
  a 512MB heap and still returns 200 by design. The test passed alone and
  failed inside the full suite — an assertion on how busy the machine was.

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
- ~~"Confirm Booking" renders white text on the coral/gold gradient.~~
  **Fixed** in 3d, and gated by a test that reads the components, not only
  the tokens.
- ~~**Sign-in reports a database outage as a wrong password.**~~ **Fixed.**
  `authorize` caught every error, returned `null`, and logged nothing, so a
  stopped database read as "Invalid email or password". It now lives in
  `lib/auth/authorize-credentials.ts`: `null` only for malformed input, an
  unknown email or a wrong password; anything else is logged and thrown as a
  `CredentialsSignin` with `code: 'service_unavailable'`, which the form shows
  as an outage. Checked against a real server with Postgres stopped.
- `optimized-booking-interface.tsx` is the **live** booking UI.
  `public-booking-interface.tsx` and `simple-booking-layout.tsx` have zero
  importers. An earlier demolition list had this backwards — do not delete the
  wrong one.
- ~~**`next@14.2.35` carried 23 advisories, two of them critical RCE, with
  no 14.x patch.**~~ **Fixed** by the upgrade to 15.5.26. GHSA-2xp9-vwfh-vxw4
  (Image Optimization API, AVIF) had reached us: `/_next/image` is excluded
  from auth in `middleware.ts` and fetched from allowed hosts on request. It
  was mitigated first with `images.unoptimized` — measured on a production
  build, the endpoint went from fetching on request to 404 — and the
  optimizer stays off after the fix, for the reasons in `next.config.js`.
  `postcss`, pinned inside `next` at a vulnerable 8.4.31, is redirected to the
  root copy with an npm `overrides` entry; remove it when `next` stops pinning.

- Before real customers: `/api/gdpr/export` and `/delete` are untested while
  handling PII, and there is no privacy policy or terms.
- ~~Tenant isolation has no test coverage.~~ **Done.** Thirty authenticated
  routes took a `businessId` from the caller and never checked it. The cause
  was that `CLAUDE.md` mandated `requireBusinessAccess`, which calls
  `redirect()` and so cannot work in a route handler — a rule nobody could
  follow, hand-rolled six ways instead. `authorizeBusinessAccess` in
  `lib/auth/business-access.ts` is the one that works, and
  `__tests__/security/tenant-isolation.test.ts` fails the build for any new
  route that skips it.

  Ten routes were fixed; fifteen were deleted as dead (`/api/availability/*`
  in full, three `/api/booking/*` duplicates, three telemetry routes whose
  only caller had no importers); five turned out to authorize correctly by a
  mechanism the detector could not see, and are recorded as such.

  Two things the sweep found and did not fix:

  - `/api/monitoring/performance` now checks membership, but
    `appointmentPerformanceMonitor.generateReport` takes only a time window —
    it does not scope by business. The check stops a stranger asking; it does
    not yet make the answer theirs. Scoping the report is real work with no
    consumer today, since nothing calls the endpoint.
  - There is no admin role. Several endpoints are application-wide by nature
    and are currently open to any authenticated user. Worth a decision before
    real customers.
