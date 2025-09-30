'use client';

import { cn } from '@/lib/utils';
import { CalendarSlot, CalendarViewProps, DashboardAppointment } from '@/types/dashboard-appointments';
import { useDragDropState } from './drag-drop-context';

/**
 * MonthView Component
 * 
 * Displays appointments in a monthly calendar format with enhanced features:
 * - Responsive design for mobile and desktop
 * - Appointment density visualization with color coding
 * - Staff-specific appointment indicators
 * - Touch-friendly interactions
 * - Appointment preview on hover/tap
 * 
 * Requirements: 1.4, 6.3, 6.4
 */
export function MonthView({
    currentDate,
    appointments,
    staffMembers,
    businessHours,
    onAppointmentClick,
    onAppointmentDrop,
    onTimeSlotClick,
}: Omit<CalendarViewProps, 'view'>) {
    const dragState = useDragDropState();
    // Generate calendar grid (6 weeks x 7 days)
    const generateCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of the month
        const firstDay = new Date(year, month, 1);


        // Start from the Sunday of the week containing the first day
        const startDate = new Date(firstDay);
        startDate.setDate(firstDay.getDate() - firstDay.getDay());

        // Generate 42 days (6 weeks)
        const days = [];
        const current = new Date(startDate);

        for (let i = 0; i < 42; i++) {
            const date = new Date(current);
            const isCurrentMonth = date.getMonth() === month;
            const isToday = date.toDateString() === new Date().toDateString();

            // Get appointments for this day
            const dayAppointments = appointments.filter(apt =>
                apt.startTime.toDateString() === date.toDateString()
            );

            // Check if business is open on this day
            const dayOfWeek = date.getDay();
            const businessHour = businessHours.find(h => h.dayOfWeek === dayOfWeek);
            const isBusinessOpen = businessHour && !businessHour.isClosed || false;

            days.push({
                date: new Date(date),
                isCurrentMonth,
                isToday,
                isBusinessOpen,
                appointments: dayAppointments,
                appointmentCount: dayAppointments.length,
            });

            current.setDate(current.getDate() + 1);
        }

        return days;
    };

    // Calculate appointment density for visualization
    const calculateDensity = (appointmentCount: number) => {
        if (appointmentCount === 0) return 'none';
        if (appointmentCount <= 2) return 'low';
        if (appointmentCount <= 4) return 'medium';
        if (appointmentCount <= 6) return 'high';
        return 'very-high';
    };

    // Get density styling
    const getDensityStyle = (density: string) => {
        switch (density) {
            case 'none': return '';
            case 'low': return 'bg-green-50 border-green-200';
            case 'medium': return 'bg-yellow-50 border-yellow-200';
            case 'high': return 'bg-orange-50 border-orange-200';
            case 'very-high': return 'bg-red-50 border-red-200';
            default: return '';
        }
    };

    // Get staff color distribution for a day
    const getStaffColorDistribution = (dayAppointments: DashboardAppointment[]) => {
        const staffColors = new Map<string, number>();
        dayAppointments.forEach(apt => {
            const count = staffColors.get(apt.staff.color) || 0;
            staffColors.set(apt.staff.color, count + 1);
        });
        return Array.from(staffColors.entries()).sort((a, b) => b[1] - a[1]);
    };

    const calendarDays = generateCalendarDays();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // For mobile

    // Group days into weeks
    const weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
        weeks.push(calendarDays.slice(i, i + 7));
    }

    return (
        <div className="flex flex-col h-full bg-color-background">
            {/* Month Header */}
            <div className="grid grid-cols-7 border-b-2 border-color-border bg-color-background-muted sticky top-0 z-10">
                {dayNames.map((dayName, index) => (
                    <div
                        key={dayName}
                        className="p-2 sm:p-3 text-center text-xs sm:text-sm font-medium text-color-foreground-muted border-r border-color-border last:border-r-0"
                    >
                        <span className="hidden sm:inline">{dayName}</span>
                        <span className="sm:hidden">{dayNamesShort[index]}</span>
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-hidden">
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 h-1/6 border-b border-color-border last:border-b-0">
                        {week.map((day, dayIndex) => {
                            const density = calculateDensity(day.appointmentCount);
                            const staffColors = getStaffColorDistribution(day.appointments);

                            // Create a time slot for the entire day
                            const daySlot: CalendarSlot = {
                                startTime: new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), 0, 0),
                                endTime: new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), 23, 59),
                                staffId: '', // All staff
                                isAvailable: day.isBusinessOpen,
                                appointments: day.appointments,
                                conflicts: [], // TODO: Implement conflict detection
                            };

                            return (
                                <div
                                    key={dayIndex}
                                    className={cn(
                                        'border-r border-color-border last:border-r-0 relative transition-colors hover:bg-color-background-muted/30 cursor-pointer',
                                        getDensityStyle(density),
                                        {
                                            'bg-color-background-muted/50': !day.isCurrentMonth,
                                            'bg-lumina-radiant/10 border-lumina-coral': day.isToday,
                                        }
                                    )}
                                    onClick={() => onTimeSlotClick(daySlot)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const appointmentId = e.dataTransfer.getData('text/plain');
                                        if (appointmentId && onAppointmentDrop) {
                                            onAppointmentDrop(appointmentId, daySlot);
                                        }
                                    }}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                    }}
                                >
                                    {/* Day Number */}
                                    <div className="absolute top-1 sm:top-2 left-1 sm:left-2 z-10">
                                        <div
                                            className={cn(
                                                'text-xs sm:text-sm font-medium',
                                                {
                                                    'text-color-foreground-muted': !day.isCurrentMonth,
                                                    'text-color-secondary': day.isCurrentMonth && !day.isToday,
                                                    'text-lumina-coral font-semibold': day.isToday,
                                                }
                                            )}
                                        >
                                            {day.date.getDate()}
                                        </div>
                                    </div>

                                    {/* Appointment Count Indicator */}
                                    {day.appointmentCount > 0 && (
                                        <div className="absolute top-1 sm:top-2 right-1 sm:right-2 z-10">
                                            <div className="bg-lumina-coral text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-medium">
                                                {day.appointmentCount > 9 ? '9+' : day.appointmentCount}
                                            </div>
                                        </div>
                                    )}

                                    {/* Staff Color Indicators */}
                                    {staffColors.length > 0 && (
                                        <div className="absolute bottom-1 left-1 flex space-x-0.5">
                                            {staffColors.slice(0, 4).map(([color, count], index) => (
                                                <div
                                                    key={color}
                                                    className="h-2 w-2 rounded-full border border-white shadow-sm"
                                                    style={{ backgroundColor: color }}
                                                    title={`${count} appointment${count > 1 ? 's' : ''}`}
                                                />
                                            ))}
                                            {staffColors.length > 4 && (
                                                <div className="h-2 w-2 rounded-full bg-gray-400 border border-white shadow-sm" />
                                            )}
                                        </div>
                                    )}

                                    {/* Business Closed Indicator */}
                                    {!day.isBusinessOpen && day.isCurrentMonth && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-xs text-color-foreground-muted opacity-50">
                                                Closed
                                            </div>
                                        </div>
                                    )}

                                    {/* Appointment Preview (desktop only) */}
                                    {day.appointments.length > 0 && (
                                        <div className="hidden sm:block absolute bottom-6 left-1 right-1 space-y-0.5">
                                            {day.appointments.slice(0, 2).map((appointment) => (
                                                <div
                                                    key={appointment.id}
                                                    className="text-xs p-1 rounded truncate transition-colors hover:bg-opacity-80"
                                                    style={{
                                                        backgroundColor: `${appointment.staff.color}20`,
                                                        borderLeft: `2px solid ${appointment.staff.color}`,
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onAppointmentClick(appointment);
                                                    }}
                                                >
                                                    <div className="truncate">
                                                        {appointment.startTime.toLocaleTimeString('en-US', {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                            hour12: true,
                                                        })} {appointment.client.firstName}
                                                    </div>
                                                </div>
                                            ))}
                                            {day.appointments.length > 2 && (
                                                <div className="text-xs text-color-foreground-muted text-center bg-color-background-muted/80 rounded px-1">
                                                    +{day.appointments.length - 2} more
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Density Visualization Bar */}
                                    {day.appointmentCount > 0 && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1">
                                            <div
                                                className={cn(
                                                    "h-full transition-all",
                                                    {
                                                        'bg-green-400': density === 'low',
                                                        'bg-yellow-400': density === 'medium',
                                                        'bg-orange-400': density === 'high',
                                                        'bg-red-400': density === 'very-high',
                                                    }
                                                )}
                                                style={{
                                                    width: `${Math.min((day.appointmentCount / 8) * 100, 100)}%`
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Today Indicator */}
                                    {day.isToday && (
                                        <div className="absolute -top-0.5 -left-0.5 -right-0.5 -bottom-0.5 border-2 border-lumina-coral rounded pointer-events-none" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Legend for Density Visualization */}
            <div className="border-t border-color-border bg-color-background-muted p-2 sm:p-3">
                <div className="flex items-center justify-center space-x-4 text-xs text-color-foreground-muted">
                    <div className="flex items-center space-x-1">
                        <div className="h-2 w-4 bg-green-400 rounded" />
                        <span>Light</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="h-2 w-4 bg-yellow-400 rounded" />
                        <span>Moderate</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="h-2 w-4 bg-orange-400 rounded" />
                        <span>Busy</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="h-2 w-4 bg-red-400 rounded" />
                        <span>Very Busy</span>
                    </div>
                </div>
            </div>
        </div>
    );
}