'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { FinancialDashboard } from '@/components/payments';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

interface PaymentsPageContentProps {
  business: {
    id: string;
    name: string;
    users: Array<{ role: string }>;
  };
  userRole: string;
  userName: string;
  businessSlug: string;
}

/**
 * Payments Page Content Component
 *
 * Provides comprehensive payment and financial management within the dashboard layout:
 * - Professional dashboard layout with sidebar navigation
 * - Point of Sale (POS) interface for processing payments
 * - Transaction history and financial reporting
 * - Commission tracking and payroll calculations
 * - Revenue analytics and business insights
 */
export function PaymentsPageContent({
  business,
  userRole,
  userName,
  businessSlug,
}: PaymentsPageContentProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
            retry: 3,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardLayout
        businessSlug={businessSlug}
        userRole={userRole}
        userName={userName}
        businessName={business.name}
      >
        <div className="space-y-8">
          {/* Page Header */}
          <div>
            <h1 className="lumina-heading-2">Payments & Finance</h1>
            <p className="lumina-body-large" style={{ color: '#808285' }}>
              Process payments, track transactions, and manage your business
              finances.
            </p>
          </div>

          {/* Financial Dashboard */}
          <FinancialDashboard businessId={business.id} />
        </div>
      </DashboardLayout>
    </QueryClientProvider>
  );
}
