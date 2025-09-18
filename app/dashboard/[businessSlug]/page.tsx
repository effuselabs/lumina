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
  console.log(
    '🎯 BUSINESS DASHBOARD PAGE EXECUTING FOR SLUG:',
    params.businessSlug
  );
  const session = await auth();

  // Enforce authentication
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  console.log('🏢 Business dashboard accessed:', {
    businessSlug: params.businessSlug,
    userId: session.user.id,
    userEmail: session.user.email,
    timestamp: new Date().toISOString(),
  });

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

    console.log('🔍 Business lookup result:', {
      businessSlug: params.businessSlug,
      businessFound: !!business,
      businessName: business?.name,
    });

    if (!business) {
      console.log('❌ Business not found, redirecting to onboarding');
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

    console.log('🔍 User access check:', {
      businessId: business.id,
      userId: session.user.id,
      hasAccess: !!userBusinessRelation,
      userRole: userBusinessRelation?.role,
    });

    if (!userBusinessRelation) {
      console.log(
        '❌ User does not have access to this business, redirecting to onboarding'
      );
      redirect('/onboarding');
    }

    const userRole = userBusinessRelation.role;

    console.log('Rendering business dashboard:', {
      businessName: business.name,
      userRole,
      statsCount: business._count,
    });

    console.log('✅ About to render business dashboard');

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
  } catch (error) {
    console.error('Business dashboard error:', error);
    // Fallback to onboarding on any error
    redirect('/onboarding');
  }
}
