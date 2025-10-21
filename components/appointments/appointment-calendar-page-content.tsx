'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    CalendarDays,
    Filter,
    Plus,
    Search,
    Users
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { BusinessHoursEntry, DashboardAppointment } from '../../types/dashboard-appointments';
import { CalendarHeader } from './calendar-header';
import { CalendarView } from './calendar-view';

interface Staff {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    isActive: boolean;
    user?: {
        email: string;
    };
}

interface Service {
    id: string;
    name: string;
    duration: number;
    price: any; // Prisma Decimal type
}

interface AppointmentCalendarPageContentProps {
    business: {
        id: string;
        name: string;
        users: Array<{ role: string }>;
        staff: Staff[];
        services: Service[];
    };
    userRole: string;
    userName: string;
    businessSlug: string;
}

// Remove duplicate type definition - using imported type

/**
 * Appointment Calendar Page Content Component
 *
 * Provides comprehensive calendar view for appointment management:
 * - Day, week, and month calendar views
 * - Calendar navigation and view switching
 * - Appointment display and interaction
 * - Staff filtering and multi-staff views
 * - Responsive design for all devices
 */
export function AppointmentCalendarPageContent({
    business,
    userRole,
    userName,
    businessSlug,
}: AppointmentCalendarPageContentProps) {
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

    const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>('week');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Mock data - will be replaced with real data from API
    const mockAppointments: DashboardAppointment[] = [];
    const mockBusinessHours: BusinessHoursEntry[] = [
        { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Monday
        { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Tuesday
        { dayOfWeek: 3, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Wednesday
        { dayOfWeek: 4, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Thursday
        { dayOfWeek: 5, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Friday
        { dayOfWeek: 6, openTime: '10:00', closeTime: '16:00', isClosed: false }, // Saturday
        { dayOfWeek: 0, openTime: '09:00', closeTime: '17:00', isClosed: true },  // Sunday
    ];

    const mockStaffMembers = business.staff.map(staff => ({
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        displayName: `${staff.firstName} ${staff.lastName}`,
        color: '#FF7A5A', // Lumina coral color
        isActive: staff.isActive,
    }));

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);

        if (currentView === 'day') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        } else if (currentView === 'week') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        } else {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        }

        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const handleAppointmentClick = (appointment: DashboardAppointment) => {
        // TODO: Open appointment modal
        console.log('Appointment clicked:', appointment);
    };

    const handleTimeSlotClick = (timeSlot: any) => {
        // TODO: Handle time slot selection for new appointments
        console.log('Time slot clicked:', timeSlot);
    };

    return (
        <QueryClientProvider client={queryClient}>
            <DashboardLayout
                businessSlug={businessSlug}
                userRole={userRole}
                userName={userName}
                businessName={business.name}
            >
                <div className="space-y-6">
                    {/* Page Header */}
                    <PageHeader
                        title="Calendar View"
                        description="View and manage appointments in calendar format with day, week, and month views."
                        actions={[
                            {
                                label: 'New Appointment',
                                onClick: () => {
                                    // TODO: Implement new appointment functionality
                                },
                                icon: Plus,
                                primary: true,
                            },
                        ]}
                    />

                    {/* Calendar Controls */}
                    <Card className="border-color-border shadow-sm">
                        <CardHeader>
                            <CalendarHeader
                                view={currentView}
                                currentDate={currentDate}
                                onViewChange={setCurrentView}
                                onDateChange={setCurrentDate}
                                onNavigate={navigateDate}
                                onToday={goToToday}
                            />
                        </CardHeader>
                    </Card>

                    {/* Calendar Filters and Actions */}
                    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                icon={<Users className="h-4 w-4" />}
                            >
                                All Staff ({business.staff.filter(s => s.isActive).length})
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                icon={<Filter className="h-4 w-4" />}
                            >
                                Filter
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                icon={<Search className="h-4 w-4" />}
                            >
                                Search
                            </Button>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Button
                                variant="primary"
                                size="sm"
                                icon={<Plus className="h-4 w-4" />}
                                asChild
                            >
                                <Link href={`/dashboard/${businessSlug}/appointments/book`}>
                                    New Appointment
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Calendar View */}
                    <Card className="border-color-border shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <CalendarDays className="h-5 w-5" />
                                <span>{currentView.charAt(0).toUpperCase() + currentView.slice(1)} View</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="h-[600px]">
                                <CalendarView
                                    view={currentView}
                                    currentDate={currentDate}
                                    appointments={mockAppointments}
                                    staffMembers={mockStaffMembers}
                                    businessHours={mockBusinessHours}
                                    onAppointmentClick={handleAppointmentClick}
                                    onTimeSlotClick={handleTimeSlotClick}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Staff Overview */}
                    {business.staff.length > 0 && (
                        <Card className="border-color-border shadow-sm">
                            <CardHeader>
                                <CardTitle>Staff Overview</CardTitle>
                                <p className="text-color-foreground-muted text-sm">
                                    Active staff members available for appointment scheduling
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {business.staff
                                        .filter(staff => staff.isActive)
                                        .map((staff) => (
                                            <div
                                                key={staff.id}
                                                className="flex items-center space-x-3 p-3 rounded-lg border border-color-border"
                                            >
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lumina-radiant/10">
                                                    <span className="text-sm font-semibold text-lumina-coral">
                                                        {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">
                                                        {staff.firstName} {staff.lastName}
                                                    </p>
                                                    <p className="text-color-foreground-muted text-xs truncate">
                                                        Staff Member
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </DashboardLayout>
        </QueryClientProvider>
    );
}