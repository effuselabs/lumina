import { auth } from '@/auth';
import type { UserWithRelations } from '@/types/database';
import type { BusinessRole } from '@prisma/client';
import { redirect } from 'next/navigation';
import { prisma } from './prisma';

// Re-export auth for use in other modules
export { auth };

// Get the current session
async function getSession() {
  return await auth();
}

// Get the current user with full relations
export async function getCurrentUser(): Promise<UserWithRelations | null> {
  const session = await getSession();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      businesses: {
        include: {
          business: true,
        },
      },
      staffProfile: {
        include: {
          business: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      },
    },
  });

  return user;
}

// Check if user has access to a business
/**
 * The tenant check for a `/dashboard/[businessSlug]` page. Resolves the slug,
 * proves the signed-in user belongs to that business, and returns the
 * business with the user's role — or redirects:
 *
 * - no session → `/auth/signin`
 * - no such business, or not a member → `/onboarding`. The two are the same
 *   redirect on purpose, so a URL does not reveal whether a business exists.
 * - a role outside `allowedRoles` → back to `/dashboard/<slug>`
 *
 * For pages only. It calls `redirect()`, which throws; in an API route use
 * `authorizeBusinessAccess` from `lib/auth/business-access.ts`, and never call
 * this inside a `try` whose `catch` would swallow the redirect.
 * `__tests__/security/dashboard-page-access.test.ts` holds every dashboard
 * page to it.
 */
export async function requireBusinessAccess(
  businessSlug: string,
  allowedRoles?: BusinessRole[]
) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const found = await prisma.business.findUnique({
    where: { slug: businessSlug },
    include: {
      users: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  const membership = found?.users[0];
  if (!found || !membership) {
    redirect('/onboarding');
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    redirect(`/dashboard/${businessSlug}`);
  }

  const { users: _users, ...business } = found;
  return { user: session.user, business, role: membership.role };
}

// Verify and consume invitation token
export async function verifyInviteToken(token: string) {
  const invitation = await prisma.staffInvitation.findUnique({
    where: { token },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new Error('Invalid invitation token');
  }

  if (invitation.status !== 'PENDING') {
    throw new Error('Invitation has already been used or cancelled');
  }

  if (invitation.expiresAt < new Date()) {
    // Mark as expired
    await prisma.staffInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    throw new Error('Invitation has expired');
  }

  return invitation;
}

// Accept staff invitation and create user/staff profile
interface StaffInvitationData {
  displayName: string;
  title: string;
  employmentType: string;
  commissionRate: number;
  chairRentalAmount?: number;
  chairRentalPeriod?: string;
  baseSalary?: number;
}

export async function acceptStaffInvitation(
  token: string,
  userData: {
    name: string;
    password: string;
  }
) {
  const invitation = await verifyInviteToken(token);
  const staffData = invitation.staffData as unknown as StaffInvitationData;

  return await prisma.$transaction(async tx => {
    // Create or update user
    let user = await tx.user.findUnique({
      where: { email: invitation.email },
    });

    if (!user) {
      // Create new user
      const { hash } = await import('bcryptjs');
      const hashedPassword = await hash(userData.password, 12);

      user = await tx.user.create({
        data: {
          email: invitation.email,
          name: userData.name,
          password: hashedPassword,
          role: 'STAFF',
        },
      });
    }

    // Create business user relationship
    await tx.businessUser.create({
      data: {
        businessId: invitation.businessId,
        userId: user.id,
        role: invitation.role,
      },
    });

    // Create staff profile
    const staff = await tx.staff.create({
      data: {
        businessId: invitation.businessId,
        userId: user.id,
        displayName: staffData.displayName,
        title: staffData.title,
        employmentType: staffData.employmentType as any,
        commissionRate: staffData.commissionRate,
        chairRentalAmount: staffData.chairRentalAmount,
        chairRentalPeriod: staffData.chairRentalPeriod as any,
        baseSalary: staffData.baseSalary,
      } as any,
    });

    // Mark invitation as accepted
    await tx.staffInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    return { user, staff, business: invitation.business };
  });
}
