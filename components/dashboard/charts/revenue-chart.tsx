'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { DollarSign, TrendingUp } from 'lucide-react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

interface RevenueData {
    date: string;
    revenue: number;
    target?: number;
    appointments?: number;
}

interface RevenueChartProps {
    data: RevenueData[];
    period: 'daily' | 'weekly' | 'monthly';
    totalRevenue: number;
    growth: number;
    isLoading?: boolean;
    className?: string;
}

function RevenueChartSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-80 bg-gray-100 rounded animate-pulse" />
            </CardContent>
        </Card>
    );
}

export function RevenueChart({
    data,
    period,
    totalRevenue,
    growth,
    isLoading,
    className
}: RevenueChartProps) {
    if (isLoading) {
        return <RevenueChartSkeleton />;
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        switch (period) {
            case 'daily':
                return format(date, 'MMM dd');
            case 'weekly':
                return format(date, 'MMM dd');
            case 'monthly':
                return format(date, 'MMM yyyy');
            default:
                return format(date, 'MMM dd');
        }
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
                                {formatCurrency(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            Revenue Trend
                        </CardTitle>
                        <CardDescription>
                            {period === 'daily' ? 'Daily' : period === 'weekly' ? 'Weekly' : 'Monthly'} revenue performance
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(totalRevenue)}
                        </div>
                        <div className={`text-sm flex items-center gap-1 ${growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                            <TrendingUp className="h-3 w-3" />
                            {growth > 0 ? '+' : ''}{growth}% vs last period
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22C58B" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22C58B" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FFD25A" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#FFD25A" stopOpacity={0} />
                            </linearGradient>
                        </defs>
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
                            tickFormatter={formatCurrency}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#22C58B"
                            strokeWidth={3}
                            fill="url(#revenueGradient)"
                            name="Revenue"
                        />
                        {data.some(d => d.target) && (
                            <Area
                                type="monotone"
                                dataKey="target"
                                stroke="#FFD25A"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                fill="url(#targetGradient)"
                                name="Target"
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}