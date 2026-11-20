import { faker } from '@faker-js/faker';
import { loadSeedConfig } from '@/prisma/factories/seed-config';
import { StaffFactory } from '@/prisma/factories/staff-factory';
import type { PrismaClient } from '@prisma/client';

/**
 * `db:seed:refresh` deletes the demo salon and seeds it again. The reset keeps
 * user accounts, which outlive any one business, and the seed's random source
 * is fixed (#112), so the second run generates the same staff emails as the
 * first. Creating those accounts afresh failed on the unique email, and the
 * refresh never got past its first staff member. Staff accounts are found by
 * email and reused, as the demo logins already are.
 */
function userTable() {
  const byEmail = new Map<string, { id: string; email: string }>();
  const insert = (data: { email: string }) => {
    if (byEmail.has(data.email)) {
      throw Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
      });
    }
    const row = { id: `user-${byEmail.size + 1}`, ...data };
    byEmail.set(data.email, row);
    return row;
  };
  return {
    create: jest.fn(({ data }) => insert(data)),
    upsert: jest.fn(
      ({ where, create }) => byEmail.get(where.email) ?? insert(create)
    ),
  };
}

describe('seeding staff a second time', () => {
  it('reuses the accounts the reset left behind', async () => {
    const prisma = {
      user: userTable(),
      staff: { create: jest.fn(({ data }) => ({ id: 'staff', ...data })) },
    } as unknown as PrismaClient;

    const { specialties } = loadSeedConfig().staff;

    faker.seed(1);
    const first = await new StaffFactory(
      prisma,
      'business-1',
      specialties
    ).generate();
    faker.seed(1);
    const second = await new StaffFactory(
      prisma,
      'business-2',
      specialties
    ).generate();

    expect(second.userId).toBe(first.userId);
  });
});
