import {
  grantPlatformAdmin,
  listPlatformAdmins,
  revokePlatformAdmin,
} from '../../scripts/platform-admin';

/**
 * The only way to become a platform administrator (#72): a command run by
 * whoever has access to the database. These pin down that it never creates
 * an account, refuses an ambiguous address, and that revoking hands back the
 * role the person would otherwise have.
 */

function fakeDb(
  users: { id: string; email: string; role: string }[],
  owns = 0
) {
  return {
    user: {
      findMany: jest.fn(
        async ({
          where,
        }: {
          where: { email?: { equals: string }; role?: string };
        }) =>
          users.filter(user =>
            where.email
              ? user.email.toLowerCase() === where.email.equals.toLowerCase()
              : user.role === where.role
          )
      ),
      update: jest.fn(async () => ({})),
    },
    businessUser: { count: jest.fn(async () => owns) },
  };
}

type Db = Parameters<typeof grantPlatformAdmin>[0];
const asDb = (db: ReturnType<typeof fakeDb>) => db as unknown as Db;

describe('platform-admin script', () => {
  it('grants the role to an existing account, matching email without case', async () => {
    const db = fakeDb([{ id: 'u1', email: 'jo@example.com', role: 'OWNER' }]);

    const message = await grantPlatformAdmin(asDb(db), ' JO@example.com ');

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { role: 'SUPER_ADMIN' },
    });
    expect(message).toMatch(/now a platform administrator/);
  });

  it('never creates an account', async () => {
    const db = fakeDb([]);

    await expect(
      grantPlatformAdmin(asDb(db), 'new@example.com')
    ).rejects.toThrow(/Sign up first/);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('refuses an address that matches two accounts ignoring case', async () => {
    const db = fakeDb([
      { id: 'u1', email: 'Jo@example.com', role: 'OWNER' },
      { id: 'u2', email: 'jo@example.com', role: 'STAFF' },
    ]);

    await expect(
      grantPlatformAdmin(asDb(db), 'jo@example.com')
    ).rejects.toThrow(/2 accounts match/);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('revokes back to OWNER for someone who owns a salon, STAFF otherwise', async () => {
    const owner = fakeDb(
      [{ id: 'u1', email: 'jo@example.com', role: 'SUPER_ADMIN' }],
      1
    );
    await revokePlatformAdmin(asDb(owner), 'jo@example.com');
    expect(owner.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { role: 'OWNER' },
    });

    const staff = fakeDb(
      [{ id: 'u2', email: 'sam@example.com', role: 'SUPER_ADMIN' }],
      0
    );
    await revokePlatformAdmin(asDb(staff), 'sam@example.com');
    expect(staff.user.update).toHaveBeenCalledWith({
      where: { id: 'u2' },
      data: { role: 'STAFF' },
    });
  });

  it('lists administrators', async () => {
    const db = fakeDb([
      { id: 'u1', email: 'jo@example.com', role: 'SUPER_ADMIN' },
      { id: 'u2', email: 'sam@example.com', role: 'OWNER' },
    ]);

    expect(await listPlatformAdmins(asDb(db))).toBe('jo@example.com');
  });
});
