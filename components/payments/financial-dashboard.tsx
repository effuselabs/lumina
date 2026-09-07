'use client';

/**
 * Financial Dashboard Component
 *
 * Displays comprehensive financial metrics and reports with employment type breakdowns
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/financial/employment-calculator';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  DollarSign,
  Download,
  Loader2,
  PieChart,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface FinancialReport {
  businessId: string;
  businessName: string;
  period: {
    start: string;
    end: string;
  };
  currency: string;
  generatedAt: string;
  revenue: {
    total: number;
    refunds: number;
    net: number;
    transactionCount: number;
    averageTransaction: number;
    dailyBreakdown: Array<{
      date: string;
      amount: number;
    }>;
  };
  employmentBreakdown: {
    commission: {
      staffCount: number;
      totalRevenue: number;
      netRevenue: number;
      transactionCount: number;
      averagePerStaff: number;
    };
    chairRental: {
      staffCount: number;
      totalRevenue: number;
      netRevenue: number;
      transactionCount: number;
      averagePerStaff: number;
    };
    hybrid: {
      staffCount: number;
      totalRevenue: number;
      netRevenue: number;
      transactionCount: number;
      averagePerStaff: number;
    };
  };
  staffSummary: Array<{
    id: string;
    name: string;
    employmentType: string;
    commissionRate?: number;
    chairRentalAmount?: number;
    chairRentalPeriod?: string;
  }>;
  recentTransactions: Array<{
    id: string;
    date: string;
    type: string;
    amount: number;
    staffName?: string;
    appointmentId?: string;
    status: string;
    commissionAmount?: number;
    employmentType?: string;
  }>;
  summary: {
    totalStaff: number;
    activeEmploymentTypes: string[];
    totalBusinessRetention: number;
  };
}

interface FinancialDashboardProps {
  businessId: string;
}

const DATE_RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
];

export default function FinancialDashboard({
  businessId,
}: FinancialDashboardProps) {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [dateRange, setDateRange] = useState('30');
  const [startDate] = useState<string>('');
  const [endDate] = useState<string>('');

  const fetchReport = async () => {
    setIsLoading(true);
    setError('');

    try {
      let reportStartDate: Date;
      let reportEndDate: Date;

      if (dateRange === 'custom' && startDate && endDate) {
        reportStartDate = startOfDay(new Date(startDate));
        reportEndDate = endOfDay(new Date(endDate));
      } else {
        const days = parseInt(dateRange);
        reportEndDate = endOfDay(new Date());
        reportStartDate = startOfDay(subDays(reportEndDate, days));
      }

      const params = new URLSearchParams({
        businessId,
        startDate: reportStartDate.toISOString(),
        endDate: reportEndDate.toISOString(),
        reportType: 'detailed',
      });

      const response = await fetch(`/api/reports/financial?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch financial report');
      }

      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error('Error fetching financial report:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to fetch financial report'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [businessId, dateRange, startDate, endDate]);

  const handleRefresh = () => {
    fetchReport();
  };

  const handleExport = async () => {
    // TODO: Implement report export functionality
    console.log('Export report functionality to be implemented');
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading || !report) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading financial report...</span>
        </div>
      </div>
    );
  }

  const totalEmploymentTypes = report.summary.activeEmploymentTypes.length;
  // const hasMultipleEmploymentTypes = totalEmploymentTypes > 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Financial Dashboard"
        description={`${format(new Date(report.period.start), 'MMM dd, yyyy')} - ${format(new Date(report.period.end), 'MMM dd, yyyy')}`}
        actions={[
          {
            label: 'Refresh',
            onClick: handleRefresh,
            icon: RefreshCw,
            variant: 'outline',
          },
          {
            label: 'Export',
            onClick: handleExport,
            icon: Download,
            variant: 'primary',
            primary: true,
          },
        ]}
      >
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map(range => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {/* Key Metrics - Optimized StatCards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={report.revenue.total}
          icon={DollarSign}
          size="compact"
          change={{
            value: 0, // TODO: Calculate change from previous period
            type: 'neutral',
            period: `${report.revenue.transactionCount} transactions`,
          }}
        />

        <StatCard
          title="Net Revenue"
          value={report.revenue.net}
          icon={TrendingUp}
          size="compact"
          change={{
            value: 0, // TODO: Calculate change from previous period
            type: 'neutral',
            period: `After ${formatCurrency(report.revenue.refunds)} refunds`,
          }}
        />

        <StatCard
          title="Business Retention"
          value={report.summary.totalBusinessRetention}
          icon={PieChart}
          size="compact"
          change={{
            value: 0, // TODO: Calculate change from previous period
            type: 'neutral',
            period: 'After staff payments',
          }}
        />

        <StatCard
          title="Active Staff"
          value={report.summary.totalStaff}
          icon={Users}
          size="compact"
          change={{
            value: 0, // TODO: Calculate change from previous period
            type: 'neutral',
            period: `${totalEmploymentTypes} employment type${totalEmploymentTypes !== 1 ? 's' : ''}`,
          }}
        />
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employment">Employment Types</TabsTrigger>
          <TabsTrigger value="staff">Staff Performance</TabsTrigger>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Gross Revenue</span>
                    <span className="font-medium">
                      {formatCurrency(report.revenue.total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-red-600">
                    <span>Refunds</span>
                    <span className="font-medium">
                      -{formatCurrency(report.revenue.refunds)}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex items-center justify-between font-bold">
                      <span>Net Revenue</span>
                      <span>{formatCurrency(report.revenue.net)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Average Transaction</span>
                    <span>
                      {formatCurrency(report.revenue.averageTransaction)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Employment Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.summary.activeEmploymentTypes.includes(
                    'COMMISSION'
                  ) && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="default"
                          className="bg-blue-500 text-white hover:bg-blue-500"
                        >
                          Commission
                        </Badge>
                        <span className="text-sm">
                          {report.employmentBreakdown.commission.staffCount}{' '}
                          staff
                        </span>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(
                          report.employmentBreakdown.commission.totalRevenue
                        )}
                      </span>
                    </div>
                  )}

                  {report.summary.activeEmploymentTypes.includes(
                    'CHAIR_RENTAL'
                  ) && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-green-500 text-white hover:bg-green-500"
                        >
                          Chair Rental
                        </Badge>
                        <span className="text-sm">
                          {report.employmentBreakdown.chairRental.staffCount}{' '}
                          staff
                        </span>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(
                          report.employmentBreakdown.chairRental.totalRevenue
                        )}
                      </span>
                    </div>
                  )}

                  {report.summary.activeEmploymentTypes.includes('HYBRID') && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white"
                        >
                          Hybrid
                        </Badge>
                        <span className="text-sm">
                          {report.employmentBreakdown.hybrid.staffCount} staff
                        </span>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(
                          report.employmentBreakdown.hybrid.totalRevenue
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employment" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {report.summary.activeEmploymentTypes.includes('COMMISSION') && (
              <StatCard
                title="Commission Staff"
                value={report.employmentBreakdown.commission.totalRevenue}
                icon={TrendingUp}
                size="default"
                change={{
                  value: 0, // TODO: Calculate change from previous period
                  type: 'neutral',
                  period: `${report.employmentBreakdown.commission.staffCount} staff • ${report.employmentBreakdown.commission.transactionCount} transactions`,
                }}
                action={{
                  label: `Avg: ${formatCurrency(report.employmentBreakdown.commission.averagePerStaff)} per staff`,
                  href: '#',
                }}
              />
            )}

            {report.summary.activeEmploymentTypes.includes('CHAIR_RENTAL') && (
              <StatCard
                title="Chair Rental"
                value={report.employmentBreakdown.chairRental.totalRevenue}
                icon={Calendar}
                size="default"
                change={{
                  value: 0, // TODO: Calculate change from previous period
                  type: 'neutral',
                  period: `${report.employmentBreakdown.chairRental.staffCount} contractors • ${report.employmentBreakdown.chairRental.transactionCount} transactions`,
                }}
                action={{
                  label: `Avg: ${formatCurrency(report.employmentBreakdown.chairRental.averagePerStaff)} per staff`,
                  href: '#',
                }}
              />
            )}

            {report.summary.activeEmploymentTypes.includes('HYBRID') && (
              <StatCard
                title="Hybrid Staff"
                value={report.employmentBreakdown.hybrid.totalRevenue}
                icon={BarChart3}
                size="default"
                change={{
                  value: 0, // TODO: Calculate change from previous period
                  type: 'neutral',
                  period: `${report.employmentBreakdown.hybrid.staffCount} staff • ${report.employmentBreakdown.hybrid.transactionCount} transactions`,
                }}
                action={{
                  label: `Avg: ${formatCurrency(report.employmentBreakdown.hybrid.averagePerStaff)} per staff`,
                  href: '#',
                }}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Summary</CardTitle>
              <CardDescription>
                Employment configuration and performance overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.staffSummary.map(staff => (
                  <div
                    key={staff.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{staff.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            staff.employmentType === 'COMMISSION'
                              ? 'border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white'
                              : staff.employmentType === 'CHAIR_RENTAL'
                                ? 'border-green-500 text-green-500 hover:bg-green-500 hover:text-white'
                                : staff.employmentType === 'HYBRID'
                                  ? 'border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white'
                                  : ''
                          }
                        >
                          {staff.employmentType.replace('_', ' ')}
                        </Badge>
                        {staff.commissionRate && (
                          <span className="text-sm text-gray-600">
                            {staff.commissionRate}% commission
                          </span>
                        )}
                        {staff.chairRentalAmount && (
                          <span className="text-sm text-gray-600">
                            {formatCurrency(staff.chairRentalAmount)}{' '}
                            {staff.chairRentalPeriod}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Latest 20 transactions in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.recentTransactions.map(transaction => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{transaction.type}</Badge>
                        <span className="text-sm font-medium">
                          {formatCurrency(transaction.amount)}
                        </span>
                        <Badge
                          variant={
                            transaction.status === 'COMPLETED'
                              ? 'default'
                              : 'secondary'
                          }
                          className={
                            transaction.status === 'COMPLETED'
                              ? 'bg-green-500 text-white hover:bg-green-500'
                              : 'bg-neutral-400 text-white hover:bg-neutral-400'
                          }
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {transaction.staffName && `${transaction.staffName} • `}
                        {format(new Date(transaction.date), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                    {transaction.commissionAmount && (
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(transaction.commissionAmount)}
                        </p>
                        <p className="text-xs text-gray-500">Commission</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
