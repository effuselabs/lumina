import { requireBusinessAccess } from '@/lib/auth';
import { StaffPageContent } from '@/components/staff/staff-page-content';

interface StaffPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export default async function StaffPage(props: StaffPageProps) {
  const params = await props.params;
  const {
    user,
    business,
    role: userRole,
  } = await requireBusinessAccess(params.businessSlug);

  return (
    <StaffPageContent
      business={business}
      userRole={userRole}
      userName={user.name || user.email || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
