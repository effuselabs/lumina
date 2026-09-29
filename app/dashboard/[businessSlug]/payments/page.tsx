import { requireBusinessAccess } from '@/lib/auth';
/**
 * Payments Dashboard Page
 *
 * Provides access to payment processing, transaction history, and financial reporting
 */

import { PaymentsPageContent } from '@/components/payments/payments-page-content';

interface PaymentsPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export default async function PaymentsPage(props: PaymentsPageProps) {
  const params = await props.params;
  const {
    user,
    business,
    role: userRole,
  } = await requireBusinessAccess(params.businessSlug);

  return (
    <PaymentsPageContent
      business={business}
      userRole={userRole}
      userName={user.name || user.email || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
