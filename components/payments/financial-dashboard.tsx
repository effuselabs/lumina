'use client';

/**
 * Financial Dashboard Component
 * 
 * Displays comprehensive financial metrics and reports with employment type breakdowns
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    Users
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

export default function FinancialDashboard({ businessId }: FinancialDashboardProps) {
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
            setError(error instanceof Error ? error.message : 'Failed to fetch financial report');
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Financial Dashboard</h2>
                    <p className="text-gray-600">
                        {format(new Date(report.period.start), 'MMM dd, yyyy')} - {format(new Date(report.period.end), 'MMM dd, yyyy')}
                    </p>
                </div>
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
                    <Button onClick={handleRefresh} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={handleExport} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(report.revenue.total)}</div>
                        <p className="text-xs text-muted-foreground">
                            {report.revenue.transactionCount} transactions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(report.revenue.net)}</div>
                        <p className="text-xs text-muted-foreground">
                            After {formatCurrency(report.revenue.refunds)} refunds
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Business Retention</CardTitle>
                        <PieChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(report.summary.totalBusinessRetention)}</div>
                        <p className="text-xs text-muted-foreground">
                            After staff payments
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{report.summary.totalStaff}</div>
                        <p className="text-xs text-muted-foreground">
                            {totalEmploymentTypes} employment type{totalEmploymentTypes !== 1 ? 's' : ''}
                        </p>
                    </CardContent>
                </Card>
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Revenue Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span>Gross Revenue</span>
                                        <span className="font-medium">{formatCurrency(report.revenue.total)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-red-600">
                                        <span>Refunds</span>
                                        <span className="font-medium">-{formatCurrency(report.revenue.refunds)}</span>
                                    </div>
                                    <div className="border-t pt-2">
                                        <div className="flex justify-between items-center font-bold">
                                            <span>Net Revenue</span>
                                            <span>{formatCurrency(report.revenue.net)}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-gray-600">
                                        <span>Average Transaction</span>
                                        <span>{formatCurrency(report.revenue.averageTransaction)}</span>
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
                                    {report.summary.activeEmploymentTypes.includes('COMMISSION') && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="default">Commission</Badge>
                                                <span className="text-sm">{report.employmentBreakdown.commission.staffCount} staff</span>
                                            </div>
                                            <span className="font-medium">
                                                {formatCurrency(report.employmentBreakdown.commission.totalRevenue)}
                                            </span>
                                        </div>
                                    )}

                                    {report.summary.activeEmploymentTypes.includes('CHAIR_RENTAL') && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">Chair Rental</Badge>
                                                <span className="text-sm">{report.employmentBreakdown.chairRental.staffCount} staff</span>
                                            </div>
                                            <span className="font-medium">
                                                {formatCurrency(report.employmentBreakdown.chairRental.totalRevenue)}
                                            </span>
                                        </div>
                                    )}

                                    {report.summary.activeEmploymentTypes.includes('HYBRID') && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">Hybrid</Badge>
                                                <span className="text-sm">{report.employmentBreakdown.hybrid.staffCount} staff</span>
                                            </div>
                                            <span className="font-medium">
                                                {formatCurrency(report.employmentBreakdown.hybrid.totalRevenue)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="employment" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {report.summary.activeEmploymentTypes.includes('COMMISSION') && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4" />
                                        Commission Staff
                                    </CardTitle>
                                    <CardDescription>
                                        {report.employmentBreakdown.commission.staffCount} staff members
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm">Total Revenue</span>
                                            <span className="font-medium">
                                                {formatCurrency(report.employmentBreakdown.commission.totalRevenue)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Transactions</span>
                                            <span>{report.employmentBreakdown.commission.transactionCount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Avg per Staff</span>
                                            <span>{formatCurrency(report.employmentBreakdown.commission.averagePerStaff)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {report.summary.activeEmploymentTypes.includes('CHAIR_RENTAL') && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Chair Rental
                                    </CardTitle>
                                    <CardDescription>
                                        {report.employmentBreakdown.chairRental.staffCount} contractors
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm">Total Revenue</span>
                                            <span className="font-medium">
                                                {formatCurrency(report.employmentBreakdown.chairRental.totalRevenue)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Transactions</span>
                                            <span>{report.employmentBreakdown.chairRental.transactionCount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Avg per Staff</span>
                                            <span>{formatCurrency(report.employmentBreakdown.chairRental.averagePerStaff)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {report.summary.activeEmploymentTypes.includes('HYBRID') && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4" />
                                        Hybrid Staff
                                    </CardTitle>
                                    <CardDescription>
                                        {report.employmentBreakdown.hybrid.staffCount} staff members
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm">Total Revenue</span>
                                            <span className="font-medium">
                                                {formatCurrency(report.employmentBreakdown.hybrid.totalRevenue)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Transactions</span>
                                            <span>{report.employmentBreakdown.hybrid.transactionCount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Avg per Staff</span>
                                            <span>{formatCurrency(report.employmentBreakdown.hybrid.averagePerStaff)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
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
                                {report.staffSummary.map((staff) => (
                                    <div key={staff.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <p className="font-medium">{staff.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline">{staff.employmentType}</Badge>
                                                {staff.commissionRate && (
                                                    <span className="text-sm text-gray-600">
                                                        {staff.commissionRate}% commission
                                                    </span>
                                                )}
                                                {staff.chairRentalAmount && (
                                                    <span className="text-sm text-gray-600">
                                                        {formatCurrency(staff.chairRentalAmount)} {staff.chairRentalPeriod}
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
                                {report.recentTransactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{transaction.type}</Badge>
                                                <span className="text-sm font-medium">
                                                    {formatCurrency(transaction.amount)}
                                                </span>
                                                <Badge variant={transaction.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                                    {transaction.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">
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