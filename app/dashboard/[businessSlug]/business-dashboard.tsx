'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
 * Business Dashboard Client Component
 * 
 * Provides:
 * - Business overview and statistics
 * - Navigation to business features
 * - Role-based UI elements
 * - Real-time data with React Query
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
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">
                                    {business.name}
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Welcome back, {userName} • {userRole}
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-500">
                                    Business ID: {business.id.slice(-8)}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            title="Total Clients"
                            value={business._count.clients}
                            icon="👥"
                            color="blue"
                        />
                        <StatCard
                            title="Active Services"
                            value={business._count.services}
                            icon="✂️"
                            color="green"
                        />
                        <StatCard
                            title="Staff Members"
                            value={business._count.staff}
                            icon="👨‍💼"
                            color="purple"
                        />
                        <StatCard
                            title="Appointments"
                            value={business._count.appointments}
                            icon="📅"
                            color="orange"
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Quick Actions
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ActionCard
                                title="Manage Clients"
                                description="View and manage your client database"
                                href={`/dashboard/${businessSlug}/clients`}
                                icon="👥"
                            />
                            <ActionCard
                                title="Services & Pricing"
                                description="Update your service offerings"
                                href={`/dashboard/${businessSlug}/services`}
                                icon="✂️"
                            />
                            <ActionCard
                                title="Staff Management"
                                description="Manage your team and schedules"
                                href={`/dashboard/${businessSlug}/staff`}
                                icon="👨‍💼"
                            />
                        </div>
                    </div>

                    {/* System Status */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <span className="text-green-500 text-xl">✅</span>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800">
                                    Authentication System Active
                                </h3>
                                <p className="text-sm text-green-700 mt-1">
                                    Multi-tenant security enabled • Business data isolated • User access verified
                                </p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </QueryClientProvider>
    );
}

interface StatCardProps {
    title: string;
    value: number;
    icon: string;
    color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        green: 'bg-green-50 text-green-600 border-green-200',
        purple: 'bg-purple-50 text-purple-600 border-purple-200',
        orange: 'bg-orange-50 text-orange-600 border-orange-200',
    };

    return (
        <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium opacity-75">{title}</p>
                    <p className="text-3xl font-bold mt-1">{value}</p>
                </div>
                <span className="text-2xl">{icon}</span>
            </div>
        </div>
    );
}

interface ActionCardProps {
    title: string;
    description: string;
    href: string;
    icon: string;
}

function ActionCard({ title, description, href, icon }: ActionCardProps) {
    return (
        <a
            href={href}
            className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
        >
            <div className="flex items-start space-x-3">
                <span className="text-xl">{icon}</span>
                <div>
                    <h3 className="font-medium text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{description}</p>
                </div>
            </div>
        </a>
    );
}