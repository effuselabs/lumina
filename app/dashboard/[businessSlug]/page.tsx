import { requireBusinessAccess } from '@/lib/auth';
import {
  dashboardOverview,
  todaysSchedule,
} from '@/lib/services/dashboard-overview';

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

  // Read on the server, in the salon's timezone, scoped by the business the
  // check just proved access to.
  const now = new Date();
  const [overview, schedule] = await Promise.all([
    dashboardOverview(accessible.id, accessible.timezone, now),
    todaysSchedule(accessible.id, accessible.timezone, now),
  ]);

  const { BusinessDashboard } = await import('./business-dashboard');

  return (
    <BusinessDashboard
      businessName={accessible.name}
      overview={overview}
      schedule={schedule}
      userRole={userRole}
      userName={user.name || user.email || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
