import { requireBusinessAccess } from '@/lib/auth';
import { AppointmentsPageContent } from '@/components/appointments/appointments-page-content';

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

  return (
    <AppointmentsPageContent
      business={business}
      userRole={userRole}
      userName={user.name || user.email || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
