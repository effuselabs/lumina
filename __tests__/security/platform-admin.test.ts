/**
 * `NextResponse` extends the Web `Response`, which jsdom does not provide.
 *
 * @jest-environment node
 */
import { authorizePlatformAdmin } from '@/lib/auth/platform-admin';
import { prisma } from '@/lib/prisma';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';

/**
 * Application-wide endpoints — system alerts, the email queue's health —
 * answered any signed-in user of any salon (#72). They now answer only a
 * platform administrator, whose role is granted from the command line.
 */

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: jest.fn() } },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { auth } = require('@/auth');

function signedInAs(id: string, sessionRole?: string) {
  asMock(auth).mockResolvedValue({ user: { id, role: sessionRole } });
}

describe('authorizePlatformAdmin', () => {
  beforeEach(() => {
    asMock(prisma.user.findUnique).mockResolvedValue(null);
  });

  it('rejects an anonymous caller with 401', async () => {
    asMock(auth).mockResolvedValue(null);

    const access = await authorizePlatformAdmin();

    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(401);
  });

  it('refuses a salon owner with 403', async () => {
    signedInAs('owner-1');
    asMock(prisma.user.findUnique).mockResolvedValue({ role: 'OWNER' });

    const access = await authorizePlatformAdmin();

    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(403);
  });

  it('refuses a session whose user no longer exists', async () => {
    signedInAs('deleted-user');

    const access = await authorizePlatformAdmin();

    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(403);
  });

  it('admits a platform administrator', async () => {
    signedInAs('admin-1');
    asMock(prisma.user.findUnique).mockResolvedValue({ role: 'SUPER_ADMIN' });

    const access = await authorizePlatformAdmin();

    expect(access).toEqual({ ok: true, userId: 'admin-1' });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      select: { role: true },
    });
  });

  it('believes the database, not the session token, so revoking is immediate', async () => {
    // The token was issued while the role was held; it has since been revoked.
    signedInAs('former-admin', 'SUPER_ADMIN');
    asMock(prisma.user.findUnique).mockResolvedValue({ role: 'OWNER' });

    const access = await authorizePlatformAdmin();

    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(403);
  });
});
