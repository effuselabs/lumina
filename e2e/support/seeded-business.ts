import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | undefined;

/** The seeded salon. Looked up, not hardcoded, because each seed mints new IDs. */
export async function seededBusiness() {
  prisma ??= new PrismaClient();
  const business = await prisma.business.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, timezone: true },
  });

  if (!business) {
    throw new Error(
      'No active business found. Run `npm run db:seed` before the E2E suite.'
    );
  }

  return business;
}
