import { requireBusinessAccess } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Monitor, ShoppingCart } from 'lucide-react';

interface POSPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export default async function POSPage(props: POSPageProps) {
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
          <h1 className="lumina-heading-2">Point of Sale</h1>
          <p className="lumina-body-large text-color-foreground-muted">
            Process payments and manage transactions
          </p>
        </div>

        {/* POS Interface Placeholder */}
        <Card className="border-color-border bg-color-surface border shadow-sm">
          <CardHeader>
            <CardTitle className="lumina-heading-3 flex items-center gap-2">
              <Monitor className="text-color-primary h-5 w-5" />
              POS Terminal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center">
              <div className="mb-6 flex justify-center space-x-4">
                <Monitor className="text-color-primary h-8 w-8" />
                <CreditCard className="text-color-primary h-8 w-8" />
                <ShoppingCart className="text-color-primary h-8 w-8" />
              </div>
              <h3 className="text-lumina-primary mb-2 text-lg font-semibold">
                POS System Coming Soon
              </h3>
              <p className="text-color-foreground-muted mb-4">
                Complete point of sale system will be available here.
              </p>
              <p className="text-color-foreground-muted text-sm">
                Features will include: Service selection, payment processing,
                receipt generation, tip handling, and inventory management.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
