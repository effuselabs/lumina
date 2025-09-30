'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Calendar, CalendarDays, Clock, Filter, Plus, Search, Users } from 'lucide-react';
import Link from 'next/link';
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

          {/* Calendar View Navigation */}
          <div className="grid gap-4 md:grid-cols-3">
            <Link href={`/dashboard/${businessSlug}/appointments`}>
              <Card className="border-color-border hover:border-lumina-coral cursor-pointer transition-colors shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-lumina-radiant/10">
                      <Calendar className="h-6 w-6 text-lumina-coral" />
                    </div>
                    <div>
                      <h3 className="font-semibold">All Appointments</h3>
                      <p className="text-color-foreground-muted text-sm">
                        View all scheduled appointments
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href={`/dashboard/${businessSlug}/appointments/calendar`}>
              <Card className="border-color-border hover:border-lumina-coral cursor-pointer transition-colors shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-lumina-radiant/10">
                      <CalendarDays className="h-6 w-6 text-lumina-coral" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Calendar View</h3>
                      <p className="text-color-foreground-muted text-sm">
                        Day, week, and month views
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href={`/dashboard/${businessSlug}/appointments/book`}>
              <Card className="border-color-border hover:border-lumina-coral cursor-pointer transition-colors shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-lumina-radiant/10">
                      <Plus className="h-6 w-6 text-lumina-coral" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Book Appointment</h3>
                      <p className="text-color-foreground-muted text-sm">
                        Schedule new appointment
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Appointment Management Interface */}
          <Card className="border-color-border shadow-sm">
            <CardHeader>
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div>
                  <CardTitle className="text-color-secondary">
                    Recent Appointments
                  </CardTitle>
                  <p className="text-color-foreground-muted">
                    View and manage your recent appointment activity
                  </p>
                </div>
                <div className="flex flex-col space-y-2 md:flex-row md:space-x-2 md:space-y-0">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Search className="h-4 w-4" />}
                  >
                    Search
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Filter className="h-4 w-4" />}
                  >
                    Filter
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus className="h-4 w-4" />}
                    asChild
                  >
                    <Link href={`/dashboard/${businessSlug}/appointments/book`}>
                      New Appointment
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="py-12 text-center">
                <Calendar className="text-color-foreground-muted mx-auto mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-semibold">
                  Appointment Management Dashboard
                </h3>
                <p className="text-color-foreground-muted mb-4">
                  This is the foundation for your appointment management system.
                </p>
                <div className="text-color-foreground-muted text-sm space-y-2">
                  <p>✓ Dashboard layout and navigation integrated</p>
                  <p>✓ Responsive design for desktop and mobile</p>
                  <p>✓ Quick access to calendar views and booking</p>
                  <p>• Calendar components will be implemented next</p>
                  <p>• Real-time updates and drag-and-drop scheduling</p>
                  <p>• Advanced search and filtering capabilities</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </QueryClientProvider>
  );
}
