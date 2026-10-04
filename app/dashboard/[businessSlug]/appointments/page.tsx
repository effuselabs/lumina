import { requireBusinessAccess } from '@/lib/auth';
import { AppointmentsPageContent } from '@/components/appointments/appointments-page-content';
import { appointmentStats } from '@/lib/services/appointment-stats';

interface AppointmentsPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export default async function AppointmentsPage(props: AppointmentsPageProps) {
  const params = await props.params;
  const {
    user,
    business,
    role: userRole,
  } = await requireBusinessAccess(params.businessSlug);
  const stats = await appointmentStats(business.id, business.timezone);

  return (
    <AppointmentsPageContent
      business={business}
      stats={stats}
      userRole={userRole}
      userName={user.name || user.email || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
