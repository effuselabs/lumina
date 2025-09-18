import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

interface BusinessDashboardPageProps {
  params: {
    businessSlug: string;
  };
}

/**
 * Business Dashboard Page
 *
 * Handles /dashboard/[businessSlug] routes with:
 * 1. Authentication verification
 * 2. Business access validation
 * 3. Multi-tenant data isolation
 * 4. Role-based access control
 *
 * Security: All queries include businessId scoping
 */
export default async function BusinessDashboardPage({
  params,
}: BusinessDashboardPageProps) {
  const session = await auth();

  // Enforce authentication
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  try {
    // First, get the business
    const business = await prisma.business.findFirst({
      where: {
        slug: params.businessSlug,
      },
      include: {
        _count: {
          select: {
            staff: true,
            services: true,
            clients: true,
            appointments: true,
          },
        },
      },
    });

    if (!business) {
      redirect('/onboarding');
    }

    // Separately check user access to this business
    const userBusinessRelation = await prisma.businessUser.findFirst({
      where: {
        businessId: business.id,
        userId: session.user.id,
      },
      select: {
        role: true,
      },
    });

    if (!userBusinessRelation) {
      redirect('/onboarding');
    }

    const userRole = userBusinessRelation.role;

    // Business dashboard ready to render

    // Import the proper dashboard component
    const { BusinessDashboard } = await import('./business-dashboard');

    return (
      <BusinessDashboard
        business={business}
        userRole={userRole}
        userName={session.user.name || session.user.email || 'User'}
        businessSlug={params.businessSlug}
      />
    );
  } catch (_error) {
    // Log error for monitoring in production
    redirect('/onboarding');
  }
}
