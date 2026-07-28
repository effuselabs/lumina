# Lumina documentation

Everything here describes the system as it actually is. If a document and the
code disagree, the code wins and the document is a bug.

## Getting started

- [Development setup](development-setup.md) — local environment
- [Project overview](project-overview.md) — what Lumina is and who it serves
- [Contributing](../CONTRIBUTING.md) — workflow and standards

## Reference

- [API reference](api/README.md) — REST endpoints and schemas

## Not here yet

These are produced by later phases of the rebuild, and deliberately do not
exist yet rather than existing and being wrong:

- **Architecture** (`architecture.md`) — request flow, auth enforcement,
  data-access boundaries
- **Environments** (`environments.md`) — local, staging and production on
  Railway, plus the deploy pipeline
- **Design system** (`design-system/`) and **brand guide** (`brand/README.md`)
  — generated from the design token source of truth, so they cannot drift from
  the application. The previous 29 hand-written design-system documents are
  what made drift possible; they were removed rather than updated.
- **Testing** — written once the rebuilt suite is green, so that it describes
  real tests rather than intended ones

## A note on history

This directory previously held 335 markdown files, 38% of whose internal links
were broken, describing features that did not work and processes nobody
followed. It was reduced to the set above. Documentation is added back only
when it describes something verified.
