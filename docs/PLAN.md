# Lumina plan

Living document. Update it in place as things land. Do not create a second
plan, a per-phase plan, or a status report: this project already failed once by
accumulating 335 documents and 85 spec files describing work that did not run.

**This file is the map: where we are, what is next, why that order, and what is
parked.** Detail lives where it is enforced or recorded:

| What                                | Where                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Status of any piece of work         | Its GitHub issue. Phases are [milestones](https://github.com/effuselabs/lumina/milestones) |
| The rules, and who decides what     | `CLAUDE.md`                                                                                |
| The look, materials and motion      | [`visual-language.md`](visual-language.md)                                                 |
| Environments, deploys, secrets      | [`environments.md`](environments.md)                                                       |
| Finished work and the lessons in it | [`history.md`](history.md) (the rebuild log)                                               |
| Why a change was made               | Its commit message and pull request                                                        |
| Whether the product works           | `e2e/booking-loop.spec.ts`, and the five gates in `CLAUDE.md`                              |

**How work is tracked.** Each phase is a milestone. Phase 6 is one epic,
[#126](https://github.com/effuselabs/lumina/issues/126), with a sub-issue per
stage; each stage holds the older issues it will close, so the epic's progress
bar is the rebuild's. The launch is [#167](https://github.com/effuselabs/lumina/issues/167),
built the same way. An issue without a milestone is parked, and carries the
`parked` label.

---

## Where things stand — 2026-10-27

| Check                 | Now                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Build                 | Passes; 62 static pages                                                                                          |
| Type-check, lint      | 0 errors                                                                                                         |
| Jest                  | 1,020 tests in 68 suites, green                                                                                  |
| End to end            | 19 tests, Chromium and Mobile Safari, green in CI                                                                |
| Screenshots           | Home, sign-in, sign-up, booking, dashboard, design system; both themes                                           |
| Staging               | `staging.uselumina.app`, auto-deploys on green `main`, healthy                                                   |
| Production advisories | 0 high or critical (4 moderate, build-time only, [#149](https://github.com/effuselabs/lumina/issues/149))        |
| Unused code (`knip`)  | 6 small findings: it drifted because CI doesn't run it ([#152](https://github.com/effuselabs/lumina/issues/152)) |

**What works for a salon today:** a client can book through the salon's public
page, in the salon's timezone, without double-booking a chair, and the owner
sees the booking on the calendar and in real dashboard figures.

**What does not, yet:** no email has ever been delivered
([#120](https://github.com/effuselabs/lumina/issues/120)); there is no password
reset, no staff booking, no check-in, and no Settings page; and the interface
is the old coral design, which Phase 6 replaces.

**One correction to the record.** Phase 4 was marked done when
`e2e/booking-loop.spec.ts` passed. `CLAUDE.md`'s definition of done is longer:
an owner signs up and sets up, a client books, _both are emailed_, and the
booking is on the calendar. The spec runs on seeded data and does not assert
email, so the sign-up and email halves have never been proven.
[#165](https://github.com/effuselabs/lumina/issues/165) closes that gap, and is
a launch gate.

## Phases

| Phase                                    | State                                      | Milestone                                                        |
| ---------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| 0 — Ground truth                         | Done                                       |                                                                  |
| 1 — Unblock and demolish                 | Done                                       |                                                                  |
| 2 — Foundation (`CLAUDE.md`, auth, lint) | Done                                       |                                                                  |
| 3 — Environments and pipeline            | Done                                       |                                                                  |
| 4 — Make the booking loop work           | Done, as tested (see the correction above) |                                                                  |
| 5 — Design system collapse               | Done; milestone closed 2026-10-27          | [1](https://github.com/effuselabs/lumina/milestone/1)            |
| **6 — UI/UX rebuild**                    | **In progress: stage 0**                   | [4](https://github.com/effuselabs/lumina/milestone/4), epic #126 |
| 7 — Brand, releases, production launch   | Not started; checklist proposed            | [2](https://github.com/effuselabs/lumina/milestone/2), #167      |
| 8 — Ratchet and expand                   | Not started                                | [3](https://github.com/effuselabs/lumina/milestone/3)            |

Phase 5 closed with six issues that were not design work; each moved to where
its work now lives (#104, #105, #118, #123 and #124 into Phase 6, #120 into the
launch).

## Now, next, and waiting

**Now — Phase 6, stage 0**, groundwork that changes nothing a salon sees:
retire the dormant offline mode ([#150](https://github.com/effuselabs/lumina/issues/150)),
allow-list what public booking responses contain ([#151](https://github.com/effuselabs/lumina/issues/151)),
the redesign's guardrail checks ([#152](https://github.com/effuselabs/lumina/issues/152)),
and analytics' made-up figures ([#123](https://github.com/effuselabs/lumina/issues/123):
computed honestly, or taken out of the navigation until they are). The truth
pass that removed every dead link and "Coming Soon" page is done
([#147](https://github.com/effuselabs/lumina/issues/147)).

**Next — stage 1, plumbing** ([#153](https://github.com/effuselabs/lumina/issues/153)),
then the Tailwind 4 upgrade if approved
([#154](https://github.com/effuselabs/lumina/issues/154)), then **stage 2, the
look** ([#155](https://github.com/effuselabs/lumina/issues/155)) — the first
pull request that visibly changes staging.

**Waiting on Jeremy**, each with what it unblocks:

| Decision or action                                                          | Unblocks                                | Issue                                                   |
| --------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------- |
| Tailwind 4 now, dropping iPhones stuck on iOS 15 or older                   | Stage 1; clears #149                    | [#154](https://github.com/effuselabs/lumina/issues/154) |
| Does `/book` also open dark, or follow the client's phone (as P3 recorded)? | Stage 2's theme defaults, stage 5a      | [#126](https://github.com/effuselabs/lumina/issues/126) |
| Move DNS to Cloudflare, verify the domain in Resend, set the key on Railway | Every email, password reset, the launch | [#120](https://github.com/effuselabs/lumina/issues/120) |
| Create the Sentry project, set `SENTRY_DSN` on Railway                      | Error reporting                         | [#100](https://github.com/effuselabs/lumina/issues/100) |
| Set up CLA Assistant with the approved text                                 | The CLA pull request                    | [#77](https://github.com/effuselabs/lumina/issues/77)   |
| Agree the first-release checklist                                           | Phase 7's definition of done            | [#167](https://github.com/effuselabs/lumina/issues/167) |

None blocks stage 0, and only the first two touch Phase 6 at all.

---

## Phase 6 — UI/UX rebuild

**Why.** Phase 5 made the design system one thing without redesigning it, on
purpose: every value carried across unchanged. What it surfaced shares one
cause — a palette and components drawn for a light marketing page, stretched
over a dense app and then a dark theme. Patching each finding would have kept
the cause. Decided by Jeremy on 2026-10-24
([#126](https://github.com/effuselabs/lumina/issues/126)), with
[Arcane](https://getarcane.app) as the reference he named.

**What it starts from:** one token source generating CSS and the Tailwind
config, contrast gates, 37 primitives in a fully reachable tree, a dark theme
that works, screenshot tests in both themes, and no dead links (a test fails
on one). Every rule in `CLAUDE.md` still holds.

**The direction** (approved by Jeremy on 2026-10-24, and confirmed point by
point on 2026-10-27):

- **P1 — Scope:** the look _and_ the front desk. One booking engine for the
  public page and a staff booking sheet; an appointment panel with check-in,
  rebook and move; "Today" for owners and "My day" for stylists; Settings for
  hours, booking link and branding. Client CRM, analytics and payments stay
  parked.
- **P2 — Colour:** gold on ink. Ink neutrals at hue 220, gold the only accent;
  coral and the gold-to-coral gradient leave the interface.
- **P3 — Theme:** dark by default; light for anyone who chooses it, remembered
  per device. Whether `/book` also opens dark is open (above).
- **P4 — Salon branding:** a logo upload and one of eight tested preset
  accents, on the booking page's band and the email header only.
- **P5 — Booking:** three screens; six taps for a new client, four for a
  returning one, held by a test. The "welcome back" lookup is gone (S1,
  [#138](https://github.com/effuselabs/lumina/issues/138)).
- **P6 — Shared devices:** masked phone numbers and surnames, hidden revenue,
  a privacy screen after 2 minutes idle, sign-out after 30.
- **P7 — Dependencies:** five more Radix packages, `cmdk`, `sharp` made
  direct; dev-only `@axe-core/playwright` and `knip`; Inter committed. No
  animation library, no shadcn CLI. Tailwind 4 was "Phase 8"; now proposed
  for stage 1 (#154).
- **P8 — Stylists' revenue:** hidden by default; the owner can show it.

**The visual language** on top, approved 2026-10-26 after the direction's
preview read as bland: materials by role (glass only for chrome), one gold
ambient light, a metallic gold button, Fraunces for a few moments, three
springs, and three signature moments — the gold now-line, the booking time
that becomes a ticket, and check-in. Spec in
[`visual-language.md`](visual-language.md); clickable prototype on the canvas
linked from #126.

**The logo** is First Light (concept B: a gold sun rising over a line), chosen
by Jeremy on 2026-10-27 ([#144](https://github.com/effuselabs/lumina/issues/144)).
It brings one deliberate brand moment: on sign-in, the sun rises as the page
loads — once, under about 800 ms, never in the way of the form, and simply
present under reduced motion. That is the only animation allowed past the
spec's 240 ms ceiling, and the spec says so.

**Stages.** Each pull request is either pixel-identical or a deliberate visual
change, never both, so every screenshot difference has one cause. Plumbing
goes before paint.

| Stage                | Issue                                                                                                            | What changes on staging                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 0 — Groundwork       | #147 ✓, #150, #151, #152, #123                                                                                   | Dead ends gone (done); otherwise nothing visible                    |
| 1 — Plumbing         | [#153](https://github.com/effuselabs/lumina/issues/153), [#154](https://github.com/effuselabs/lumina/issues/154) | Corners round, hovers and headings work. Tailwind 4 pixel-identical |
| 2 — The look         | [#155](https://github.com/effuselabs/lumina/issues/155)                                                          | **Everything turns gold on ink, dark by default**                   |
| 3 — Components       | [#156](https://github.com/effuselabs/lumina/issues/156)                                                          | New buttons, inputs, sheets, menus, toasts, ⌘K                      |
| 4 — Shell and logo   | [#157](https://github.com/effuselabs/lumina/issues/157)                                                          | Glass header, phone tab bar, First Light, the sign-in sunrise       |
| 5a — Public booking  | [#158](https://github.com/effuselabs/lumina/issues/158)                                                          | Three screens, the salon's band, the ticket                         |
| 5b — Staff booking   | [#159](https://github.com/effuselabs/lumina/issues/159)                                                          | Book a phone-in client from the calendar                            |
| 5c — Calendar        | [#160](https://github.com/effuselabs/lumina/issues/160)                                                          | Day view, appointment panel, check-in, drag to move                 |
| 5d — Today, My day   | [#161](https://github.com/effuselabs/lumina/issues/161)                                                          | The new overview; stylists' own day; real notifications             |
| 5e — Settings        | [#162](https://github.com/effuselabs/lumina/issues/162)                                                          | Hours, booking link, logo and preset, the brand try-on              |
| 5f — Shared devices  | [#163](https://github.com/effuselabs/lumina/issues/163)                                                          | Front-desk privacy                                                  |
| 5g — Everything else | [#164](https://github.com/effuselabs/lumina/issues/164)                                                          | Clients, staff, services, onboarding, sign-in; the home page last   |

**When it is testable as a first iteration:** after 5a, 5c and 5d are on
staging — book as a client, check them in, see the day — which is what Jeremy
asked to test on 2026-10-26. Stages 2–4 should already make it feel like a
different product.

**Done when** every screen is rebuilt with its baselines re-approved; AA holds
in both themes, glass included; nothing scrolls sideways from 360px to
1920px; the booking loop and the tap budget are green; `/book` stays under
100 KB of first-load JavaScript with LCP of 2.5 s or better under throttling;
and Jeremy's 2019 iPad passes a manual check.

## Phase 7 — brand, releases, production launch

The launch is [#167](https://github.com/effuselabs/lumina/issues/167): a
proposed checklist, for Jeremy to agree, of everything true before a real salon
is invited, each item its own issue under it:

- Phase 6 done, and the whole loop proven, emails included
  ([#165](https://github.com/effuselabs/lumina/issues/165)), on a verified
  sending domain ([#120](https://github.com/effuselabs/lumina/issues/120))
- Password reset ([#166](https://github.com/effuselabs/lumina/issues/166))
- Error reporting live, caught 500s included
  ([#100](https://github.com/effuselabs/lumina/issues/100): the code is done
  and inert without a DSN; 56 route handlers still swallow their own errors)
- HSTS and a Content-Security-Policy, report-only first
  ([#70](https://github.com/effuselabs/lumina/issues/70)); Sentry's ingest host
  goes in `connect-src`
- A privacy policy and terms, and GDPR export and delete under test
  ([#71](https://github.com/effuselabs/lumina/issues/71))
- Release notes ([#74](https://github.com/effuselabs/lumina/issues/74)), a
  container image ([#75](https://github.com/effuselabs/lumina/issues/75)),
  self-hosting instructions ([#76](https://github.com/effuselabs/lumina/issues/76))
- The CLA, before the first outside contribution
  ([#77](https://github.com/effuselabs/lumina/issues/77))
- A production environment on its own database, backups confirmed, one
  restore rehearsed

Alongside: **a brand voice and writing style**
([#127](https://github.com/effuselabs/lumina/issues/127)) — how Lumina speaks,
and whether the guide is shared with Effuse Labs. The home page is its first
test: it still promises a 14-day free trial, "AI-powered" insights, priority
support and launch pricing, none of which exist. Also the `effuselabs`
organisation profile ([#79](https://github.com/effuselabs/lumina/issues/79))
and scoping the performance report to one business
([#73](https://github.com/effuselabs/lumina/issues/73)).

### Releases

**Model them on LatestArr**, which already does this
([v0.11.0](https://github.com/jshields-ca/LatestArr/releases/tag/v0.11.0)):
copy its `.github/workflows`, `.github/release-highlights/` and templates and
adapt them, rather than designing from scratch. Built ahead of the first
release, so that release goes out through the pipeline and not by hand.

- **Notes**, generated by GitHub Actions: _Highlights_ (a short paragraph);
  _What's changed_ under **New**, **Improved** and **Fixed** from the
  `enhancement`, `improvement` and `bug` labels, one plain-language line per
  change, each linked to its issue or pull request; _Upgrading_ (image tag,
  any migration or configuration step, the compare link).
- **A container image** at `ghcr.io/effuselabs/lumina`, tagged `vX.Y.Z` and
  `latest`. It needs a Dockerfile (none exists), standalone output (prefer
  Railway deploying the same image, so staging runs what a release ships),
  `prisma migrate deploy` on start, and a self-hosting compose file. The
  package is public, as the repository is.
- **Versions** are semantic, from `package.json`'s `0.1.0`, `0.x` until
  production launch. A release is a tag; the workflow builds the notes, image
  and GitHub release from it.

## Phase 8 — ratchet and expand

- **Majors, reviewed deliberately:** Next.js 16 and Prisma
  ([#83](https://github.com/effuselabs/lumina/issues/83)) — Next 16 also
  brings `<ViewTransition>` without experimental React, replacing the hook
  stage 3 builds; Tailwind 4 unless it moves to stage 1 (#154, #149); the
  `postcss` override, once Next stops pinning it
  ([#80](https://github.com/effuselabs/lumina/issues/80)).
- **Ratchets:** lint rules from warning to error as their counts reach zero —
  41 of 60 route handlers still import Prisma directly
  ([#81](https://github.com/effuselabs/lumina/issues/81)); a marker or test for
  database models nothing uses ([#82](https://github.com/effuselabs/lumina/issues/82)).
- **Parked features return**, one at a time, each with its own end-to-end spec.

## Parked, not forgotten

Deferred deliberately; each returns with its own spec.

- **Client CRM**, including the staff filter that reads "preferred staff"
  ([#85](https://github.com/effuselabs/lumina/issues/85))
- **Payments and POS.** The server side is live (payment intents, refunds, the
  webhook); `POSInterface`, `TransactionHistory` and `PaymentForm` are built
  and wired to nothing, and their "Coming Soon" pages are gone (#147).
  Deleting parked feature work is a product decision.
- **Analytics** beyond honest figures (#123), including bucketing by the
  salon's day ([#87](https://github.com/effuselabs/lumina/issues/87))
- **Clients managing their own booking** through a signed link
  ([#84](https://github.com/effuselabs/lumina/issues/84)); until then the
  confirmation says to call the salon
- **Telling owners when a service drops off their booking page** for want of
  staff ([#86](https://github.com/effuselabs/lumina/issues/86))
- Database models with no code path: roughly 20 of 53. There is no `PARKED`
  marker; check for a repository, service or route that reads a model before
  building on it (#82)
- Playwright projects beyond Chromium and Mobile Safari

---

## Decisions

Dated, newest last; the issue holds the discussion.

| Date       | Decision                                                                                                         | Record          |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | --------------- |
| 2026-09-06 | AGPL-3.0; free to self-host, revenue from managed hosting and support                                            | below           |
| 2026-10-01 | Dark mode is a requirement; brand text deep teal, gold for fills (superseded by P2)                              | history         |
| 2026-10-24 | Insert Phase 6, a full rebuild; dark may become the default                                                      | #126            |
| 2026-10-24 | Remove the home page's invented figures; platform admin as a CLI-granted role; free/paid statement in the README | #128, #72, #78  |
| 2026-10-24 | A CLA now, naming Jeremy, keeping the project open source; Sentry for error tracking; DNS to Cloudflare later    | #77, #100, #120 |
| 2026-10-24 | S1: public bookings never edit saved clients; the lookup goes                                                    | #138            |
| 2026-10-24 | The direction, P1–P8 (confirmed point by point 2026-10-27)                                                       | #126            |
| 2026-10-26 | The visual language; Fraunces; test on Jeremy's 2019 iPad and Samsung tablet; `/book` footer credit; `qrcode`    | #145            |
| 2026-10-27 | First Light logo; a sunrise on sign-in; dark by default with light by choice                                     | #144            |

## Working agreement

- **Decision rights are in `CLAUDE.md`.** The lead developer decides how the
  work is structured; the owner decides direction, licensing, and anything
  irreversible or outward-facing.
- **One branch per pull request**, named for the change; never per phase.
- **Every piece of work has an issue**, labelled `enhancement`, `improvement`
  or `bug`, milestoned by phase, and under its stage or launch parent where it
  has one. The issue holds the status; this file holds the order and the why.
  A pull request says `Closes #N`. A finished entry leaves this file; its
  write-up, if it taught something, goes to the rebuild log in `history.md`.
- Failing test first, then make it pass.
- The five gates green locally before every pull request:
  `type-check && lint && test && build && test:e2e`.
- Verify, then claim. Run the thing; do not infer from the code.
- Merging to `main` deploys staging. Confirm `/api/health` reports `healthy`
  on the new commit; a green CI job is not a deploy.
- **Update this file when a stage starts or finishes, a decision is made, or
  the order changes** — not for each pull request.

## Dependency policy

Two triggers, and only two:

1. **A production advisory, high or critical.** Taken immediately, whatever
   the phase. `.github/workflows/dependency-audit.yml` fails a pull request,
   and a daily run, on one; it has earned its place twice (Next 14's criticals
   on 2026-09-29, and five advisories overnight on 2026-10-23, which took Zod
   to 4 early — see the rebuild log).
2. **Phase 8**, where majors are surveyed and upgraded in small pull requests,
   each verified by the five gates.

Everything else waits: a version bump has no observable outcome, which is
exactly the kind of work that consumed this project the first time. The one
proposed exception is Tailwind 4 (#154), argued on rework rather than on the
version. Build-time packages belong in `devDependencies`, or the production
audit counts them. No release candidates: Prisma's CLI advertises `8.0.0-rc`,
which waits for stable, in Phase 8.

## Tooling: when to add plugins

Three plugins are available and none are enabled, deliberately — capability
arriving ahead of the work it serves is how this project accumulated 335
documents.

| Plugin        | When                        | Why                                                                                                                                                                                                                                                              |
| ------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `design`      | **Phase 6**                 | `/design:ux-copy` for empty states, errors and confirmation copy; `/design:critique` on each rebuilt screen, the booking flow first. Skip `/design:handoff` (needs Figma files we don't have) and `/design:research-synthesis` (needs research we haven't done). |
| `brand-voice` | **Phase 7**                 | For the voice-and-tone guide ([#127](https://github.com/effuselabs/lumina/issues/127)), the one part not generated from `lib/design/tokens.ts`.                                                                                                                  |
| `marketing`   | **After production launch** | SEO, campaigns and competitor analysis presume customers and content. Neither exists yet.                                                                                                                                                                        |

**Any audit output must become a test or a lint rule, never a document.** Run
an audit once for discovery, then encode every finding, or it rots the way the
29 archived design-system documents did.

## Open source positioning

The repository is public at `github.com/effuselabs/lumina` under AGPL-3.0:
free to self-host, revenue intended from managed hosting and support. AGPL is
the licence for exactly that requirement — open source, and unattractive to
anyone wanting to offer Lumina as a closed hosted service. Permissive licences
would let a competitor host it; source-available ones (BSL, SSPL) are not open
source. Why the history starts where it does is in `history.md`.

**AGPL's obligations reach across the network**, and that applies to us: our
deployment is unmodified upstream, so the public repository satisfies them —
until staging or production carries a patch that is not pushed. The `/book`
footer's "Source" link is the visible half of that.

Still open, all under the launch: the CLA (#77) — Jeremy sets up CLA
Assistant with the approved text, then a pull request adds `CLA.md` and
changes `CONTRIBUTING.md` and shows the bot passing (CLA Assistant Lite was
archived in March 2026 and does not get a workflow with write access);
self-hosting instructions (#76), including registration being closed by
default (`ALLOW_PUBLIC_SIGNUP`) and the first-account bootstrap; and the
organisation profile (#79).
