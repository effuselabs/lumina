'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { StaffList } from '@/components/staff/staff-list';
import { PageHeader } from '@/components/ui/page-header';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

interface StaffPageContentProps {
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
 * Staff Page Content Component
 *
 * Provides comprehensive staff management within the dashboard layout:
 * - Professional dashboard layout with sidebar navigation
 * - Staff list with create, edit, and management capabilities
 * - Employment configuration and commission tracking
 * - Role-based access control for staff operations
 */
export function StaffPageContent({
  business,
  userRole,
  userName,
  businessSlug,
}: StaffPageContentProps) {
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
          <PageHeader
            title="Staff Management"
            description="Manage your team members, employment configurations, and performance tracking."
            breadcrumbs={[
              { label: 'Dashboard', href: `/${businessSlug}` },
              { label: 'Staff' },
            ]}
          />

          {/* Staff List */}
          <StaffList businessId={business.id} />
        </div>
      </DashboardLayout>
    </QueryClientProvider>
  );
}
