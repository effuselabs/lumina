import { requireBusinessAccess } from '@/lib/auth';
import { ClientsPageContent } from '@/components/clients/clients-page-content';

interface ClientsPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export default async function ClientsPage(props: ClientsPageProps) {
  const params = await props.params;
  const {
    user,
    business,
    role: userRole,
  } = await requireBusinessAccess(params.businessSlug);

  return (
    <ClientsPageContent
      business={business}
      userRole={userRole}
      userName={user.name || user.email || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
