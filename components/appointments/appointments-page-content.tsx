'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import type { AppointmentStats } from '@/lib/services/appointment-stats';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Calendar, CalendarDays, Clock, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface AppointmentsPageContentProps {
  business: {
    id: string;
    name: string;
  };
  /** Read from the business's appointments on the server. */
  stats: AppointmentStats;
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
  stats,
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
              value={stats.today}
              icon={Calendar}
              size="compact"
            />

            <StatCard
              title="This Week"
              value={stats.thisWeek}
              icon={Clock}
              size="compact"
            />

            <StatCard
              title="No-Show Rate (30 days)"
              value={
                stats.noShowRate === null
                  ? '—'
                  : `${(stats.noShowRate * 100).toFixed(1)}%`
              }
              icon={Users}
              size="compact"
            />
          </div>

          {/* Calendar View Navigation */}
          <div className="grid gap-4 md:grid-cols-3">
            <Link href={`/dashboard/${businessSlug}/appointments`}>
              <Card className="border-color-border cursor-pointer shadow-sm transition-colors hover:border-lumina-coral">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-lumina-radiant/10 flex h-12 w-12 items-center justify-center rounded-lg">
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
              <Card className="border-color-border cursor-pointer shadow-sm transition-colors hover:border-lumina-coral">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-lumina-radiant/10 flex h-12 w-12 items-center justify-center rounded-lg">
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
              <Card className="border-color-border cursor-pointer shadow-sm transition-colors hover:border-lumina-coral">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-lumina-radiant/10 flex h-12 w-12 items-center justify-center rounded-lg">
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
                    Your schedule
                  </CardTitle>
                  <p className="text-color-foreground-muted">
                    Every booking, by day, week or month
                  </p>
                </div>
                <div className="flex flex-col space-y-2 md:flex-row md:space-x-2 md:space-y-0">
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
              {/* This card showed a development roadmap promising the calendar
                  "next", with Search and Filter buttons that
                  did nothing (#102). The calendar is where appointments are. */}
              <div className="py-12 text-center">
                <Calendar
                  className="mx-auto mb-4 h-12 w-12 text-ink-muted"
                  aria-hidden="true"
                />
                <p className="mb-6 text-ink-soft">
                  Appointments, including ones clients book online, are on the
                  calendar.
                </p>
                <Button variant="outline" asChild>
                  <Link
                    href={`/dashboard/${businessSlug}/appointments/calendar`}
                  >
                    Open the calendar
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </QueryClientProvider>
  );
}
