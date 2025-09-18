import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

/**
 * Dashboard Redirect Handler
 *
 * This page handles the /dashboard route by:
 * 1. Verifying user authentication (handled by middleware)
 * 2. Looking up the user's business relationships
 * 3. Redirecting to the appropriate destination
 *
 * Security: All database queries are user-scoped for multi-tenant isolation
 */
export default async function DashboardRedirect() {
  console.log('🚨 DASHBOARD PAGE EXECUTING - THIS SHOULD SHOW IN LOGS');
  const session = await auth();

  // This should not happen due to middleware, but double-check
  if (!session?.user?.id) {
    console.log('❌ No session in dashboard redirect, redirecting to signin');
    redirect('/auth/signin');
  }

  console.log('🔄 Dashboard redirect for user:', {
    userId: session.user.id,
    email: session.user.email,
    timestamp: new Date().toISOString(),
  });

  try {
    // Look up user's business relationships
    const userBusinesses = await prisma.businessUser.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Use first business if multiple
      },
    });

    console.log('🔍 User business lookup result:', {
      userId: session.user.id,
      businessCount: userBusinesses.length,
      businesses: userBusinesses.map(ub => ({
        businessId: ub.business.id,
        businessName: ub.business.name,
        businessSlug: ub.business.slug,
        userRole: ub.role,
        isActive: ub.business.isActive,
      })),
    });

    // All businesses are considered active since there's no isActive field
    const activeBusinesses = userBusinesses;

    if (activeBusinesses.length === 0) {
      console.log(
        '❌ No active business relationships found, redirecting to onboarding'
      );
      redirect('/onboarding');
    }

    // Use the first active business
    const primaryBusiness = activeBusinesses[0];

    console.log('✅ Redirecting to business dashboard:', {
      businessId: primaryBusiness.business.id,
      businessName: primaryBusiness.business.name,
      businessSlug: primaryBusiness.business.slug,
      userRole: primaryBusiness.role,
    });

    // Redirect to business-specific dashboard
    redirect(`/dashboard/${primaryBusiness.business.slug}`);
  } catch (error) {
    console.error('❌ Dashboard redirect error:', error);

    // Log the error details for debugging
    console.error('Error details:', {
      userId: session.user.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Fallback to onboarding on any database error
    redirect('/onboarding');
  }
}
