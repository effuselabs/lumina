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
| 6 — Brand assets, releases, production launch    | Not started — see Releases             |
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
   - [x] **3b — the second palette is gone.** `tokens.legacy` is deleted;
         its values had been copied into components from a `colors.css` that
         was never loaded (see 3e). Each use now takes the main palette's
         nearest role: muted text `#808285` (3.85:1) → `neutral[500]`
         (4.74:1); positive `#22C58B` (2.23:1) → `status.success` (5.02:1);
         negative → `status.error` (4.83:1); strong text → `brand.deepTeal`;
         gridlines → `neutral[200]`; the success card's surface and border →
         `statusTint`; the analytics hover gradient → `gradients.radiantPressed`.
         Screenshots: 14 of 19 pages identical; the other five changed only in
         page subtitles (slightly darker grey), chart lines and axes, and
         stat-card trend colours.
   - [x] **3c — `status` colours meet AA as text.** success `#15803D` and
         warning `#B45309` (both 5.02:1 on white, and white on them), were
         3.30 and 3.19. `status.info` is now `#2563EB`, what `text-info`
         actually rendered — `tokens.ts` said `#0284C7` while the CSS said
         otherwise, and `__tests__/design/css-token-parity.test.ts` now fails
         if `globals.css` and `tokens.ts` disagree. Every status colour is in
         `contrastPairs`, both ways round. Screenshots: only status-coloured
         text changed (the home page's trend lines, analytics, the
         design-system swatches).
   - [x] **3c′ — brand text is deep teal; gold is for fills and accents.**
         Decided by Jeremy on 2026-10-01. Measured in the browser first:
         115 text elements across 21 pages were gold on a light surface, all
         at 1.44:1, and none on a dark one — so nothing needed to stay gold.
         113 came through `.text-lumina-primary`, now `var(--deep-teal)`; the
         rest were a `select` focus and checked state, an animated-counter
         variant, two auth-link hovers, a design-system link, and "Powered by
         Lumina" on the booking page, which was coloured with the _tenant's_
         brand colour. After: one gold text element — none. The most visible
         change is the sidebar wordmark, gold to teal beside its gradient
         mark. `__tests__/design/brand-text-colour.test.ts` fails on gold
         text outside `dark:` (two decorative uses named), and deep teal on
         white (14.9:1) is in `contrastPairs`.
     - **Coral as text fails the same way** — 2.57:1 on white — and is on
       21 elements, a mix of decorative icons and a few links on the auth
       pages. Not changed: the decision was about gold. For the design
       review. ([#66](https://github.com/effuselabs/lumina/issues/66))
     - **Tenant colours are used as text.** The public booking page sets
       text in the business's configured `accent` colour (deep teal by
       default, but any colour a salon picks). A tenant colour used as text
       needs a contrast floor; for the design review. ([#67](https://github.com/effuselabs/lumina/issues/67))
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
     - `prisma/seed.ts`, the last one, takes the demo salon's colour from
       `brand.gold`. Nothing in the application writes a hex of its own.
   - [x] **3f — dark mode, done properly.** Decided by Jeremy on
         2026-10-01: dark mode is a requirement, not an extra, and
         "light-only by design" (3d) no longer holds. Three pull requests.
     - [x] **1 — the dark theme applies, and passes AA.** Three faults:
       - **Cascade.** Tailwind 3's `@layer base` is not a CSS cascade layer;
         Tailwind moves its rules up to `@tailwind base`, the top of the
         file. `.dark` lived there, so in the built CSS it came _before_ the
         plain `:root` that sets the same properties, at equal specificity,
         and `:root` won on source order. (This entry first blamed layered
         versus unlayered precedence; the built CSS showed otherwise.)
         `.dark` now sits outside any layer, after `:root`.
       - **Two providers.** `dashboard-layout.tsx` wrapped the dashboard in
         a second `ThemeProvider` with `defaultTheme="system"` and its own
         storage key. It won the class on `<html>`, so the dashboard
         followed the OS — dark-OS users already got a half-dark dashboard,
         despite `providers.tsx` choosing light. It is gone. The
         root provider also force-set four properties as inline styles,
         which hid the cascade bug; that is gone too.
       - **Contrast.** Dark reused light `status` colours (3.5–4.1:1 on dark)
         and a muted grey at 3.71:1. `tokens.statusOnDark` and muted
         `#94949C` clear 4.5:1 on all three dark surfaces, status fills
         carry dark text, and brand text (`.text-lumina-primary`) is gold in
         dark, where deep teal is 1.3:1. All in `contrastPairs`.
       - `__tests__/design/dark-theme-cascade.test.ts` fails on any of the
         three structural faults. Light mode: 18 of 19 pages identical,
         analytics differs only in a seeded figure. Dark mode, measured on four
         pages: background, text, muted, status and brand text all resolve
         to their dark values.
     - [x] **2 — themed colour names.** `themed` in `tokens.ts` gives each
           surface, text and line role a light and a dark value, generated into
           `app/tokens.css` as `--ui-*` (`:root`, then `.dark`) and exposed to
           Tailwind as `bg-surface{,-muted,-sunken,-strong}`,
           `text-ink{-strong,,-soft,-muted,-faint}` and
           `border-line{,-strong,-soft}`. Each light value is the Tailwind gray it
           replaces, which `semantic-colours.test.ts` asserts, so moving a
           component across changes nothing in light mode. Dark pairs are in
           `contrastPairs` wherever the light pair already passed: muted text
           was already 4.39:1 on gray-100 and 3.90:1 on gray-200 in light, and is
           held only on the two lightest surfaces. The input, textarea, select
           and dialog primitives moved first. `hardcoded-light-classes.test.ts`
           is a ratchet: 508 hardcoded light classes today, and the count may
           only fall. The `--color-*-background` properties that `success-50`
           and friends point at are undefined, but nothing uses those classes.
     - [x] **3.1 — the gray sweep.** 506 hardcoded light classes across 50
           files (`bg-white` → `bg-surface`, `text-gray-900` →
           `text-ink-strong`, `border-gray-200` → `border-line`, and so on, with
           `hover:` and other prefixes kept) moved onto the themed names, plus
           `ink-deep` (gray-800) and `surface-dim` (gray-300). Light mode: 18 of
           19 pages pixel-identical, analytics within its noise.
           `hardcoded-light-classes.test.ts` now fails on any hardcoded light
           gray outside two named exceptions.
     - [x] **3.2 — the rest, and the switch.** Found in dark screenshots
           of all 19 pages after 3.1:
       - Deep-teal text (39 classes, 3 inline styles, and
         `.text-lumina-secondary`) is `ink-brand`: deep teal in light, the
         teal ramp's 300 step `#8DD2D8` in dark (7.0–11:1).
         `hardcoded-light-classes.test.ts` now also fails on
         `text-deep-teal` and gray gradient stops.
       - 57 `neutral-*` classes with no `dark:` partner got a mirrored one;
         the booking page's gray gradient takes the surface names; the week
         view's busyness tints are translucent in dark.
       - A light/dark toggle in the dashboard header, and
         `defaultTheme="system"`: dark mode is now reachable.
       - The marketing home page is forced light (`forcedTheme` on
         `ThemeProvider`): its photographic and gradient sections are
         light-only by design, and need a dark design of their own.
         Light mode: identical except the new toggle. Remaining for the
         design review: pastel status boxes (`bg-*-50`) stay light in dark,
         readable but bright ([#68](https://github.com/effuselabs/lumina/issues/68)); tenant brand colours used as text (the booking
         sidebar's phone and email) are unreadable on dark with the default
         deep-teal accent; and the home page's dark design ([#69](https://github.com/effuselabs/lumina/issues/69)).
   - [x] **3g — peach renders.** `--lumina-peach` was never defined, so
         `bg-lumina-peach` painted nothing — and its opacity variants
         (`/10`, `/20`, `/30`) were never generated at all, because Tailwind
         cannot add alpha to a bare `var()`. Tailwind's peach colours now take
         `brand.peach` directly, as the `brand.*` colours already did. The
         "in progress" schedule item, its border and two hover tints paint
         for the first time; checked in the browser, since none of them is
         on screen in the standard screenshots, which were all identical.
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
   - `lib/auth.ts`: done, by adoption rather than deletion. All 13
     `/dashboard/[businessSlug]` pages had hand-written the membership check
     while `requireBusinessAccess` — the helper `CLAUDE.md` names — had no
     callers, took an id the pages did not have, and sent non-members to a
     `/unauthorized` page that does not exist. It now takes the slug, returns
     the business and role, and every page calls it;
     `__tests__/security/dashboard-page-access.test.ts` fails on a page that
     does not, or that calls it inside a `try`. That last rule is from a real
     bug: the dashboard and analytics pages wrapped their check in a `try`
     whose `catch` redirected to `/onboarding`, so staff opening analytics
     were sent to onboarding instead of back to the dashboard, and a
     database failure looked like having no business.
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
   - knip reports nothing.

---

## Releases — build before the first one is cut

**When:** Phase 6, after the clean-up and once features work end to end — not
before. There is nothing worth versioning until a salon could use it. But the
first release should go out through this pipeline rather than by hand, so it
is built ahead of that release, not after.

**Model it on LatestArr**, which already does this
([v0.11.0](https://github.com/jshields-ca/LatestArr/releases/tag/v0.11.0)).
Copy its `.github/workflows`, `.github/release-highlights/` and templates
across and adapt them, rather than designing from scratch.

**Release notes** ([#74](https://github.com/effuselabs/lumina/issues/74)), generated by GitHub Actions, with three sections:

- **Highlights**: a short paragraph on what matters most in this release.
- **What's changed**: grouped under **New**, **Improved** and **Fixed**, taken
  from the `enhancement`, `improvement` and `bug` labels. One plain-language
  line per change, describing what a salon owner or client would notice
  rather than what the code does. Every line links to the issue or pull
  request it came from.
- **Upgrading**: the image tag to pull, any migration or configuration step,
  and the full-changelog compare link (`vX...vY`).

**Issues per PLAN item — started 2026-10-03.** Every open item in this
document has a GitHub issue, linked beside it here, and labelled and
milestoned by phase. See the working agreement for how they are kept in step.

**A container image with every release** ([#75](https://github.com/effuselabs/lumina/issues/75)), published to
`ghcr.io/effuselabs/lumina`, tagged `vX.Y.Z` and `latest`, so a self-hoster
can run `docker compose pull` against a compose file in the repository. What
building it involves:

- **A Dockerfile.** None exists: local development deliberately runs
  `npm run dev` against containerised Postgres and Redis (`docker-compose.yml`).
- **Standalone output.** A small image wants Next's `output: 'standalone'`,
  which `next.config.js` removed on purpose because Railway starts the app
  with `npm start`. Either Railway deploys the same image — so staging runs
  exactly what a release ships — or the Dockerfile enables standalone for its
  own build. Prefer the first; decide when the Dockerfile exists.
- **Migrations on start.** The image runs `prisma migrate deploy` before the
  server, the guarantee Railway's pre-deploy command gives staging today.
- **A self-hosting compose file**: app, Postgres, required environment
  variables. Pairs with the self-hosting instructions listed under Open source
  positioning, including the first-account bootstrap.
- **Package visibility follows the repository**, which is already public, so
  the image is public from its first push.

**Versioning.** Semantic versions starting from `package.json`'s `0.1.0`,
`0.x` until production launch. A release is a tag; the workflow builds notes,
image and GitHub release from it.

## Working agreement

- **Decision rights are in `CLAUDE.md`.** The lead developer decides how the
  work is structured — pull requests, branches, debugging order, what gets
  fixed now versus recorded here. The owner decides direction, licensing, and
  anything irreversible or outward-facing.

- **One branch per PR**, named for the change. Never per phase.
- **Every piece of work has an issue.** This document holds the reasoning;
  the issue holds the status. A new finding gets an issue when it is recorded
  here, linked beside its entry. A pull request says `Closes #N` for what it
  finishes, so the issue closes on merge and release notes can link to it.
  When an entry is resolved, strike it through here and say what fixed it.
  Work merged before 2026-10-03 links to its pull request instead.
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

- **A CLA**, if selling a proprietary licence is ever to stay an option. ([#77](https://github.com/effuselabs/lumina/issues/77))
  Without one, every contributor holds copyright in their own work under AGPL,
  and relicensing later means tracking each of them down individually. Adding
  one on day one costs a bot and a file; retrofitting it can be impossible.
- **Self-hosting instructions.** ([#76](https://github.com/effuselabs/lumina/issues/76)) `docs/environments.md` documents _our_ Railway
  staging, not a stranger's deployment. Registration is closed by default now
  (`ALLOW_PUBLIC_SIGNUP`), with a first-account bootstrap so a fresh install is
  usable — that behaviour needs writing down where a self-hoster will find it.
- **A statement of what is free and what is paid**, so the boundary is not
  something people have to infer. ([#78](https://github.com/effuselabs/lumina/issues/78))
- An organisation profile README for `effuselabs`. ([#79](https://github.com/effuselabs/lumina/issues/79))

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
rather than a sentence. `next@16` itself remains Phase 7 work. ([#83](https://github.com/effuselabs/lumina/issues/83))

**Build-time packages belong in `devDependencies`**, or the production audit
counts them. On 2026-10-03 GHSA-vfj7-8cjw-p6xm (`braces`, no fix available)
turned every pull request red through `tailwindcss-animate`, a Tailwind plugin
read only by `tailwind.config.ts` but listed as a runtime dependency — which
pulled all of Tailwind's tree into the production count. Moving it to
`devDependencies` took the count to zero with no version change.

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
  touched ([#82](https://github.com/effuselabs/lumina/issues/82))
- Playwright browser projects beyond Chromium and Mobile Safari
- Raising lint rules from `warn` to `error` as their counts reach zero:
  **43** of 63 routes importing Prisma directly (was 56; fifteen dead routes
  were deleted in 4d). Raw hex in `.tsx` reached zero and is an error. ([#81](https://github.com/effuselabs/lumina/issues/81))

## Known, unaddressed

- ~~**`npm run lint` does not reach `hooks/`, `prisma/`, or root config.**~~
  **Fixed** ([#56](https://github.com/effuselabs/lumina/issues/56)).
  `eslint.dirs` in `next.config.js` is now the whole repository, for both
  `next lint` and the lint step inside `next build`, with generated output
  named in `ignorePatterns`. Widening it found four errors the gate had never
  seen: two `prefer-const` in `prisma/factories/appointment-factory.ts`, an
  import-order error in a test, and the generated `next-env.d.ts`, now
  ignored. The seed still generates its 500 appointments.

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

- ~~**An appointment outside business hours is invisible on the calendar.**~~
  **Fixed — and the calendar showed no appointments at all.** The real cause
  was one layer down: `appointment-calendar-page-content.tsx` rendered
  `mockAppointments = []` and invented Mon–Fri 9–5 hours, so no booking had
  ever reached the owner's calendar, including the one the milestone's
  definition of done says must land there. Now:
  - The page reads the salon's `BusinessHours` and the calendar fetches
    `/api/appointments` for its visible window (day, week or six-week month),
    paging past the API's 100 limit, through a Zod-validated mapper
    (`lib/calendar/calendar-appointments.ts`).
  - Day and week grids span business hours _union_ the appointments present
    (`lib/calendar/visible-range.ts`), mark those cells as outside hours, and
    say so above the grid.
  - Two latent crashes surfaced on the first real appointment and are fixed:
    `AppointmentBlock` required a `BulkSelectionProvider` that 4d's unused
    export sweep had deleted (nothing rendered it), and the page passed
    Prisma `Decimal` prices into a client component.
  - `types/dashboard-appointments.ts` mirrors `AppointmentStatus` instead of
    importing `@prisma/client`, which is what shipped Prisma's browser stub to
    the calendar page; a test keeps the mirror identical to Prisma's enum.
  - `e2e/booking-loop.spec.ts` now ends with the owner finding the booking on
    the calendar; against the old calendar it fails.

  Still true: the calendar lays its grid out in the _browser's_ timezone, not
  the salon's, as availability once did. An owner viewing from another zone
  sees shifted times. Worth fixing with the same `business-time.ts` helpers. ([#59](https://github.com/effuselabs/lumina/issues/59))

- **Business metrics should bucket by the salon's day, not UTC.** ([#87](https://github.com/effuselabs/lumina/issues/87))
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
  against `lib/design/tokens.ts` rather than restored. ([#65](https://github.com/effuselabs/lumina/issues/65))

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

- **There is no `error.tsx` anywhere in `app/`.** ([#57](https://github.com/effuselabs/lumina/issues/57)) A server error in a page
  shows Next's default error screen. The dashboard pages used to catch
  everything and redirect to `/onboarding` instead, which hid outages as
  "you have no business"; that is gone, and a branded error boundary for
  `/dashboard` is the proper replacement.

- **No `Strict-Transport-Security` or `Content-Security-Policy` header.** ([#70](https://github.com/effuselabs/lumina/issues/70))
  `next.config.js` sets `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy` and `Permissions-Policy`, and staging serves them; it sets
  neither HSTS nor a CSP. Worth adding before production (Phase 6) — a CSP in
  report-only mode first, since inline styles are in use.

- ~~**`npm run db:seed` is not idempotent.**~~ **Fixed.** A second run
  appended another copy of the catalogue — six local runs left 264 services,
  each name six times, and the booking e2e failed for want of a uniquely named
  one. The seed now stops after its upserts when the demo salon already has
  staff, and says so; `npm run db:seed:refresh` (reset the demo salon, then
  seed) is the way to a fresh dataset. This entry first said
  `prisma migrate reset` was the recovery, which destroys every table:
  `db:seed:refresh` already existed and deletes one row.

- **Railway's native deploy can lag CI by a quarter of an hour.** After #32
  merged, main CI finished at 20:28 and the deployment went live at 20:42 —
  #30 and #31 had taken 8–9 minutes, #33 about 7. At 20:43 a manual
  `deploy.yml` run was dispatched as if the deploy had been skipped, and
  duplicated one that had gone live a minute earlier; its upload then
  replaced the native deployment with the same code under commit `unknown`.
  Wait about 20 minutes after CI before treating a deploy as stuck, and check
  Railway's deployment list rather than inferring from `/api/health` alone.

- ~~**Merging two pull requests within seconds of each other skips a
  deploy.**~~ **Fixed** ([#61](https://github.com/effuselabs/lumina/issues/61)).
  `ci.yml` cancelled an older run when a newer one started on the same ref; on
  `main`, Railway reads the cancelled run as a failed check suite and skips
  that commit's deploy (`skippedReason: "CI check suite failed"`), with no
  failure anywhere to notice. It happened on 2026-09-06 (#108, #109, before
  the repository was rebuilt) and again on 2026-10-01, when #45's run on
  `main` was cancelled — harmless both times, because the next commit
  contained the code. Each commit on `main` now gets its own concurrency
  group, so its run is never cancelled or left queued; pull requests still
  cancel superseded runs.

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

- **Availability re-validates every slot two or three times over.** ([#62](https://github.com/effuselabs/lumina/issues/62)) Measured:
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

- ~~**The booking write re-checks conflicts outside its transaction.**~~
  **Fixed** for both ways an appointment is created: the public booking
  route and `AppointmentRepository.create` (the dashboard). The clash check
  and the insert now share a transaction holding a Postgres advisory lock on
  the staff member (`lib/services/staff-schedule-lock.ts`), so concurrent
  bookings for one person queue and bookings for different people do not.
  Before the fix, four concurrent requests for one slot were all booked into
  the same chair; `e2e/booking-loop.spec.ts` ("concurrent bookings of one
  slot book it once") now gates it. The unique constraint on
  (staffId, startTime) suggested here was rejected: it misses overlaps that
  start at different minutes.

- ~~**Rescheduling still checks for a clash outside its write.**~~ **Fixed.**
  Every path that puts an appointment into a slot now goes through
  `claimSlot` (`lib/services/staff-schedule-lock.ts`) inside the transaction
  that writes it: booking, `AppointmentRepository.update` (every dashboard
  move, including `rescheduleAppointment`), `PUT /api/booking/[id]`, and
  reinstating a cancelled or no-show appointment in
  `AppointmentStatusManager`. Reinstating had no clash check at all, racy or
  otherwise. Before the fix, two concurrent moves into one free hour both
  returned 200; "concurrent reschedules into one slot move only one" gates
  it. An exclusion constraint would cover writes that bypass these paths, but
  its migration fails on any database already holding overlaps, so it needs a
  data check first.

- ~~**`/api/booking/[id]` had no tenant check.**~~ **Fixed** in the same
  change. Middleware required a session; nothing checked the session belonged
  to the appointment's business, so any signed-in user of any salon could
  read, reschedule or cancel any other salon's appointment by id. The
  tenant-isolation gate missed it because it only inspected routes whose
  source mentions `businessId`; it now also inspects every authenticated
  route that reads the database, and this was the only one it had missed.
  Appointment ids are cuids, not guessable, and there are no real customers
  yet, so no data is known to have been exposed.

- **Clients cannot manage their own booking.** ([#84](https://github.com/effuselabs/lumina/issues/84)) `/booking/[id]` is a public
  page ("View and manage your appointment booking") whose API,
  `/api/booking/[id]`, has always required a staff session — so for a client
  it has never worked. Making it work needs a capability the client holds,
  such as a signed link in the confirmation email (the pattern
  `/api/notifications/preferences` already uses), not a session. A feature,
  not a fix; build it when client self-service is on the roadmap.

- **The reschedule email from `PUT /api/booking/[id]` formats times in the
  server's zone** (`date-fns` `format`), the bug the booking write fixed with
  `inBusinessZone`. It also sends the booking _confirmation_ template for a
  reschedule. Fix both when that route's emails are next touched. ([#60](https://github.com/effuselabs/lumina/issues/60))

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
  `builder` and `preDeployCommand` are commented out. Config as Code stops
  working 2026-12-01; **done** — `.railway/railway.ts` is now the complete
  configuration (builder, pre-deploy migration, health check), committed.

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
  through `appointments.some({ staffId })`. ([#85](https://github.com/effuselabs/lumina/issues/85))

- ~~The booking page opens on today and offers no way forward when the salon is
  closed that day.~~ **Fixed** ([#58](https://github.com/effuselabs/lumina/issues/58)).
  It was worse than recorded: a "Next available date" button did exist, but it
  parsed the API's `2026-10-12` with `new Date()`, which is UTC midnight —
  the evening before anywhere west of Greenwich. A Los Angeles visitor on a
  closed Sunday was offered "Sunday, Oct 11", and clicking it selected the
  closed day again. `lib/booking/date-param.ts` now reads and writes the API's
  bare dates in the visitor's zone, and on first arrival the page moves to the
  next day with times and says so. The e2e spec opens the page in the salon's
  zone with the browser clock on a closed day; the project's own browser runs
  in Sydney, east of UTC, where the bug never showed.

- ~~The booking page could show the closed day's empty list under the day it
  moved to.~~ **Fixed** ([#92](https://github.com/effuselabs/lumina/issues/92)),
  a regression from #58's fix. The page drew every availability response it
  received, including ones for a day it was no longer showing: a fetch that
  re-runs while its request is in flight shares that request, so one answer
  reached two handlers — the first moved the page on, the second drew the
  closed day over it. Separately, the loading state cleared between the hand
  over and the next day's fetch, drawing that day as empty for a frame. Only
  the latest request may now change the page, and loading holds through the
  hand-over. #58's test passed regardless, because it looked for any button
  containing a time and the "other times" tiles contain times too; it now
  forces the shared-request case and records whether the empty state is ever
  drawn for the new day, even briefly.

- The booking page's time buttons, and its "other times" tiles, clip their
  own text at desktop width ([#90](https://github.com/effuselabs/lumina/issues/90)).
  Found while fixing #58.

- ~~**Prisma is bundled into the browser on the booking page.**~~ **Fixed.**
  `staff-time-selection.tsx` called `AlternativeSlotsService` from the
  browser, so "here are some other times" never worked. The availability
  route now computes alternatives when a day is empty and returns them in
  the same response; the page renders them in the salon's timezone. Three
  defects were behind the first one, each hidden by it:
  - The search started a day early: the route passed `new Date(date)`, UTC
    midnight, which in Los Angeles is the evening before. It now passes the
    salon's own midnight.
  - The service read opening hours from the legacy `Business.operatingHours`
    JSON (through an `as any`), which disagreed with the `BusinessHours`
    table everything else reads: it offered Sunday slots for a salon the page
    showed as closed.
  - The page only rendered alternatives inside its error panel, never for an
    empty day, and in the browser's timezone.
    `e2e/booking-loop.spec.ts` asks for a closed day and checks every
    alternative falls on a later salon day; it fails on each of the first two.
    The dashboard calendar's Prisma browser stub went in #52: no client
    bundle contains Prisma.

- The landing page links to `/book/demo` (`app/page.tsx`), which 404s. The route
  resolves a business by cuid, not by slug or any friendly name, so no static
  href can work. Either give `Business` a public booking slug and resolve on it,
  or drop the link. Phase 5, with the marketing page. ([#64](https://github.com/effuselabs/lumina/issues/64))

- The public booking page now hides services no active staff can perform. A
  salon whose only nail technician leaves will see nail services disappear from
  their booking page with no notice. Better than the dead end it replaces — the
  service was listed, selectable, and unbookable — but the owner should be told.
  Belongs with staff management, when that is unparked. ([#86](https://github.com/effuselabs/lumina/issues/86))

- ~~`app/api/booking/*` duplicates the public booking API.~~ **Resolved** in
  4d: only `/api/booking/[id]` remains (tenant-checked since #54), and
  `offline-support.tsx` no longer fetches a missing endpoint.
- ~~`booking-confirmation.tsx`, `public-booking-interface.tsx` and
  `simple-booking-layout.tsx` are unreferenced.~~ **Resolved**: deleted in the
  4d sweep.
- The client form's `<Input>` sets `aria-label` from its placeholder, which
  overrides the visible `<Label>`. Screen-reader users hear "Enter your email
  address" where the label says "Email Address". Fix with the Phase 5 primitive
  rebuild. ([#63](https://github.com/effuselabs/lumina/issues/63))
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
  root copy with an npm `overrides` entry; remove it when `next` stops pinning. ([#80](https://github.com/effuselabs/lumina/issues/80))

- Before real customers: `/api/gdpr/export` and `/delete` are untested while
  handling PII, and there is no privacy policy or terms. ([#71](https://github.com/effuselabs/lumina/issues/71))
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
    consumer today, since nothing calls the endpoint. ([#73](https://github.com/effuselabs/lumina/issues/73))
  - There is no admin role. Several endpoints are application-wide by nature
    and are currently open to any authenticated user. Worth a decision before
    real customers. ([#72](https://github.com/effuselabs/lumina/issues/72))
