import { calculateBusinessRevenue } from '@/lib/financial/transaction-service';
import { prisma } from '@/lib/prisma';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';
import { Prisma } from '@prisma/client';

/**
 * Refunds are stored negative by the seed (its validator insists on it) and
 * positive by createRefund. Net revenue subtracted the raw sum, so a negative
 * refund was added back: on seeded data the financial report overstated
 * revenue by every refund.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: { transaction: { findMany: jest.fn() } },
}));

const money = (amount: number) => ({ amount: new Prisma.Decimal(amount) });

describe('calculateBusinessRevenue', () => {
  const window = [new Date('2026-10-01'), new Date('2026-10-31')] as const;

  it.each([
    ['negative, as the seed stores it', -30],
    ['positive, as createRefund stores it', 30],
  ])('subtracts a refund stored %s', async (_, refund) => {
    asMock(prisma.transaction.findMany)
      .mockResolvedValueOnce([money(100)])
      .mockResolvedValueOnce([money(refund)]);

    const result = await calculateBusinessRevenue('business-1', ...window);

    expect(result.totalRefunds).toBe(30);
    expect(result.netRevenue).toBe(70);
  });
});
