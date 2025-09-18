'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { ServiceList } from '@/components/services/service-list';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

interface ServicesPageContentProps {
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
 * Services Page Content Component
 *
 * Provides comprehensive service management within the dashboard layout:
 * - Professional dashboard layout with sidebar navigation
 * - Service list with create, edit, and pricing management
 * - Service categories and availability settings
 * - Staff assignment and service configuration
 */
export function ServicesPageContent({
  business,
  userRole,
  userName,
  businessSlug,
}: ServicesPageContentProps) {
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
            <h1 className="lumina-heading-2">Services Management</h1>
            <p className="lumina-body-large" style={{ color: '#808285' }}>
              Manage your salon services, pricing, duration, and staff
              assignments.
            </p>
          </div>

          {/* Services List */}
          <ServiceList businessId={business.id} />
        </div>
      </DashboardLayout>
    </QueryClientProvider>
  );
}
