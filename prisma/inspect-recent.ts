/**
 * Show what is actually in a database, for verifying a deployed environment.
 *
 * Walking the booking loop on staging produced a confirmed appointment with a
 * confirmation number, and a Clients page that could not find the client. The
 * dashboard's count is a true `prisma.client.count({ where: { businessId } })`,
 * so the disagreement was real and unresolvable from the UI — which shows
 * business data through several layers of filtering, caching and pagination,
 * every one of which can hide a row that exists.
 *
 * This reads rows directly and prints them. It writes nothing.
 *
 * Usage:
 *   npm run db:inspect                       # local
 *   DATABASE_URL="…" npm run db:inspect      # a deployed database
 *
 * PowerShell:
 *   $env:DATABASE_URL = "…"; npm run db:inspect
 *   Remove-Item Env:\DATABASE_URL
 *
 * Times are printed twice — as the stored UTC instant, and in the business's
 * own timezone — because those disagreeing is currently a known defect (see
 * "Availability times are timezone-wrong" in docs/PLAN.md).
 */

import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const RECENT_LIMIT = 5;

function inBusinessZone(instant: Date, timezone: string): string {
  return DateTime.fromJSDate(instant)
    .setZone(timezone)
    .toFormat('ccc yyyy-LL-dd HH:mm ZZZZ');
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const [{ current_database: database }] = await prisma.$queryRaw<
      Array<{ current_database: string }>
    >`SELECT current_database()`;
    console.log(`\n📊 Inspecting "${database}"\n`);

    // Every business, not just the demo one. Two businesses with the same name
    // is one of the few explanations for a row that exists and cannot be found,
    // and it is invisible from inside a single tenant's dashboard.
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        _count: { select: { clients: true, appointments: true, staff: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Businesses: ${businesses.length}`);
    for (const business of businesses) {
      console.log(`  ${business.name}  (slug: ${business.slug})`);
      console.log(`    id:       ${business.id}`);
      console.log(`    timezone: ${business.timezone}`);
      console.log(
        `    clients: ${business._count.clients}  ` +
          `appointments: ${business._count.appointments}  ` +
          `staff: ${business._count.staff}`
      );
    }

    if (businesses.length === 0) {
      console.log('\nNothing else to show — this database has no businesses.');
      return;
    }

    for (const business of businesses) {
      console.log(`\n── ${business.name} ─────────────────────────────`);

      const clients = await prisma.client.findMany({
        where: { businessId: business.id },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
      });

      console.log(`\n  ${RECENT_LIMIT} most recent clients:`);
      for (const client of clients) {
        console.log(
          `    ${client.createdAt.toISOString()}  ` +
            `${client.firstName} ${client.lastName}  <${client.email ?? 'no email'}>`
        );
      }
      if (clients.length === 0) console.log('    (none)');

      const appointments = await prisma.appointment.findMany({
        where: { businessId: business.id },
        select: {
          id: true,
          startTime: true,
          status: true,
          createdAt: true,
          // `clientId` is optional and the appointment carries its own
          // clientName/clientEmail for walk-ins, so an appointment can exist
          // with no Client row. Print both, so "booked but no client record"
          // is visible rather than inferred.
          clientId: true,
          clientName: true,
          clientEmail: true,
          client: { select: { firstName: true, lastName: true, email: true } },
          staff: { select: { displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
      });

      console.log(`\n  ${RECENT_LIMIT} most recently created appointments:`);
      for (const appointment of appointments) {
        // The booking UI shows a "confirmation number" that is not stored —
        // it is derived from the id — so match on the id instead.
        console.log(`    ${appointment.id}`);
        console.log(
          `      created:      ${appointment.createdAt.toISOString()}`
        );
        console.log(
          `      stored UTC:   ${appointment.startTime.toISOString()}`
        );
        console.log(
          `      salon local:  ${inBusinessZone(appointment.startTime, business.timezone)}`
        );

        if (appointment.client) {
          console.log(
            `      client row:   ${appointment.client.firstName} ` +
              `${appointment.client.lastName} <${appointment.client.email ?? 'no email'}>`
          );
        } else {
          console.log(
            `      client row:   NONE — appointment carries ` +
              `"${appointment.clientName ?? ''}" <${appointment.clientEmail ?? ''}> inline`
          );
        }

        console.log(
          `      staff:        ${appointment.staff?.displayName ?? 'unassigned'} — ${appointment.status}`
        );
      }
      if (appointments.length === 0) console.log('    (none)');
    }

    console.log('');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('❌ Inspection failed:', error);
  process.exit(1);
});
