/**
 * Remove the demo salon so the seed can be run again.
 *
 * `prisma/seed.ts` upserts its scaffolding — the demo users, the business, its
 * hours and booking config — but everything the factories produce is created
 * fresh: staff, services, clients, appointments, transactions, availability.
 * Running it twice therefore duplicates the whole catalogue. Six runs against a
 * local database left 280 services where there should have been 40.
 *
 * That makes staging a one-shot: seed it once and you can never refresh it
 * without resetting the entire database, which also destroys any real signups.
 * This script closes that gap.
 *
 * SAFETY — this deletes data, so read how it is scoped:
 *
 *   - It targets ONE row, matched by the demo business's exact slug. It is not
 *     a table wipe and not a "delete everything for this environment". A real
 *     business on the same database is untouched, because its slug is not
 *     `lumina-demo-salon`.
 *   - Deleting that row cascades to its staff, services, clients,
 *     appointments, transactions and availability, all of which declare
 *     `onDelete: Cascade` on their business relation.
 *   - The three demo user accounts are deliberately left alone. They are
 *     upserted by email on the next seed and their `BusinessUser` links
 *     cascade away with the business, so logins keep working.
 *
 * Usage:
 *   npm run db:seed:refresh                      # reset, then seed
 *   DATABASE_URL="…" npm run db:seed:refresh     # against staging
 */

import { PrismaClient } from '@prisma/client';

/** The seed's business, matched exactly. Keep in step with `prisma/seed.ts`. */
export const DEMO_BUSINESS_SLUG = 'lumina-demo-salon';

export interface ResetOutcome {
  found: boolean;
  businessId?: string;
  deleted?: {
    staff: number;
    services: number;
    clients: number;
    appointments: number;
  };
}

/**
 * Delete the demo business and everything that cascades from it.
 *
 * Returns what was removed so the caller can report it. Safe to call when the
 * demo business does not exist — that is the normal first-run case.
 */
export async function resetDemoData(
  prisma: PrismaClient
): Promise<ResetOutcome> {
  const business = await prisma.business.findUnique({
    where: { slug: DEMO_BUSINESS_SLUG },
    select: { id: true, name: true },
  });

  if (!business) {
    return { found: false };
  }

  // Counted before the delete, purely so the operator can see the scale of
  // what is about to go. The cascade does the actual work.
  const [staff, services, clients, appointments] = await Promise.all([
    prisma.staff.count({ where: { businessId: business.id } }),
    prisma.service.count({ where: { businessId: business.id } }),
    prisma.client.count({ where: { businessId: business.id } }),
    prisma.appointment.count({ where: { businessId: business.id } }),
  ]);

  await prisma.business.delete({ where: { id: business.id } });

  return {
    found: true,
    businessId: business.id,
    deleted: { staff, services, clients, appointments },
  };
}

async function main() {
  const prisma = new PrismaClient();

  try {
    // Name the target. When this is pointed at a deployed database the operator
    // should be able to see, from the output alone, which one it hit.
    const [{ current_database: database }] = await prisma.$queryRaw<
      Array<{ current_database: string }>
    >`SELECT current_database()`;

    console.log(`🧹 Resetting demo data in "${database}"`);
    console.log(`   Target: the business with slug "${DEMO_BUSINESS_SLUG}"`);
    console.log('   Other businesses on this database are not touched.');

    const outcome = await resetDemoData(prisma);

    if (!outcome.found) {
      console.log('✅ No demo business present — nothing to remove.');
      return;
    }

    const { staff, services, clients, appointments } = outcome.deleted!;
    console.log(
      `✅ Removed the demo business and its ${staff} staff, ${services} services, ` +
        `${clients} clients and ${appointments} appointments.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Only run when invoked directly, so the exported function stays testable.
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  });
}
