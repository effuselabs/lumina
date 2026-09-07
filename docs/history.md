# How Lumina got here

Lumina is on its second attempt, and the first one failed in a way worth being
public about — partly because it explains the conventions in
[CLAUDE.md](../CLAUDE.md), which otherwise look like arbitrary strictness.

## The first attempt, July 2025 – September 2025

Development stopped after roughly 118 commits, spread across several AI coding
tools. There was no shortage of code. What there was no supply of was
verification: features were written, marked done, and never run end to end.

A year later the project was measured rather than described. The result:

| Check                | Result                                 |
| -------------------- | -------------------------------------- |
| `npm run build`      | failed                                 |
| `npm run db:seed`    | failed                                 |
| `npm run type-check` | 686 errors                             |
| `npm run lint`       | 180 errors, and not run at build time  |
| Jest                 | 101 of 114 suites failing, 0% coverage |
| Deployment           | had never happened                     |
| Booking loop         | had never completed once               |

The mechanical root cause was small and had been there for months: a seed
factory that computed required fields and then failed to return them. No seed
meant no working local app, which meant no end-to-end test was possible, which
meant nothing was ever verified. That is how "86% MVP complete" and 0% test
coverage managed to coexist. The status was sincere. It was also derived from
counting written code rather than working code.

The project had also accumulated 335 documents and 85 spec files describing
work that did not run.

## The rebuild, from July 2026

Not a rewrite. The same product, with a feedback loop attached and a small
number of rules that exist because their absence caused the failure:

- **Nothing is done because it was written.** It is done when
  `type-check && lint && test && build && test:e2e` passes.
- **A small CI gate that is actually green** beats a comprehensive one that is
  permanently red and therefore ignored. Checks are added back as they start
  passing, never before.
- **One branch per pull request, small batches.** A branch open for weeks
  produces a diff nobody can review and no feedback until the end.
- **One living plan**, [docs/PLAN.md](PLAN.md), updated in place. Not a second
  plan, not a per-phase plan, not a status report.
- **If a correction comes up twice, it becomes a lint rule or a test.**
  Enforcement beats documentation, which is why this file is short.

## Where that has got to

| Check                           | Before                                 | Now                       |
| ------------------------------- | -------------------------------------- | ------------------------- |
| `npm run build`                 | fails                                  | passes, 80 pages          |
| `npm run db:seed`               | fails                                  | works                     |
| `npm run type-check`            | 686 errors                             | 0                         |
| `npm run lint`                  | 180 errors, not run at build           | 0, and it gates the build |
| Jest                            | 101 of 114 suites failing, 0% coverage | curated suite green in CI |
| Deployment                      | never happened                         | auto-deploys on green CI  |
| Booking loop                    | never completed once                   | green end to end          |
| Production CVEs (high/critical) | 16                                     | 2                         |

The habit that came out of it, and the one most worth stealing: fix things by
measuring them. "The booking page feels slow" is not a diagnosis. "One
availability request runs 1,318 database queries and reads the same opening
hours 180 times" is, and it tells you what to do next.

## The repository moved, and why the history is short

Lumina lives at `effuselabs/lumina`. It was rebuilt there rather than
transferred, and the git history was rewritten first.

A secret scan over the original history found ten matches. Most were harmless —
build manifests, a fake Stripe key in a test fixture, examples in documentation
— but four were an API key for the issue tracker used during the first attempt,
committed inside an IDE's configuration directory and left in history when that
directory was deleted. The key belonged to an account that no longer exists on a
service no longer in use, so nothing was at risk, but a credential in a public
history is worth removing on principle rather than on impact.

`git filter-repo` removed that directory, the committed `.next/` build output,
and about 185 documentation files from a directory tree that had been deleted
long ago. History went from 331 commits and 19 MiB to 304 and 6.6 MiB, with the
current file tree unchanged.

Force-pushing was not enough. GitHub keeps `refs/pull/N/head` pointing at the
original commits of every pull request, and those survive any rewrite — the old
commits were still fetchable by SHA afterwards. Recreating the repository is the
only way to leave them behind, which is why the pull request history from the
first attempt is not here. It is archived offline.

The lesson worth keeping: a scan is cheap and a rewrite is only cheap before
anyone has cloned you.

## A note on this file

There is no `CHANGELOG.md` yet, on purpose. The previous one was maintained by
hand, went a year without an entry, and its final entry recorded the 86% figure
above. Conventional commits are enforced, so a changelog can be generated from
history at the first release rather than hand-written and left to rot.
