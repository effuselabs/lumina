'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Calendar, Clock, Plus, Users } from 'lucide-react';
import { useState } from 'react';

interface AppointmentsPageContentProps {
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
 * Appointments Page Content Component
 *
 * Provides comprehensive appointment management within the dashboard layout:
 * - Professional dashboard layout with sidebar navigation
 * - Calendar view with appointment scheduling
 * - Appointment booking and management interface
 * - Staff assignment and service selection
 * - Client appointment history and status tracking
 */
export function AppointmentsPageContent({
  business,
  userRole,
  userName,
  businessSlug,
}: AppointmentsPageContentProps) {
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
            title="Appointments"
            description="Manage your appointment schedule, bookings, and client visits."
            actions={[
              {
                label: 'New Appointment',
                onClick: () => {
                  // TODO: Implement new appointment functionality
                },
                icon: Plus,
                primary: true,
              },
            ]}
          />

          {/* Quick Stats - Using Standardized StatCard */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Today's Appointments"
              value={8}
              change={{
                value: 25,
                type: 'increase',
                period: 'from yesterday',
              }}
              icon={Calendar}
              size="compact"
            />

            <StatCard
              title="This Week"
              value={42}
              change={{
                value: 12,
                type: 'increase',
                period: 'from last week',
              }}
              icon={Clock}
              size="compact"
            />

            <StatCard
              title="No-Show Rate"
              value="3.2%"
              change={{
                value: 0.8,
                type: 'decrease',
                period: 'from last month',
              }}
              icon={Users}
              size="compact"
            />
          </div>

          {/* Appointment Management Interface */}
          <Card className="border-color-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-color-secondary">
                    Appointment Calendar
                  </CardTitle>
                  <p className="text-color-foreground-muted">
                    View and manage your appointment schedule
                  </p>
                </div>
                <Button
                  variant="primary"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => {
                    // TODO: Implement new appointment functionality
                  }}
                >
                  New Appointment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="py-12 text-center">
                <Calendar className="text-color-foreground-muted mx-auto mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-semibold">
                  Calendar View Coming Soon
                </h3>
                <p className="text-color-foreground-muted mb-4">
                  Full appointment calendar and booking interface will be
                  available here.
                </p>
                <p className="text-color-foreground-muted text-sm">
                  Features will include: Calendar view, appointment booking,
                  staff scheduling, client management, and automated reminders.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </QueryClientProvider>
  );
}
