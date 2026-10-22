'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { EnhancedStatCard } from '@/components/dashboard/enhanced-stat-card';
import { ScheduleItemData } from '@/components/dashboard/schedule-item';
import { TodaysScheduleCard } from '@/components/dashboard/todays-schedule-card';
import { LuminaQuickActionCard } from '@/components/ui/lumina-quick-action-card';
import { LuminaQuickActions } from '@/components/ui/lumina-quick-actions';
import type {
  DashboardOverview,
  ScheduleEntry,
} from '@/lib/services/dashboard-overview';
import {
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';

interface BusinessDashboardProps {
  businessName: string;
  overview: DashboardOverview;
  schedule: ScheduleEntry[];
  userRole: string;
  userName: string;
  businessSlug: string;
}

/**
 * The business dashboard: today at a glance, and the shortcuts an owner
 * reaches for most. Its figures are read on the server, in the salon's
 * timezone (`lib/services/dashboard-overview.ts`), and passed in.
 */
export function BusinessDashboard({
  businessName,
  overview,
  schedule,
  userRole,
  userName,
  businessSlug,
}: BusinessDashboardProps) {
  return (
    <DashboardLayout
      businessSlug={businessSlug}
      userRole={userRole}
      userName={userName}
      businessName={businessName}
    >
      <DashboardContent
        businessSlug={businessSlug}
        overview={overview}
        schedule={schedule}
      />
    </DashboardLayout>
  );
}

/** Percentage change, or none when there is nothing to compare against. */
function change(current: number, previous: number) {
  if (previous <= 0) return undefined;
  const value = Math.round(((current - previous) / previous) * 100);
  return {
    value,
    type:
      value > 0
        ? ('increase' as const)
        : value < 0
          ? ('decrease' as const)
          : ('neutral' as const),
    period: 'vs previous 30 days',
  };
}

function scheduleStatus(
  status: ScheduleEntry['status']
): ScheduleItemData['status'] {
  if (status === 'IN_PROGRESS') return 'in-progress';
  if (status === 'COMPLETED' || status === 'NO_SHOW') return 'completed';
  return 'upcoming';
}

function DashboardContent({
  businessSlug,
  overview,
  schedule,
}: {
  businessSlug: string;
  overview: DashboardOverview;
  schedule: ScheduleEntry[];
}) {
  const { revenue, appointments, clients, staff } = overview;

  const todaysAppointments: ScheduleItemData[] = schedule.map(entry => ({
    id: entry.id,
    clientName: entry.clientName,
    service: entry.services,
    time: entry.time,
    staffMember: entry.staffName,
    status: scheduleStatus(entry.status),
    duration: entry.durationMinutes,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink-strong">
          Dashboard Overview
        </h1>
        <p className="mt-1 text-base text-ink-soft">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      <div className="dashboard-stats-grid">
        <EnhancedStatCard
          title="Revenue, last 30 days"
          value={revenue.last30Days}
          change={change(revenue.last30Days, revenue.previous30Days)}
          icon={DollarSign}
          color="revenue"
          action={{
            label: 'View Financial Reports',
            href: `/dashboard/${businessSlug}/payments/reports`,
          }}
        />

        <EnhancedStatCard
          title="Appointments today"
          value={appointments.today}
          note={
            appointments.stillToCome === 0
              ? 'None still to come'
              : `${appointments.stillToCome} still to come`
          }
          icon={Calendar}
          color="appointments"
          action={{
            label: 'View Calendar',
            href: `/dashboard/${businessSlug}/appointments/calendar`,
          }}
        />

        <EnhancedStatCard
          title="Clients"
          value={clients.total}
          note={`${clients.visitedLast30Days} visited in the last 30 days`}
          icon={Users}
          color="clients"
          action={{
            label: 'Manage Clients',
            href: `/dashboard/${businessSlug}/clients`,
          }}
        />

        <EnhancedStatCard
          title="Active staff"
          value={staff.active}
          icon={UserCheck}
          color="staff"
          action={{
            label: 'Manage Staff',
            href: `/dashboard/${businessSlug}/staff`,
          }}
        />
      </div>

      <div className="dashboard-charts-grid">
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

        <TodaysScheduleCard
          businessSlug={businessSlug}
          appointments={todaysAppointments}
        />
      </div>
    </div>
  );
}
