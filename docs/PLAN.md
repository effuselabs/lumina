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
- [ ] **4b** Availability returns real slots
      — the lookahead recursion is fixed; next is whether slots are actually computed
- [ ] **4c** Walk the remaining layers until the spec passes
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

- `app/api/booking/*` duplicates the public booking API. `/api/booking/[id]` is
  **live** (it serves the booking confirmation page); the rest is dead, and
  `components/booking/offline-support.tsx` fetches an endpoint that does not
  exist. Clean up in Phase 4c.
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
