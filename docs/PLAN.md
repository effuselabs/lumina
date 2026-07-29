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

- **One branch per PR**, named for the change. Never per phase.
- Failing test first, then make it pass.
- `type-check && lint && test:ci && build` green locally before every commit.
- Verify, then claim. Run the thing; do not infer from the code.
- Merging to `main` deploys staging automatically. `/api/health` must report
  `healthy` — a database failure returns 503 and Railway refuses to promote.

---

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
- ~20 Prisma models with no active code path — marked `PARKED` in
  `schema.prisma`; tables still exist, nothing is lost
- Playwright browser projects beyond Chromium and Mobile Safari
- Raising lint rules from `warn` to `error` as their counts reach zero:
  **56** routes importing Prisma directly, **167** raw hex colours in `.tsx`

## Known, unaddressed

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
