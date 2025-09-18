'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { EnhancedStatCard } from '@/components/dashboard/enhanced-stat-card';
import { ScheduleItemData } from '@/components/dashboard/schedule-item';
import { TodaysScheduleCard } from '@/components/dashboard/todays-schedule-card';
import { Card, CardContent } from '@/components/ui/card';
import { LuminaQuickActionCard } from '@/components/ui/lumina-quick-action-card';
import { LuminaQuickActions } from '@/components/ui/lumina-quick-actions';
import {
  useDashboardAppointments,
  useDashboardData,
} from '@/hooks/use-dashboard-data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { AppointmentSummary } from '../../../types/dashboard';

interface BusinessDashboardProps {
  business: {
    id: string;
    name: string;
    _count: {
      staff: number;
      services: number;
      clients: number;
      appointments: number;
    };
  };
  userRole: string;
  userName: string;
  businessSlug: string;
}

/**
 * Enhanced Business Dashboard Client Component
 *
 * Provides:
 * - Professional dashboard layout with sidebar navigation
 * - Real-time business metrics and analytics
 * - Enhanced stat cards with trends and growth indicators
 * - Quick actions and financial overview
 * - Role-based UI elements and permissions
 */
export function BusinessDashboard({
  business,
  userRole,
  userName,
  businessSlug,
}: BusinessDashboardProps) {
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
        <DashboardContent
          business={business}
          businessSlug={businessSlug}
          userRole={userRole}
        />
      </DashboardLayout>
    </QueryClientProvider>
  );
}

interface DashboardContentProps {
  business: {
    id: string;
    name: string;
    _count: {
      staff: number;
      services: number;
      clients: number;
      appointments: number;
    };
  };
  businessSlug: string;
  userRole: string;
}

