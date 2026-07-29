import { DEMO_BUSINESS_SLUG, resetDemoData } from '@/prisma/reset-demo-data';
import type { PrismaClient } from '@prisma/client';

/**
 * This script deletes data, and it exists to be pointed at deployed databases.
 * The property that keeps that safe is that it removes exactly one row, matched
 * by the demo business's slug — never a table wipe, never "everything in this
 * environment". A real salon that signs up on staging must survive it.
 *
 * These tests pin that scoping. If someone later broadens the delete, they fail.
 */

function prismaDouble(business: { id: string; name: string } | null) {
  const businessDelete = jest.fn().mockResolvedValue({});

  const prisma = {
    business: {
      findUnique: jest.fn().mockResolvedValue(business),
      delete: businessDelete,
    },
    staff: { count: jest.fn().mockResolvedValue(8) },
    service: { count: jest.fn().mockResolvedValue(40) },
    client: { count: jest.fn().mockResolvedValue(50) },
    appointment: { count: jest.fn().mockResolvedValue(500) },
  } as unknown as PrismaClient;

  return { prisma, businessDelete };
}

describe('demo data reset', () => {
  it('looks the business up by the demo slug, not by anything broader', async () => {
    const { prisma } = prismaDouble({ id: 'biz-1', name: 'Lumina Demo Salon' });

    await resetDemoData(prisma);

    expect(prisma.business.findUnique).toHaveBeenCalledWith({
      where: { slug: DEMO_BUSINESS_SLUG },
      select: { id: true, name: true },
    });
  });

  it('deletes exactly one business, by id', async () => {
    const { prisma, businessDelete } = prismaDouble({
      id: 'biz-1',
      name: 'Lumina Demo Salon',
    });

    await resetDemoData(prisma);

    expect(businessDelete).toHaveBeenCalledTimes(1);
    expect(businessDelete).toHaveBeenCalledWith({ where: { id: 'biz-1' } });

    // A `deleteMany` anywhere in here would mean the blast radius is no longer
    // one identified row.
    expect(
      (prisma.business as unknown as Record<string, unknown>).deleteMany
    ).toBeUndefined();
  });

  it('does nothing when the demo business is absent', async () => {
    const { prisma, businessDelete } = prismaDouble(null);

    const outcome = await resetDemoData(prisma);

    expect(outcome).toEqual({ found: false });
    expect(businessDelete).not.toHaveBeenCalled();
  });

  it('reports what it removed', async () => {
    const { prisma } = prismaDouble({ id: 'biz-1', name: 'Lumina Demo Salon' });

    const outcome = await resetDemoData(prisma);

    expect(outcome).toEqual({
      found: true,
      businessId: 'biz-1',
      deleted: { staff: 8, services: 40, clients: 50, appointments: 500 },
    });
  });

  it('uses the same slug the seed creates', async () => {
    // Drift here would make the reset silently stop matching, and the seed
    // would start duplicating again with no error.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const seedSource = require('fs').readFileSync(
      require('path').join(process.cwd(), 'prisma/seed.ts'),
      'utf8'
    );

    expect(seedSource).toContain(`slug: '${DEMO_BUSINESS_SLUG}'`);
  });
});
