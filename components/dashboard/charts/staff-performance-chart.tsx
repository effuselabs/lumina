'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Users } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface StaffPerformanceData {
    name: string;
    revenue: number;
    appointments: number;
    utilization: number;
    rating: number;
    commissionEarned: number;
    employmentType: 'COMMISSION' | 'CHAIR_RENTAL' | 'HYBRID';
}

interface StaffMetricsData {
    metric: string;
    value: number;
    fullMark: number;
}

interface StaffPerformanceChartProps {
    staffData: StaffPerformanceData[];
    topPerformer: StaffPerformanceData;
    averageUtilization: number;
    isLoading?: boolean;
    className?: string;
}

function StaffPerformanceChartSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                    <div className="h-80 bg-gray-100 rounded animate-pulse" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                    <div className="h-80 bg-gray-100 rounded animate-pulse" />
                </CardContent>
            </Card>
        </div>
    );
}

export function StaffPerformanceChart({
    staffData,
    topPerformer,
    isLoading,
    className
}: StaffPerformanceChartProps) {
    if (isLoading) {
        return <StaffPerformanceChartSkeleton />;
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const getEmploymentTypeColor = (type: string) => {
        switch (type) {
            case 'COMMISSION':
                return '#22C58B';
            case 'CHAIR_RENTAL':
                return '#3B82F6';
            case 'HYBRID':
                return '#8B5CF6';
            default:
                return '#6B7280';
        }
    };

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                    <p className="font-medium text-gray-900 mb-3">{label}</p>
                    <div className="space-y-2">
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-600">Revenue:</span>
                            <span className="text-sm font-medium">{formatCurrency(data.revenue)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-600">Appointments:</span>
                            <span className="text-sm font-medium">{data.appointments}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-600">Utilization:</span>
                            <span className="text-sm font-medium">{data.utilization}%</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-600">Commission:</span>
                            <span className="text-sm font-medium">{formatCurrency(data.commissionEarned)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-600">Type:</span>
                            <span className="text-sm font-medium capitalize">
                                {data.employmentType.toLowerCase().replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Prepare radar chart data for top performer
    const radarData: StaffMetricsData[] = [
        {
            metric: 'Revenue',
            value: Math.min((topPerformer.revenue / 5000) * 100, 100), // Normalize to 100
            fullMark: 100,
        },
        {
            metric: 'Appointments',
            value: Math.min((topPerformer.appointments / 50) * 100, 100), // Normalize to 100
            fullMark: 100,
        },
        {
            metric: 'Utilization',
            value: topPerformer.utilization,
            fullMark: 100,
        },
        {
            metric: 'Rating',
            value: (topPerformer.rating / 5) * 100, // Convert 5-star to percentage
            fullMark: 100,
        },
    ];

    return (
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
            {/* Staff Performance Bar Chart */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        Staff Performance
                    </CardTitle>
                    <CardDescription>
                        Revenue and appointment performance by staff member
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                            data={staffData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            layout="horizontal"
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#E4E6E7" />
                            <XAxis
                                type="number"
                                stroke="#808285"
                                fontSize={12}
                                tickFormatter={formatCurrency}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                stroke="#808285"
                                fontSize={12}
                                width={80}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                                dataKey="revenue"
                                fill={(entry: any) => getEmploymentTypeColor(entry.employmentType)}
                                radius={[0, 4, 4, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>

                    {/* Employment Type Legend */}
                    <div className="mt-4 flex flex-wrap gap-4 justify-center">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-sm text-gray-600">Commission</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-sm text-gray-600">Chair Rental</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                            <span className="text-sm text-gray-600">Hybrid</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Top Performer Radar Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-yellow-600" />
                        Top Performer
                    </CardTitle>
                    <CardDescription>
                        {topPerformer.name}'s performance metrics
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                        <RadarChart data={radarData}>
                            <PolarGrid stroke="#E4E6E7" />
                            <PolarAngleAxis
                                dataKey="metric"
                                tick={{ fontSize: 12, fill: '#808285' }}
                            />
                            <PolarRadiusAxis
                                angle={90}
                                domain={[0, 100]}
                                tick={{ fontSize: 10, fill: '#808285' }}
                            />
                            <Radar
                                name="Performance"
                                dataKey="value"
                                stroke="#FFD25A"
                                fill="#FFD25A"
                                fillOpacity={0.3}
                                strokeWidth={2}
                            />
                        </RadarChart>
                    </ResponsiveContainer>

                    {/* Top Performer Stats */}
                    <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Revenue:</span>
                            <span className="text-sm font-medium">{formatCurrency(topPerformer.revenue)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Appointments:</span>
                            <span className="text-sm font-medium">{topPerformer.appointments}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Utilization:</span>
                            <span className="text-sm font-medium">{topPerformer.utilization}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Rating:</span>
                            <span className="text-sm font-medium">
                                {topPerformer.rating.toFixed(1)} ★
                            </span>
                        </div>
                        <div className="pt-2 border-t">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Commission:</span>
                                <span className="text-sm font-medium text-green-600">
                                    {formatCurrency(topPerformer.commissionEarned)}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}