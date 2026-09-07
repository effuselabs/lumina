import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { AnalyticsDashboard } from './analytics-dashboard';

interface AnalyticsDashboardPageProps {
  params: {
    businessSlug: string;
  };
}

/**
 * Analytics Dashboard Page
 *
 * Provides comprehensive business analytics including:
 * - Revenue trends and forecasting
 * - Appointment volume and completion rates
 * - Service popularity and performance
 * - Staff performance and utilization
 * - Business intelligence insights
 */
export default async function AnalyticsDashboardPage({
  params,
}: AnalyticsDashboardPageProps) {
  const session = await auth();

  // Enforce authentication
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  try {
    // Get business with user access validation
    const business = await prisma.business.findFirst({
      where: {
        slug: params.businessSlug,
      },
      include: {
        users: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
            userId: true,
          },
        },
      },
    });

    // Verify user has access to this business
    const userHasAccess = business?.users && business.users.length > 0;

    if (!business || !userHasAccess) {
      redirect('/onboarding');
    }

    const userRole = business.users[0]?.role;

    // Check if user has analytics access (OWNER or MANAGER)
    if (!['OWNER', 'MANAGER'].includes(userRole)) {
      redirect(`/dashboard/${params.businessSlug}`);
    }

    return (
      <AnalyticsDashboard
        business={business}
        userRole={userRole}
        userName={session.user.name || 'User'}
        businessSlug={params.businessSlug}
      />
    );
  } catch (error) {
    // Log error for debugging
    console.error('Analytics dashboard error:', error);
    redirect('/onboarding');
  }
}
