'use client';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useDashboard } from '@/hooks/use-dashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

interface DashboardClientProps {
  business: {
    id: string;
    name: string;
    users: Array<{ userId: string }>;
  };
  userRole: string;
  userName: string;
  businessSlug: string;
}

// Create a client component wrapper for the dashboard
function DashboardContent({
  business,
  userRole,
  userName,
  businessSlug,
}: DashboardClientProps) {
  const {
    selectedDateRange,
    isEditing,
    setDateRange,
    toggleEditMode,
    saveLayout,
    refreshData,
  } = useDashboard({
    businessId: business.id,
    userId: business.users[0]?.userId,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <DashboardHeader
        businessName={business.name}
        userRole={userRole}
        userName={userName}
        businessSlug={businessSlug}
        selectedDateRange={selectedDateRange}
        isEditing={isEditing}
        onDateRangeChange={setDateRange}
        onToggleEdit={toggleEditMode}
        onSaveLayout={saveLayout}
        onRefresh={refreshData}
      />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardLayout
          businessId={business.id}
          userId={business.users[0]?.userId}
        />
      </div>
    </div>
  );
}

export function DashboardClient(props: DashboardClientProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent {...props} />
    </QueryClientProvider>
  );
}
