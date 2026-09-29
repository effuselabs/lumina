import { requireBusinessAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface BusinessDashboardPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
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
export default async function BusinessDashboardPage(
  props: BusinessDashboardPageProps
) {
  const params = await props.params;
  const {
    user,
    business: accessible,
    role: userRole,
  } = await requireBusinessAccess(params.businessSlug);

  // Scoped by the business the check just proved access to.
  const counts = await prisma.business.findUniqueOrThrow({
    where: { id: accessible.id },
    select: {
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
  const business = { ...accessible, ...counts };

  const { BusinessDashboard } = await import('./business-dashboard');

  return (
    <BusinessDashboard
      business={business}
      userRole={userRole}
      userName={user.name || user.email || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
