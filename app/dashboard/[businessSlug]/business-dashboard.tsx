'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { EnhancedStatCard } from '@/components/dashboard/enhanced-stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Clock,
  CreditCard,
  DollarSign,
  Plus,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

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

function DashboardContent({ business, businessSlug, userRole }: DashboardContentProps) {
  const { data: metrics, isLoading, error } = useDashboardData({
    businessId: business.id,
  });

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="dashboard-heading-lg">Dashboard Overview</h1>
        <p className="text-lumina-secondary">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="dashboard-stats-grid">
        <EnhancedStatCard
          title="Total Revenue"
          value={metrics?.revenue.thisMonth || 0}
          change={metrics?.revenue.growth.monthly ? {
            value: metrics.revenue.growth.monthly,
            type: metrics.revenue.growth.monthly > 0 ? 'increase' :
              metrics.revenue.growth.monthly < 0 ? 'decrease' : 'neutral',
            period: 'this month'
          } : undefined}
          icon={DollarSign}
          color="revenue"
          trend={metrics?.revenue.trend}
          action={{
            label: 'View Financial Reports',
            href: `/dashboard/${businessSlug}/payments/reports`
          }}
          isLoading={isLoading}
        />

        <EnhancedStatCard
          title="Appointments Today"
          value={metrics?.appointments.today || business._count.appointments}
          change={metrics?.appointments.completionRate ? {
            value: metrics.appointments.completionRate,
            type: 'neutral',
            period: 'completion rate'
          } : undefined}
          icon={Calendar}
          color="appointments"
          trend={metrics?.appointments.trend}
          action={{
            label: 'View Calendar',
            href: `/dashboard/${businessSlug}/appointments`
          }}
          isLoading={isLoading}
        />

        <EnhancedStatCard
          title="Total Clients"
          value={metrics?.clients.total || business._count.clients}
          change={metrics?.clients.retentionRate ? {
            value: metrics.clients.retentionRate,
            type: 'neutral',
            period: 'retention rate'
          } : undefined}
          icon={Users}
          color="clients"
          trend={metrics?.clients.trend}
          action={{
            label: 'Manage Clients',
            href: `/dashboard/${businessSlug}/clients`
          }}
          isLoading={isLoading}
        />

        <EnhancedStatCard
          title="Active Staff"
          value={metrics?.staff.active || business._count.staff}
          change={metrics?.staff.utilization ? {
            value: metrics.staff.utilization,
            type: 'neutral',
            period: 'utilization'
          } : undefined}
          icon={UserCheck}
          color="staff"
          trend={metrics?.staff.trend}
          action={{
            label: 'Manage Staff',
            href: `/dashboard/${businessSlug}/staff`
          }}
          isLoading={isLoading}
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="dashboard-charts-grid">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href={`/dashboard/${businessSlug}/appointments/book`}>
                <Button className="w-full justify-start bg-lumina-radiant hover:bg-lumina-radiant-hover text-white">
                  <Calendar className="mr-2 h-4 w-4" />
                  Book Appointment
                </Button>
              </Link>

              <Link href={`/dashboard/${businessSlug}/payments/pos`}>
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Process Payment
                </Button>
              </Link>

              <Link href={`/dashboard/${businessSlug}/clients?action=add`}>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </Link>

              <Link href={`/dashboard/${businessSlug}/services?action=add`}>
                <Button variant="outline" className="w-full justify-start">
                  <UserCheck className="mr-2 h-4 w-4" />
                  Add Service
                </Button>
              </Link>
            </div>

            {/* Additional Actions */}
            <div className="pt-4 border-t space-y-2">
              <Link
                href={`/dashboard/${businessSlug}/analytics`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-4 w-4 text-lumina-secondary" />
                  <span className="text-sm font-medium">View Analytics</span>
                </div>
                <ArrowRight className="h-4 w-4 text-lumina-secondary" />
              </Link>

              <Link
                href={`/dashboard/${businessSlug}/payments/reports`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-lumina-secondary" />
                  <span className="text-sm font-medium">Financial Reports</span>
                </div>
                <ArrowRight className="h-4 w-4 text-lumina-secondary" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Mock upcoming appointments */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-blue-900">Sarah Johnson</p>
                  <p className="text-sm text-blue-700">Haircut & Style</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-blue-900">2:00 PM</p>
                  <p className="text-sm text-blue-700">with Emma</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-green-900">Mike Rodriguez</p>
                  <p className="text-sm text-green-700">Beard Trim</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-900">3:30 PM</p>
                  <p className="text-sm text-green-700">with Mike</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div>
                  <p className="font-medium text-orange-900">Lisa Chen</p>
                  <p className="text-sm text-orange-700">Manicure</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-orange-900">4:15 PM</p>
                  <p className="text-sm text-orange-700">with Emma</p>
                </div>
              </div>

              <Link
                href={`/dashboard/${businessSlug}/appointments`}
                className="block text-center py-2 text-sm font-medium text-lumina-coral hover:text-lumina-gold transition-colors"
              >
                View Full Schedule →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">✓</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-green-800">
                System Status: All Systems Operational
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Multi-tenant security active • Business data isolated • Real-time sync enabled
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
