import { requireBusinessAccess } from '@/lib/auth';
import { ServicesPageContent } from '@/components/services/services-page-content';

interface ServicesPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export default async function ServicesPage(props: ServicesPageProps) {
  const params = await props.params;
  const {
    user,
    business,
    role: userRole,
  } = await requireBusinessAccess(params.businessSlug);

  return (
    <ServicesPageContent
      business={business}
      userRole={userRole}
      userName={user.name || user.email || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
