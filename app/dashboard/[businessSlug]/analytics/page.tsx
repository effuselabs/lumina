import { requireBusinessAccess } from '@/lib/auth';
import { AnalyticsDashboard } from './analytics-dashboard';

interface AnalyticsDashboardPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
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
export default async function AnalyticsDashboardPage(
  props: AnalyticsDashboardPageProps
) {
  const params = await props.params;
  // Analytics is for owners and managers; anyone else goes back to the
  // dashboard. This used to sit inside a try whose catch swallowed the
  // redirect and sent staff to /onboarding instead.
  const {
    user,
    business,
    role: userRole,
  } = await requireBusinessAccess(params.businessSlug, ['OWNER', 'MANAGER']);

  return (
    <AnalyticsDashboard
      business={business}
      userRole={userRole}
      userName={user.name || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
