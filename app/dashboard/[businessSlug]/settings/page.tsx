import { requireBusinessAccess } from '@/lib/auth';
import { SettingsPageContent } from '@/components/settings/settings-page-content';

interface SettingsPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export default async function SettingsPage(props: SettingsPageProps) {
  const params = await props.params;
  const {
    user,
    business,
    role: userRole,
  } = await requireBusinessAccess(params.businessSlug);

  return (
    <SettingsPageContent
      business={business}
      userRole={userRole}
      userName={user.name || user.email || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
