'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Calendar, TrendingUp } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface AppointmentData {
    date: string;
    scheduled: number;
    completed: number;
    cancelled: number;
    noShow: number;
}

interface ServicePopularityData {
    name: string;
    count: number;
    revenue: number;
    color: string;
}

interface AppointmentChartProps {
    data: AppointmentData[];
    serviceData: ServicePopularityData[];
    totalAppointments: number;
    completionRate: number;
    isLoading?: boolean;
    className?: string;
}

function AppointmentChartSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                    <div className="h-64 bg-gray-100 rounded animate-pulse" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <div className="h-6 w-36 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                    <div className="h-64 bg-gray-100 rounded animate-pulse" />
                </CardContent>
            </Card>
        </div>
    );
}

export function AppointmentChart({
    data,
    serviceData,
    totalAppointments,
    completionRate,
    isLoading,
    className
}: AppointmentChartProps) {
    if (isLoading) {
        return <AppointmentChartSkeleton />;
    }

    const formatDate = (dateString: string) => {
        return format(new Date(dateString), 'MMM dd');
    };

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <p className="font-medium text-gray-900 mb-2">{formatDate(label || '')}</p>
                    {payload.map((entry: { color: string; name: string; value: number }, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm text-gray-600">{entry.name}:</span>
                            <span className="text-sm font-medium text-gray-900">
                                {entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const ServiceTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <p className="font-medium text-gray-900 mb-2">{data.name}</p>
                    <div className="space-y-1">
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-600">Appointments:</span>
                            <span className="text-sm font-medium">{data.count}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-600">Revenue:</span>
                            <span className="text-sm font-medium">
                                ${data.revenue.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
            {/* Appointment Volume Chart */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                Appointment Volume
                            </CardTitle>
                            <CardDescription>
                                Daily appointment bookings and status
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                                {totalAppointments}
                            </div>
                            <div className="text-sm text-gray-600">
                                {completionRate}% completion rate
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E4E6E7" />
                            <XAxis
                                dataKey="date"
                                stroke="#808285"
                                fontSize={12}
                                tickFormatter={formatDate}
                            />
                            <YAxis
                                stroke="#808285"
                                fontSize={12}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                                dataKey="completed"
                                stackId="a"
                                fill="#22C58B"
                                name="Completed"
                                radius={[0, 0, 0, 0]}
                            />
                            <Bar
                                dataKey="scheduled"
                                stackId="a"
                                fill="#3B82F6"
                                name="Scheduled"
                                radius={[0, 0, 0, 0]}
                            />
                            <Bar
                                dataKey="cancelled"
                                stackId="a"
                                fill="#F59E0B"
                                name="Cancelled"
                                radius={[0, 0, 0, 0]}
                            />
                            <Bar
                                dataKey="noShow"
                                stackId="a"
                                fill="#E5484D"
                                name="No Show"
                                radius={[2, 2, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Service Popularity Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                        Service Popularity
                    </CardTitle>
                    <CardDescription>
                        Most booked services and revenue contribution
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={serviceData as any}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="count"
                            >
                                {serviceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<ServiceTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Legend */}
                    <div className="mt-4 space-y-2">
                        {serviceData.map((service, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: service.color }}
                                    />
                                    <span className="text-sm text-gray-700">{service.name}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium">{service.count} bookings</div>
                                    <div className="text-xs text-gray-500">
                                        ${service.revenue.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}