'use client';

import { AppointmentChart } from '@/components/dashboard/charts/appointment-chart';
import { RevenueChart } from '@/components/dashboard/charts/revenue-chart';
import { StaffPerformanceChart } from '@/components/dashboard/charts/staff-performance-chart';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Button } from '@/components/ui/button';
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
                <AnalyticsContent
                    business={business}
                    businessSlug={businessSlug}
                />
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
    const { data: chartData, isLoading, error, refetch } = useDashboardCharts(business.id, period);

    const handleExport = () => {
        // TODO: Implement export functionality
        // eslint-disable-next-line no-console
        console.log('Exporting analytics data...');
    };

    const handleRefresh = () => {
        refetch();
    };

    // Calculate summary metrics
    const totalRevenue = chartData?.revenue.reduce((sum: number, item: any) => sum + item.revenue, 0) || 0;
    const revenueGrowth = chartData?.revenue.length >= 2 ?
        Math.round(((chartData.revenue[chartData.revenue.length - 1].revenue - chartData.revenue[0].revenue) / chartData.revenue[0].revenue) * 100) : 0;

    const totalAppointments = chartData?.appointments.reduce((sum: number, item: any) =>
        sum + item.scheduled + item.completed + item.cancelled + item.noShow, 0) || 0;
    const completedAppointments = chartData?.appointments.reduce((sum: number, item: any) => sum + item.completed, 0) || 0;
    const completionRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;

    const topPerformer = chartData?.staff[0];
    const averageUtilization = chartData?.staff.length > 0 ?
        Math.round(chartData.staff.reduce((sum: number, staff: any) => sum + staff.utilization, 0) / chartData.staff.length) : 0;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="dashboard-heading-lg">Analytics & Reports</h1>
                    <p className="text-lumina-secondary">
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

                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>

                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Key Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Total Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            ${totalRevenue.toLocaleString()}
                        </div>
                        <div className={`text-sm flex items-center gap-1 mt-1 ${revenueGrowth > 0 ? 'text-green-600' : revenueGrowth < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                            {revenueGrowth > 0 ? '+' : ''}{revenueGrowth}% vs last period
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Appointments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {totalAppointments}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                            {completionRate}% completion rate
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Top Performer
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                            {topPerformer?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                            ${topPerformer?.revenue.toLocaleString() || 0} revenue
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Avg Utilization
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {averageUtilization}%
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
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
                topPerformer={topPerformer || {
                    name: 'N/A',
                    revenue: 0,
                    appointments: 0,
                    utilization: 0,
                    rating: 0,
                    commissionEarned: 0,
                    employmentType: 'COMMISSION',
                }}
                averageUtilization={averageUtilization}
                isLoading={isLoading}
            />

            {/* Error State */}
            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-sm">!</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-red-800">
                                    Failed to Load Analytics Data
                                </h3>
                                <p className="mt-1 text-sm text-red-700">
                                    There was an error loading your analytics. Please try refreshing the page.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                className="ml-auto"
                            >
                                Try Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}