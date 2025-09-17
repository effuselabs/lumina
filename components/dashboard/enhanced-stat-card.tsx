'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface EnhancedStatCardProps {
    title: string;
    value: number | string;
    change?: {
        value: number;
        type: 'increase' | 'decrease' | 'neutral';
        period: string;
    };
    icon: React.ComponentType<{ className?: string }>;
    color: 'revenue' | 'appointments' | 'clients' | 'staff';
    trend?: number[];
    action?: {
        label: string;
        href: string;
    };
    isLoading?: boolean;
    className?: string;
}

interface TrendIconProps {
    type: 'increase' | 'decrease' | 'neutral';
    className?: string;
}

function TrendIcon({ type, className }: TrendIconProps) {
    const Icon = type === 'increase' ? TrendingUp : type === 'decrease' ? TrendingDown : Minus;

    return (
        <Icon
            className={cn(
                'h-4 w-4',
                type === 'increase' && 'text-status-success',
                type === 'decrease' && 'text-status-danger',
                type === 'neutral' && 'text-text-secondary',
                className
            )}
        />
    );
}

interface MiniChartProps {
    data: number[];
    color: 'revenue' | 'appointments' | 'clients' | 'staff';
    className?: string;
}

function MiniChart({ data, color, className }: MiniChartProps) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const colorClasses = {
        revenue: 'stroke-metric-revenue',
        appointments: 'stroke-metric-appointments',
        clients: 'stroke-metric-clients',
        staff: 'stroke-metric-staff',
    };

    // Create SVG path for the trend line
    const pathData = data
        .map((value, index) => {
            const x = (index / (data.length - 1)) * 60;
            const y = 20 - ((value - min) / range) * 20;
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');

    return (
        <div className={cn('stat-card-trend', className)}>
            <svg width="60" height="20" className="overflow-visible">
                <path
                    d={pathData}
                    fill="none"
                    strokeWidth="2"
                    className={cn('opacity-70', colorClasses[color])}
                />
            </svg>
        </div>
    );
}

function StatCardSkeleton() {
    return (
        <Card className="stat-card">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                        <div className="h-5 w-15 bg-gray-200 rounded animate-pulse" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function EnhancedStatCard({
    title,
    value,
    change,
    icon: Icon,
    color,
    trend,
    action,
    isLoading,
    className,
}: EnhancedStatCardProps) {
    if (isLoading) {
        return <StatCardSkeleton />;
    }

    const formatValue = (val: number | string): string => {
        if (typeof val === 'string') return val;

        // Format numbers based on context
        if (title.toLowerCase().includes('revenue') || title.toLowerCase().includes('payment')) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(val);
        }

        return val.toLocaleString();
    };

    return (
        <Card className={cn('stat-card hover-lift', color, className)}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                        <p className="dashboard-metric-label">{title}</p>
                        <p className="dashboard-metric-value">{formatValue(value)}</p>
                        {change && (
                            <div className="flex items-center space-x-1">
                                <TrendIcon type={change.type} />
                                <span className={cn(
                                    'dashboard-metric-change',
                                    change.type === 'increase' && 'positive',
                                    change.type === 'decrease' && 'negative',
                                    change.type === 'neutral' && 'neutral'
                                )}>
                                    {change.type === 'increase' ? '+' : change.type === 'decrease' ? '-' : ''}
                                    {Math.abs(change.value)}% {change.period}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                        <div className="stat-card-icon">
                            <Icon className="h-6 w-6" />
                        </div>
                        {trend && trend.length > 1 && (
                            <MiniChart data={trend} color={color} />
                        )}
                    </div>
                </div>

                {action && (
                    <div className="stat-card-action">
                        <Link
                            href={action.href}
                            className="text-sm font-medium text-lumina-coral hover:text-lumina-gold transition-colors hover:underline"
                        >
                            {action.label} →
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Preset stat card configurations for common metrics
export const StatCardPresets = {
    revenue: (props: Partial<EnhancedStatCardProps>) => (
        <EnhancedStatCard
            color="revenue"
            icon={TrendingUp}
            title="Total Revenue"
            action={{ label: 'View Financial Reports', href: '#' }}
            {...props}
        />
    ),

    appointments: (props: Partial<EnhancedStatCardProps>) => (
        <EnhancedStatCard
            color="appointments"
            icon={TrendingUp}
            title="Appointments"
            action={{ label: 'View Calendar', href: '#' }}
            {...props}
        />
    ),

    clients: (props: Partial<EnhancedStatCardProps>) => (
        <EnhancedStatCard
            color="clients"
            icon={TrendingUp}
            title="Total Clients"
            action={{ label: 'Manage Clients', href: '#' }}
            {...props}
        />
    ),

    staff: (props: Partial<EnhancedStatCardProps>) => (
        <EnhancedStatCard
            color="staff"
            icon={TrendingUp}
            title="Staff Members"
            action={{ label: 'Manage Staff', href: '#' }}
            {...props}
        />
    ),
};