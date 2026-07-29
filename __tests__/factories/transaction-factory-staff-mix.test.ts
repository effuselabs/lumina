import { TransactionFactory } from '@/prisma/factories/transaction-factory';
import type {
  PaymentMethodDistribution,
  TransactionTypeConfig,
} from '@/prisma/factories/types';
import type { PrismaClient } from '@prisma/client';

/**
 * The seed picked a transaction type by weighted random and only then looked
 * for staff who could plausibly have that kind of transaction. COMMISSION and
 * CHAIR_RENTAL need staff on those employment arrangements, and the seeded
 * staff mix is itself random — 60% commission, 25% chair rental, 15% hybrid.
 *
 * With eight staff, the chance that none of them is chair-rental eligible is
 * 0.6^8, about one run in sixty. On those runs the generator called
 * `faker.helpers.arrayElement` on an empty array, which throws "Cannot get
 * value from empty dataset", and the entire seed failed.
 *
 * A seed that works fifty-nine times out of sixty is the exact failure mode
 * this rebuild exists to remove: no seed means no working local app, which
 * means nothing gets verified. These tests fix the staff mix so the outcome
 * does not depend on a dice roll.
 */

const PAYMENT_MIX: PaymentMethodDistribution = {
  cash: 20,
  card: 60,
  digital: 15,
  other: 5,
};

const TYPE_CONFIG: TransactionTypeConfig = {
  tips: { averagePercentage: 18, range: [10, 25] },
  refunds: { percentage: 2 },
  deposits: { percentage: 2 },
};

type StaffRow = {
  id: string;
  displayName: string;
  employmentType: string;
  commissionRate: number | null;
  chairRentalAmount: number | null;
};

function factoryWithStaff(staff: StaffRow[]) {
  const appointment = {
    id: 'apt-1',
    staffId: staff[0].id,
    status: 'COMPLETED',
    startTime: new Date(),
    services: [{ serviceName: 'Cut', price: 60 }],
    staff: {
      employmentType: staff[0].employmentType,
      commissionRate: staff[0].commissionRate,
      chairRentalAmount: staff[0].chairRentalAmount,
    },
  };

  const prisma = {
    appointment: { findMany: jest.fn().mockResolvedValue([appointment]) },
    staff: { findMany: jest.fn().mockResolvedValue(staff) },
    transaction: {
      create: jest
        .fn()
        .mockImplementation(({ data }) => ({ id: 'tx', ...data })),
    },
  } as unknown as PrismaClient;

  return new TransactionFactory(prisma, 'business-1', PAYMENT_MIX, TYPE_CONFIG);
}

function staffMember(id: string, employmentType: string): StaffRow {
  return {
    id,
    displayName: `Staff ${id}`,
    employmentType,
    commissionRate: employmentType === 'CHAIR_RENTAL' ? null : 45,
    chairRentalAmount: employmentType === 'COMMISSION' ? null : 200,
  };
}

describe('transaction factory across staff employment mixes', () => {
  // Enough draws that a 3%-weighted type is drawn many times over.
  const DRAWS = 300;

  it('seeds a salon where nobody rents a chair', async () => {
    const factory = factoryWithStaff([
      staffMember('a', 'COMMISSION'),
      staffMember('b', 'COMMISSION'),
      staffMember('c', 'COMMISSION'),
    ]);
    await factory.initialize();

    for (let i = 0; i < DRAWS; i++) {
      await expect(factory.generate()).resolves.toBeDefined();
    }
  });

  it('seeds a salon where everyone rents a chair', async () => {
    const factory = factoryWithStaff([
      staffMember('a', 'CHAIR_RENTAL'),
      staffMember('b', 'CHAIR_RENTAL'),
    ]);
    await factory.initialize();

    for (let i = 0; i < DRAWS; i++) {
      await expect(factory.generate()).resolves.toBeDefined();
    }
  });

  it('seeds a mixed salon', async () => {
    const factory = factoryWithStaff([
      staffMember('a', 'COMMISSION'),
      staffMember('b', 'CHAIR_RENTAL'),
      staffMember('c', 'HYBRID'),
    ]);
    await factory.initialize();

    for (let i = 0; i < DRAWS; i++) {
      await expect(factory.generate()).resolves.toBeDefined();
    }
  });
});
