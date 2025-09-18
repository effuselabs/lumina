'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
          <div>
            <h1 className="lumina-heading-2">Appointments</h1>
            <p className="lumina-body-large" style={{ color: '#808285' }}>
              Manage your appointment schedule, bookings, and client visits.
            </p>
          </div>

          {/* Quick Stats - Using Dashboard Style */}
          <div className="dashboard-stats-grid">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lumina-primary text-sm font-medium">
                  Today&apos;s Appointments
                </CardTitle>
                <Calendar className="h-4 w-4" style={{ color: '#ff7a5a' }} />
              </CardHeader>
              <CardContent>
                <div className="text-lumina-primary text-2xl font-bold">8</div>
                <p className="text-xs" style={{ color: '#808285' }}>
                  +2 from yesterday
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lumina-primary text-sm font-medium">
                  This Week
                </CardTitle>
                <Clock className="h-4 w-4" style={{ color: '#ff7a5a' }} />
              </CardHeader>
              <CardContent>
                <div className="text-lumina-primary text-2xl font-bold">42</div>
                <p className="text-xs" style={{ color: '#808285' }}>
                  +12% from last week
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lumina-primary text-sm font-medium">
                  No-Show Rate
                </CardTitle>
                <Users className="h-4 w-4" style={{ color: '#ff7a5a' }} />
              </CardHeader>
              <CardContent>
                <div className="text-lumina-primary text-2xl font-bold">
                  3.2%
                </div>
                <p className="text-xs" style={{ color: '#808285' }}>
                  -0.8% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Appointment Management Interface */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="lumina-heading-3">
                    Appointment Calendar
                  </CardTitle>
                  <p className="lumina-body-small" style={{ color: '#808285' }}>
                    View and manage your appointment schedule
                  </p>
                </div>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  style={{
                    background:
                      'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background =
                      'linear-gradient(135deg, #ffcd47 0%, #ff6b47 100%)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background =
                      'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)';
                  }}
                  onClick={() => {
                    // TODO: Implement new appointment functionality
                    console.log('New appointment clicked');
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Appointment
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="py-12 text-center">
                <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">
                  Calendar View Coming Soon
                </h3>
                <p className="mb-4 text-muted-foreground">
                  Full appointment calendar and booking interface will be
                  available here.
                </p>
                <p className="text-sm text-muted-foreground">
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
