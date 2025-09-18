'use client';

import { AppointmentChart } from '@/components/dashboard/charts/appointment-chart';
import { RevenueChart } from '@/components/dashboard/charts/revenue-chart';
import { StaffPerformanceChart } from '@/components/dashboard/charts/staff-performance-chart';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboardCharts } from '@/hooks/use-dashboard-data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useState } from 'react';

interface AnalyticsDashboardProps {
  business: {
    id: string;
    name: string;
  };
  userRole: string;
  userName: string;
  businessSlug: string;
}

export function AnalyticsDashboard({
  business,
  userRole,
  userName,
  businessSlug,
}: AnalyticsDashboardProps) {
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
        <AnalyticsContent business={business} businessSlug={businessSlug} />
      </DashboardLayout>
    </QueryClientProvider>
  );
}

interface AnalyticsContentProps {
  business: {
    id: string;
    name: string;
  };
  businessSlug: string;
}

function AnalyticsContent({ business }: AnalyticsContentProps) {
  const [period, setPeriod] = useState('weekly');
  const {
    data: chartData,
    isLoading,
    error,
    refetch,
  } = useDashboardCharts(business.id, period);

  const handleExport = () => {
    // TODO: Implement export functionality
    // eslint-disable-next-line no-console
    console.log('Exporting analytics data...');
  };

  const handleRefresh = () => {
    refetch();
  };

  // Calculate summary metrics
  const totalRevenue =
    chartData?.revenue.reduce(
      (sum: number, item: any) => sum + item.revenue,
      0
    ) || 0;
  const revenueGrowth =
    chartData?.revenue.length >= 2
      ? Math.round(
          ((chartData.revenue[chartData.revenue.length - 1].revenue -
            chartData.revenue[0].revenue) /
            chartData.revenue[0].revenue) *
            100
        )
      : 0;

  const totalAppointments =
    chartData?.appointments.reduce(
      (sum: number, item: any) =>
        sum + item.scheduled + item.completed + item.cancelled + item.noShow,
      0
    ) || 0;
  const completedAppointments =
    chartData?.appointments.reduce(
      (sum: number, item: any) => sum + item.completed,
      0
    ) || 0;
  const completionRate =
    totalAppointments > 0
      ? Math.round((completedAppointments / totalAppointments) * 100)
      : 0;

  const topPerformer = chartData?.staff[0];
  const averageUtilization =
    chartData?.staff.length > 0
      ? Math.round(
          chartData.staff.reduce(
            (sum: number, staff: any) => sum + staff.utilization,
            0
          ) / chartData.staff.length
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="lumina-heading-2">Analytics & Reports</h1>
          <p className="lumina-body-large" style={{ color: '#808285' }}>
            Comprehensive business insights and performance analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={handleRefresh}
            className="inline-flex h-10 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            style={{ color: '#0b2b33' }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </button>

          <button
            onClick={handleExport}
            className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background =
                'linear-gradient(135deg, #ffcd47 0%, #ff6b47 100%)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background =
                'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)';
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Error State - Moved to top for visibility */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500">
                <span className="text-sm font-bold text-white">!</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Failed to Load Analytics Data
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  There was an error loading your analytics. Please try
                  refreshing the page.
                </p>
              </div>
              <button
                onClick={handleRefresh}
                className="ml-auto inline-flex h-8 items-center justify-center rounded-md px-3 py-1 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  background:
                    'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)',
                }}
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Overview - Dashboard Style */}
      <div className="dashboard-stats-grid">
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lumina-primary flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4" style={{ color: '#ff7a5a' }} />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lumina-primary text-2xl font-bold">
              ${totalRevenue.toLocaleString()}
            </div>
            <div
              className={`mt-1 flex items-center gap-1 text-sm ${revenueGrowth > 0 ? 'text-green-600' : revenueGrowth < 0 ? 'text-red-600' : ''}`}
              style={{ color: revenueGrowth === 0 ? '#808285' : undefined }}
            >
              {revenueGrowth > 0 ? '+' : ''}
              {revenueGrowth}% vs last period
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lumina-primary flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" style={{ color: '#ff7a5a' }} />
              Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lumina-primary text-2xl font-bold">
              {totalAppointments}
            </div>
            <div className="mt-1 text-sm" style={{ color: '#808285' }}>
              {completionRate}% completion rate
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lumina-primary flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" style={{ color: '#ff7a5a' }} />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lumina-primary text-2xl font-bold">
              {topPerformer?.name || 'N/A'}
            </div>
            <div className="mt-1 text-sm" style={{ color: '#808285' }}>
              ${topPerformer?.revenue.toLocaleString() || 0} revenue
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lumina-primary flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4" style={{ color: '#ff7a5a' }} />
              Avg Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lumina-primary text-2xl font-bold">
              {averageUtilization}%
            </div>
            <div className="mt-1 text-sm" style={{ color: '#808285' }}>
              Staff efficiency
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <RevenueChart
        data={chartData?.revenue || []}
        period={period as 'daily' | 'weekly' | 'monthly'}
        totalRevenue={totalRevenue}
        growth={revenueGrowth}
        isLoading={isLoading}
      />

      {/* Appointment Analytics */}
      <AppointmentChart
        data={chartData?.appointments || []}
        serviceData={chartData?.services || []}
        totalAppointments={totalAppointments}
        completionRate={completionRate}
        isLoading={isLoading}
      />

      {/* Staff Performance */}
      <StaffPerformanceChart
        staffData={chartData?.staff || []}
        topPerformer={
          topPerformer || {
            name: 'N/A',
            revenue: 0,
            appointments: 0,
            utilization: 0,
            rating: 0,
            commissionEarned: 0,
            employmentType: 'COMMISSION',
          }
        }
        averageUtilization={averageUtilization}
        isLoading={isLoading}
      />
    </div>
  );
}
