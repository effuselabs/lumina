import { requireBusinessAccess } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, DollarSign, Receipt } from 'lucide-react';

interface TransactionsPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export default async function TransactionsPage(props: TransactionsPageProps) {
  const params = await props.params;
  const {
    user,
    business,
    role: userRole,
  } = await requireBusinessAccess(params.businessSlug);

  return (
    <DashboardLayout
      businessSlug={params.businessSlug}
      userRole={userRole}
      userName={user.name || user.email || 'User'}
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