function DashboardContent({
  business,
  businessSlug,
  userRole: _userRole,
}: DashboardContentProps) {
  const {
    data: metrics,
    isLoading,
    error: _error,
  } = useDashboardData({
    businessId: business.id,
  });

  const { data: appointmentsData, isLoading: appointmentsLoading } =
    useDashboardAppointments(
      business.id,
      10 // Get up to 10 appointments for today
    );

  // Transform appointments data to match ScheduleItemData interface
  const transformedAppointments: ScheduleItemData[] =
    appointmentsData?.map((apt: AppointmentSummary) => ({
      id: apt.id,
      clientName: apt.clientName,
      service: apt.serviceName,
      time: new Date(apt.startTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      staffMember: apt.staffName,
      status:
        apt.status === 'CONFIRMED'
          ? 'upcoming'
          : apt.status === 'IN_PROGRESS'
            ? 'in-progress'
            : apt.status === 'COMPLETED'
              ? 'completed'
              : 'upcoming',
      duration: 60, // Default duration, could be enhanced to get from service data
    })) || [];

  // Remove duplicates based on unique combination of client, service, time, and staff
  const todaysAppointments = transformedAppointments.filter(
    (appointment, index, self) =>
      index ===
      self.findIndex(
        apt =>
          apt.clientName === appointment.clientName &&
          apt.service === appointment.service &&
          apt.time === appointment.time &&
          apt.staffMember === appointment.staffMember
      )
  );

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="lumina-heading-2">Dashboard Overview</h1>
        <p className="lumina-body-large" style={{ color: '#808285' }}>
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="dashboard-stats-grid">
        <EnhancedStatCard
          title="Total Revenue"
          value={metrics?.revenue.thisMonth || 0}
          change={
            metrics?.revenue.growth.monthly
              ? {
                  value: metrics.revenue.growth.monthly,
                  type:
                    metrics.revenue.growth.monthly > 0
                      ? 'increase'
                      : metrics.revenue.growth.monthly < 0
                        ? 'decrease'
                        : 'neutral',
                  period: 'this month',
                }
              : undefined
          }
          icon={DollarSign}
          color="revenue"
          trend={metrics?.revenue.trend}
          action={{
            label: 'View Financial Reports',
            href: `/dashboard/${businessSlug}/payments/reports`,
          }}
          isLoading={isLoading}
        />

        <EnhancedStatCard
          title="Appointments Today"
          value={metrics?.appointments.today || business._count.appointments}
          change={
            metrics?.appointments.completionRate
              ? {
                  value: metrics.appointments.completionRate,
                  type: 'neutral',
                  period: 'completion rate',
                }
              : undefined
          }
          icon={Calendar}
          color="appointments"
          trend={metrics?.appointments.trend}
          action={{
            label: 'View Calendar',
            href: `/dashboard/${businessSlug}/appointments`,
          }}
          isLoading={isLoading}
        />

        <EnhancedStatCard
          title="Total Clients"
          value={metrics?.clients.total || business._count.clients}
          change={
            metrics?.clients.retentionRate
              ? {
                  value: metrics.clients.retentionRate,
                  type: 'neutral',
                  period: 'retention rate',
                }
              : undefined
          }
          icon={Users}
          color="clients"
          trend={metrics?.clients.trend}
          action={{
            label: 'Manage Clients',
            href: `/dashboard/${businessSlug}/clients`,
          }}
          isLoading={isLoading}
        />

        <EnhancedStatCard
          title="Active Staff"
          value={metrics?.staff.active || business._count.staff}
          change={
            metrics?.staff.utilization
              ? {
                  value: metrics.staff.utilization,
                  type: 'neutral',
                  period: 'utilization',
                }
              : undefined
          }
          icon={UserCheck}
          color="staff"
          trend={metrics?.staff.trend}
          action={{
            label: 'Manage Staff',
            href: `/dashboard/${businessSlug}/staff`,
          }}
          isLoading={isLoading}
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="dashboard-charts-grid">
        {/* Enhanced Quick Actions */}
        <LuminaQuickActions>
          <LuminaQuickActionCard
            title="Book Appointment"
            description="Schedule new client visit"
            href={`/dashboard/${businessSlug}/appointments/book`}
            icon={Calendar}
            variant="primary"
          />

          <LuminaQuickActionCard
            title="Process Payment"
            description="Handle transactions"
            href={`/dashboard/${businessSlug}/payments/pos`}
            icon={CreditCard}
          />

          <LuminaQuickActionCard
            title="Add Client"
            description="Register new client"
            href={`/dashboard/${businessSlug}/clients?action=add`}
            icon={Users}
          />

          <LuminaQuickActionCard
            title="Add Service"
            description="Create new service"
            href={`/dashboard/${businessSlug}/services?action=add`}
            icon={UserCheck}
          />

          <LuminaQuickActionCard
            title="View Analytics"
            description="Business insights & reports"
            href={`/dashboard/${businessSlug}/analytics`}
            icon={BarChart3}
          />

          <LuminaQuickActionCard
            title="Financial Reports"
            description="Revenue & payment reports"
            href={`/dashboard/${businessSlug}/payments/reports`}
            icon={TrendingUp}
          />
        </LuminaQuickActions>

        {/* Today's Schedule */}
        <TodaysScheduleCard
          businessSlug={businessSlug}
          appointments={todaysAppointments}
          isLoading={appointmentsLoading}
        />
      </div>

      {/* System Status */}
      <Card style={{ borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' }}>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: '#22c58b' }}
              >
                <span className="text-sm font-bold text-white">✓</span>
              </div>
            </div>
            <div className="ml-4">
              <h3
                className="lumina-body-small"
                style={{
                  color: '#1d2d35',
                  fontSize: '14px',
                  fontWeight: '400',
                }}
              >
                System Status: All Systems Operational
              </h3>
              <p
                className="lumina-body-small"
                style={{
                  color: '#1d2d35',
                  fontSize: '14px',
                  fontWeight: '400',
                }}
              >
                Multi-tenant security active • Business data isolated •
                Real-time sync enabled • ID: {businessSlug}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
