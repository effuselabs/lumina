/**
 * Payments Dashboard Page
 *
 * Provides access to payment processing, transaction history, and financial reporting
 */

import { auth } from '@/auth';
import { FinancialDashboard } from '@/components/payments';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

interface PaymentsPageProps {
  params: {
    businessSlug: string;
  };
}

export default async function PaymentsPage({ params }: PaymentsPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Get business information
  const business = await prisma.business.findUnique({
    where: { slug: params.businessSlug },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!business) {
    redirect('/onboarding');
  }

  // Verify user has access to this business
  const businessUser = await prisma.businessUser.findFirst({
    where: {
      businessId: business.id,
      userId: session.user.id,
    },
    select: {
      role: true,
    },
  });

  if (!businessUser) {
    redirect('/onboarding');
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Payments & Transactions
        </h1>
        <p className="text-gray-600">
          Manage payments, view transaction history, and track financial
          performance
        </p>
      </div>

      <FinancialDashboard businessId={business.id} />
    </div>
  );
}
