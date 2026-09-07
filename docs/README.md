# Lumina documentation

Everything here describes the system as it actually is. If a document and the
code disagree, the code wins and the document is a bug.

There is deliberately not much of it. Each file below has one job, and nothing
is added back until it describes something verified.

## Start here

- [Development setup](development-setup.md) — prerequisites, local database,
  environment variables, and the scripts you will actually use
- [Contributing](../CONTRIBUTING.md) — branch and commit conventions, the
  tenant-scoping rule, sign-off
- [CLAUDE.md](../CLAUDE.md) — the working agreement: the rules that are not
  negotiable and why each one exists

## What is happening and why

- [The plan](PLAN.md) — where the rebuild is, what is next, and what is parked
  on purpose. Updated in place; it is the only status document
- [History](history.md) — how the project stalled, what the audit found, and
  why the conventions look the way they do

## Running it somewhere

- [Environments](environments.md) — local, staging and production on Railway,
  the deploy pipeline, environment variables, and which routes bypass session
  auth

## Not here, on purpose

These arrive with the phases that produce them, rather than existing and being
wrong in the meantime:

- **Architecture** — request flow, auth enforcement, data-access boundaries
- **Design system and brand guide** — generated from the design token source of
  truth so they cannot drift from the application. The previous 29 hand-written
  design-system documents are what made drift possible
- **Testing** — written once the rebuilt suite is green, so it describes real
  tests rather than intended ones
- **API reference** — the previous one documented a route that did not exist,
  Stripe endpoints for a parked feature, and a service with no source file. If
  it returns it will be generated from the route handlers, not hand-written

## A note on history

This directory once held 335 markdown files, 38% of whose internal links were
broken, describing features that did not work and processes nobody followed. It
is now five files. Documentation is added back only when it describes something
that has been run.
