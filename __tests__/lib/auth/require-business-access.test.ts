/**
 * @jest-environment node
 */
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    // The real redirect() throws, which is what stops the page rendering.
    throw new Error(`REDIRECT ${url}`);
  }),
}));
jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: { business: { findUnique: jest.fn() } },
}));

import { auth } from '@/auth';
import { requireBusinessAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockAuth = auth as unknown as jest.Mock;
const findUnique = prisma.business.findUnique as unknown as jest.Mock;

const session = { user: { id: 'user-1', name: 'Owner', email: 'o@x.test' } };
const business = { id: 'biz-1', slug: 'salon', name: 'Salon' };

beforeEach(() => {
  mockAuth.mockReset();
  findUnique.mockReset();
});

describe('requireBusinessAccess', () => {
  it('sends a visitor with no session to sign in', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireBusinessAccess('salon')).rejects.toThrow(
      'REDIRECT /auth/signin'
    );
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('sends a non-member to onboarding', async () => {
    mockAuth.mockResolvedValue(session);
    findUnique.mockResolvedValue({ ...business, users: [] });
    await expect(requireBusinessAccess('salon')).rejects.toThrow(
      'REDIRECT /onboarding'
    );
  });

  it('treats an unknown slug exactly like a business you are not in', async () => {
    mockAuth.mockResolvedValue(session);
    findUnique.mockResolvedValue(null);
    await expect(requireBusinessAccess('salon')).rejects.toThrow(
      'REDIRECT /onboarding'
    );
  });

  it('looks up only the signed-in user’s membership', async () => {
    mockAuth.mockResolvedValue(session);
    findUnique.mockResolvedValue({ ...business, users: [{ role: 'OWNER' }] });
    await requireBusinessAccess('salon');
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'salon' },
        include: {
          users: { where: { userId: 'user-1' }, select: { role: true } },
        },
      })
    );
  });

  it('sends a member without an allowed role back to the dashboard', async () => {
    mockAuth.mockResolvedValue(session);
    findUnique.mockResolvedValue({ ...business, users: [{ role: 'STAFF' }] });
    await expect(
      requireBusinessAccess('salon', ['OWNER', 'MANAGER'])
    ).rejects.toThrow('REDIRECT /dashboard/salon');
  });

  it('returns the business, the role and the user for a member', async () => {
    mockAuth.mockResolvedValue(session);
    findUnique.mockResolvedValue({ ...business, users: [{ role: 'MANAGER' }] });
    await expect(
      requireBusinessAccess('salon', ['OWNER', 'MANAGER'])
    ).resolves.toEqual({ user: session.user, business, role: 'MANAGER' });
  });
});
