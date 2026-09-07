# Security

## Reporting a vulnerability

**Please do not open a public issue.**

Use GitHub's private vulnerability reporting: the **Security** tab on this
repository, then **Report a vulnerability**. It goes only to the maintainers and
lets us discuss a fix before anything is public.

You should get an acknowledgement within a few days. Lumina is maintained by a
very small team, so please allow a little patience — you will get a real answer
rather than an automated one.

## What is worth reporting

Lumina is multi-tenant: every salon's data must be invisible to every other
salon. Anything that crosses that boundary is the most serious class of bug
here, and worth reporting even if you are not certain it is exploitable:

- Reading, writing or inferring another business's data — clients, staff,
  appointments, takings
- Authentication or session handling that lets one account act as another
- A tenant-scoped route that trusts a `businessId` from a URL or request body
  rather than checking it against the session
- Anything that lets an unauthenticated visitor reach an authenticated route

Also worth reporting: injection of any kind, secrets exposed by the application
at runtime, and denial of service that a single client can trigger cheaply.

## What is already known, and not worth reporting

Several of these are recorded in [docs/PLAN.md](docs/PLAN.md) with more detail:

- **Booking conflicts are re-checked outside the transaction that writes the
  appointment**, so two simultaneous bookings of the same slot can both pass the
  check. Known, and fixed before Lumina takes real customers.
- Values in `.env.example`, `docker-compose.yml` and test fixtures are local
  placeholders. They grant access to nothing and are deliberately committed so
  that a fresh clone runs.
- Findings from an automated scanner with no working proof of concept. We would
  rather have your judgement than your tool's output.

## Which versions get fixes

Lumina is pre-release. There are no tagged releases and no supported older
versions: `main` is the only supported code, and fixes land there. This section
will say something more useful once there is a release to support.

## Scope

This repository and the software in it. Deployments run by other people are
theirs to secure — that is the trade AGPL-3.0 makes. If you find something in
Effuse Labs' own hosted service, report it here and say so.
