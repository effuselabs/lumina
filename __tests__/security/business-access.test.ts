/**
 * `NextResponse` extends the Web `Response`, which jsdom does not provide.
 * This suite is about an API guard, so the node environment is the honest one.
 *
 * @jest-environment node
 */
import { authorizeBusinessAccess } from '@/lib/auth/business-access';
import { prisma } from '@/lib/prisma';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: { businessUser: { findUnique: jest.fn() } },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { auth } = require('@/auth');

const SALON_A = 'clsalonaaaaaaaaaaaaaaaaaa';
const SALON_B = 'clsalonbbbbbbbbbbbbbbbbbb';

function signedInAs(userId: string) {
  asMock(auth).mockResolvedValue({ user: { id: userId } });
}

describe('authorizeBusinessAccess', () => {
  beforeEach(() => {
    asMock(prisma.businessUser.findUnique).mockResolvedValue(null);
  });

  it('rejects an anonymous caller with 401', async () => {
    asMock(auth).mockResolvedValue(null);

    const access = await authorizeBusinessAccess(SALON_A);

    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(401);
    expect(prisma.businessUser.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a missing businessId with 400', async () => {
    signedInAs('user-1');

    const access = await authorizeBusinessAccess(null);

    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(400);
  });

  it("refuses a signed-in user access to a business they don't belong to", async () => {
    // The whole point. A valid session for salon A is not authorization for
    // salon B, and before this guard existed a route that checked only for a
    // session would have served B's data here.
    signedInAs('owner-of-salon-a');
    asMock(prisma.businessUser.findUnique).mockResolvedValue(null);

    const access = await authorizeBusinessAccess(SALON_B);

    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(403);
  });

  it('queries membership scoped to both the business and the user', async () => {
    signedInAs('user-1');

    await authorizeBusinessAccess(SALON_A);

    expect(prisma.businessUser.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId_userId: { businessId: SALON_A, userId: 'user-1' } },
      })
    );
  });

  it('admits a member and reports their role', async () => {
    signedInAs('user-1');
    asMock(prisma.businessUser.findUnique).mockResolvedValue({
      role: 'MANAGER',
    });

    const access = await authorizeBusinessAccess(SALON_A);

    expect(access).toEqual({
      ok: true,
      userId: 'user-1',
      businessId: SALON_A,
      role: 'MANAGER',
    });
  });

  it('refuses a member whose role is not allowed', async () => {
    signedInAs('user-1');
    asMock(prisma.businessUser.findUnique).mockResolvedValue({ role: 'STAFF' });

    const access = await authorizeBusinessAccess(SALON_A, {
      allowedRoles: ['OWNER', 'MANAGER'],
    });

    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(403);
  });

  it('admits a member whose role is allowed', async () => {
    signedInAs('user-1');
    asMock(prisma.businessUser.findUnique).mockResolvedValue({ role: 'OWNER' });

    const access = await authorizeBusinessAccess(SALON_A, {
      allowedRoles: ['OWNER', 'MANAGER'],
    });

    expect(access.ok).toBe(true);
  });

  it('gives the same answer for a non-member and a business that does not exist', async () => {
    // Both are `findUnique` -> null. Distinguishing them would make the
    // endpoint an oracle for which business ids are real.
    signedInAs('user-1');

    const nonMember = await authorizeBusinessAccess(SALON_B);
    const nonExistent = await authorizeBusinessAccess(
      'clnope000000000000000000'
    );

    expect(nonMember.ok).toBe(false);
    expect(nonExistent.ok).toBe(false);
    if (!nonMember.ok && !nonExistent.ok) {
      expect(await nonMember.response.json()).toEqual(
        await nonExistent.response.json()
      );
    }
  });
});
