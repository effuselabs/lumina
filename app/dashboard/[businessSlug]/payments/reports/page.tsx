import { requireBusinessAccess } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, FileText, TrendingUp } from 'lucide-react';

interface FinancialReportsPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export default async function FinancialReportsPage(
  props: FinancialReportsPageProps
) {
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
          <h1 className="lumina-heading-2">Financial Reports</h1>
          <p className="lumina-body-large text-color-foreground-muted">
            Comprehensive financial analytics and reporting
          </p>
        </div>

        {/* Financial Reports Placeholder */}
        <Card className="border-color-border bg-color-surface border shadow-sm">
          <CardHeader>
            <CardTitle className="lumina-heading-3 flex items-center gap-2">
              <BarChart3 className="text-color-primary h-5 w-5" />
              Financial Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center">
              <div className="mb-6 flex justify-center space-x-4">
                <BarChart3 className="text-color-primary h-8 w-8" />
                <TrendingUp className="text-color-primary h-8 w-8" />
                <FileText className="text-color-primary h-8 w-8" />
              </div>
              <h3 className="text-lumina-primary mb-2 text-lg font-semibold">
                Financial Reports Coming Soon
              </h3>
              <p className="text-color-foreground-muted mb-4">
                Comprehensive financial reporting and analytics will be
                available here.
              </p>
              <p className="text-color-foreground-muted text-sm">
                Features will include: Revenue reports, profit analysis, staff
                commission tracking, tax reporting, and business insights.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
