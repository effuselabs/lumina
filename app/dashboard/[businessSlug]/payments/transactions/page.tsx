import { auth } from '@/auth';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { CreditCard, DollarSign, Receipt } from 'lucide-react';
import { redirect } from 'next/navigation';

interface TransactionsPageProps {
  params: {
    businessSlug: string;
  };
}

export default async function TransactionsPage({
  params,
}: TransactionsPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Get business information and verify access
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
    <DashboardLayout
      businessSlug={params.businessSlug}
      userRole={userRole}
      userName={session.user.name || session.user.email || 'User'}
      businessName={business.name}
    >
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="lumina-heading-2">Transactions</h1>
          <p className="lumina-body-large text-color-foreground-muted">
            View and manage all payment transactions
          </p>
        </div>

        {/* Transaction History Placeholder */}
        <Card className="border-color-border bg-color-surface border shadow-sm">
          <CardHeader>
            <CardTitle className="lumina-heading-3 flex items-center gap-2">
              <Receipt className="text-color-primary h-5 w-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center">
              <div className="mb-6 flex justify-center space-x-4">
                <CreditCard className="text-color-primary h-8 w-8" />
                <DollarSign className="text-color-primary h-8 w-8" />
                <Receipt className="text-color-primary h-8 w-8" />
              </div>
              <h3 className="text-lumina-primary mb-2 text-lg font-semibold">
                Transaction Management Coming Soon
              </h3>
              <p className="text-color-foreground-muted mb-4">
                Complete transaction history and management will be available
                here.
              </p>
              <p className="text-color-foreground-muted text-sm">
                Features will include: Payment history, refund processing,
                transaction search, and detailed financial reporting.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
