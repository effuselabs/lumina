/**
 * Payments Dashboard Page
 *
 * Provides access to payment processing, transaction history, and financial reporting
 */

import { auth } from '@/auth';
import { PaymentsPageContent } from '@/components/payments/payments-page-content';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

interface PaymentsPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export default async function PaymentsPage(props: PaymentsPageProps) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Get business information
  const business = await prisma.business.findUnique({
    where: { slug: params.businessSlug },
    include: {
      users: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!business || business.users.length === 0) {
    redirect('/onboarding');
  }

  const userRole = business.users[0]?.role || 'STAFF';

  return (
    <PaymentsPageContent
      business={business}
      userRole={userRole}
      userName={session.user.name || session.user.email || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
