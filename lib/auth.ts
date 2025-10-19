import { auth } from '@/auth';
import type { UserWithRelations } from '@/types/database';
import type { BusinessRole, UserRole } from '@prisma/client';
import { redirect } from 'next/navigation';
import { randomBytes } from 'node:crypto';
import { prisma } from './prisma';

// Re-export auth for use in other modules
export { auth };

// Get the current session
export async function getSession() {
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

// Require authentication - redirect to login if not authenticated
export async function requireAuth() {
  const session = await getSession();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return session;
}

// Require specific role
export async function requireRole(allowedRoles: UserRole[]) {
  const session = await requireAuth();

  if (!allowedRoles.includes(session.user.role as UserRole)) {
    redirect('/unauthorized');
  }

  return session;
}

// Check if user has access to a business
export async function requireBusinessAccess(
  businessId: string,
  allowedRoles?: BusinessRole[]
) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const businessUser = user.businesses.find(bu => bu.businessId === businessId);

  if (!businessUser) {
    redirect('/unauthorized');
  }

  if (allowedRoles && !allowedRoles.includes(businessUser.role)) {
    redirect('/unauthorized');
  }

  return { user, businessUser };
}

// Check if user is business owner
export async function requireBusinessOwner(businessId: string) {
  return await requireBusinessAccess(businessId, ['OWNER']);
}

// Check if user is business owner or manager
export async function requireBusinessManager(businessId: string) {
  return await requireBusinessAccess(businessId, ['OWNER', 'MANAGER']);
}

// Get user's businesses
export async function getUserBusinesses() {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  return user.businesses.map(bu => ({
    ...bu.business,
    userRole: bu.role,
  }));
}

// Get user's primary business (first business they're associated with)
export async function getPrimaryBusiness() {
  const businesses = await getUserBusinesses();
  return businesses[0] || null;
}

// Check permissions for specific actions
export const permissions = {
  // Business management
  canManageBusiness: (userRole: BusinessRole) => ['OWNER'].includes(userRole),
  canManageStaff: (userRole: BusinessRole) =>
    ['OWNER', 'MANAGER'].includes(userRole),
  canManageServices: (userRole: BusinessRole) =>
    ['OWNER', 'MANAGER'].includes(userRole),
  canManageClients: (userRole: BusinessRole) =>
    ['OWNER', 'MANAGER', 'STAFF'].includes(userRole),

  // Appointment management
  canCreateAppointments: (userRole: BusinessRole) =>
    ['OWNER', 'MANAGER', 'STAFF'].includes(userRole),
  canModifyAppointments: (userRole: BusinessRole) =>
    ['OWNER', 'MANAGER'].includes(userRole),
  canViewAllAppointments: (userRole: BusinessRole) =>
    ['OWNER', 'MANAGER'].includes(userRole),

  // Financial access
  canViewFinancials: (userRole: BusinessRole) =>
    ['OWNER', 'MANAGER'].includes(userRole),
  canProcessPayments: (userRole: BusinessRole) =>
    ['OWNER', 'MANAGER', 'STAFF'].includes(userRole),

  // Settings and configuration
  canManageSettings: (userRole: BusinessRole) => ['OWNER'].includes(userRole),
  canManageIntegrations: (userRole: BusinessRole) =>
    ['OWNER', 'MANAGER'].includes(userRole),
};

// Utility function to check if user can perform an action
export async function canUserPerformAction(
  businessId: string,
  action: keyof typeof permissions
): Promise<boolean> {
  try {
    const { businessUser } = await requireBusinessAccess(businessId);
    return permissions[action](businessUser.role);
  } catch {
    return false;
  }
}

// Multi-tenant data access helpers
export async function getBusinessScopedData<T>(
  businessId: string,
  dataFetcher: () => Promise<T>
): Promise<T | null> {
  try {
    await requireBusinessAccess(businessId);
    return await dataFetcher();
  } catch {
    return null;
  }
}

// Session helpers for client components
export function isAuthenticated(session: any): boolean {
  return !!session?.user;
}

export function hasRole(session: any, roles: UserRole[]): boolean {
  return session?.user?.role && roles.includes(session.user.role);
}

export function hasBusinessRole(
  session: any,
  businessId: string,
  roles: BusinessRole[]
): boolean {
  if (!session?.user?.businesses) return false;

  const businessUser = session.user.businesses.find(
    (bu: any) => bu.businessId === businessId
  );
  return businessUser && roles.includes(businessUser.role);
}
// Generate secure invitation token
export function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
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
