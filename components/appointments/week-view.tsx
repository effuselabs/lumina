'use client';

import { BusinessHoursEntry, CalendarSlot, CalendarViewProps, DashboardAppointment } from '@/types/dashboard-appointments';
import { cn } from '../../lib/utils';
import { AppointmentBlock } from './appointment-block';
import { useDragDropState } from './drag-drop-context';

/**
 * WeekView Component
 * 
 * Displays appointments in a 7-day grid layout with enhanced features:
 * - Responsive design for mobile and desktop
 * - Appointment density visualization
 * - Staff filtering and color coding
 * - Touch-friendly interactions
 * 
 * Requirements: 1.3, 6.3, 6.4
 */
export function WeekView({
    currentDate,
    appointments,
    staffMembers,
    businessHours,
    onAppointmentClick,
    onAppointmentDrop,
    onTimeSlotClick,
}: Omit<CalendarViewProps, 'view'>) {
    const dragState = useDragDropState();
    // Generate week dates starting from Sunday
    const generateWeekDates = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

        const weekDates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            weekDates.push(date);
        }

        return weekDates;
    };

    // Generate time slots for a specific day
    const generateDaySlots = (date: Date) => {
        const dayOfWeek = date.getDay();
        const dayHours = businessHours.find((h: { dayOfWeek: number }) => h.dayOfWeek === dayOfWeek);

        if (!dayHours || dayHours.isClosed || !dayHours.openTime || !dayHours.closeTime) {
            return [];
        }

        const slots = [];
        const [openHour, openMinute] = dayHours.openTime.split(':').map(Number);
        const [closeHour, closeMinute] = dayHours.closeTime.split(':').map(Number);

        const startTime = new Date(date);
        startTime.setHours(openHour, openMinute, 0, 0);

        const endTime = new Date(date);
        endTime.setHours(closeHour, closeMinute, 0, 0);

        const current = new Date(startTime);

        while (current < endTime) {
            const slotEnd = new Date(current);
            slotEnd.setMinutes(current.getMinutes() + 60); // 1-hour slots for week view

            // Find appointments for this time slot
            const slotAppointments = appointments.filter(apt => {
                return apt.startTime >= current && apt.startTime < slotEnd &&
                    apt.startTime.toDateString() === date.toDateString();
            });

            slots.push({
                id: `slot-${date.toISOString()}-${current.getTime()}`,
                startTime: new Date(current),
                endTime: new Date(slotEnd),
                staffId: '', // Multi-staff view
                isAvailable: true, // TODO: Check actual availability
                appointments: slotAppointments,
                conflicts: [], // TODO: Implement conflict detection
            });

            current.setMinutes(current.getMinutes() + 60);
        }

        return slots;
    };

    const weekDates = generateWeekDates();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Get the earliest and latest business hours to determine time range
    const getTimeRange = () => {
        let earliestHour = 24;
        let latestHour = 0;

        businessHours.forEach((hours: BusinessHoursEntry) => {
            if (!hours.isClosed && hours.openTime && hours.closeTime) {
                const openHour = parseInt(hours.openTime.split(':')[0]);
                const closeHour = parseInt(hours.closeTime.split(':')[0]);
                earliestHour = Math.min(earliestHour, openHour);
                latestHour = Math.max(latestHour, closeHour);
            }
        });

        return { earliestHour, latestHour };
    };

    // Calculate appointment density for each day
    const calculateDayDensity = (date: Date) => {
        const dayAppointments = appointments.filter(apt =>
            apt.startTime.toDateString() === date.toDateString()
        );

        if (dayAppointments.length === 0) return 'low';
        if (dayAppointments.length <= 3) return 'medium';
        if (dayAppointments.length <= 6) return 'high';
        return 'very-high';
    };

    // Get density color
    const getDensityColor = (density: string) => {
        switch (density) {
            case 'low': return 'bg-green-100';
            case 'medium': return 'bg-yellow-100';
            case 'high': return 'bg-orange-100';
            case 'very-high': return 'bg-red-100';
            default: return 'bg-gray-50';
        }
    };

    // Get appointments for a specific day and hour
    const getDayHourAppointments = (date: Date, hour: number): DashboardAppointment[] => {
        return appointments.filter(apt => {
            const aptDate = apt.startTime.toDateString() === date.toDateString();
            const aptHour = apt.startTime.getHours() === hour;
            return aptDate && aptHour;
        });
    };

    const { earliestHour, latestHour } = getTimeRange();
    const timeSlots = [];

    for (let hour = earliestHour; hour < latestHour; hour++) {
        timeSlots.push(hour);
    }

    return (
        <div className="flex flex-col h-full bg-color-background">
            {/* Week Header */}
            <div className="flex border-b-2 border-color-border bg-color-background-muted sticky top-0 z-10">
                <div className="w-16 sm:w-20 flex-shrink-0 p-2 sm:p-3 text-xs sm:text-sm font-medium text-color-foreground-muted">
                    Time
                </div>
                {weekDates.map((date, index) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    const dayAppointments = appointments.filter(apt =>
                        apt.startTime.toDateString() === date.toDateString()
                    );
                    const density = calculateDayDensity(date);

                    return (
                        <div
                            key={index}
                            className={cn(
                                "flex-1 p-2 sm:p-3 text-center border-l border-color-border min-w-0",
                                getDensityColor(density)
                            )}
                        >
                            <div className={cn(
                                "text-xs sm:text-sm font-medium truncate",
                                isToday ? 'text-lumina-coral' : 'text-color-secondary'
                            )}>
                                <span className="hidden sm:inline">{dayNames[index]}</span>
                                <span className="sm:hidden">{dayNames[index].slice(0, 1)}</span>
                            </div>
                            <div className={cn(
                                "text-sm sm:text-lg font-semibold",
                                isToday ? 'text-lumina-coral' : 'text-color-secondary'
                            )}>
                                {date.getDate()}
                            </div>
                            {/* Appointment count indicator */}
                            {dayAppointments.length > 0 && (
                                <div className="mt-1">
                                    <div className="inline-flex items-center justify-center h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-lumina-coral text-white text-xs font-medium">
                                        {dayAppointments.length > 9 ? '9+' : dayAppointments.length}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Week Grid */}
            <div className="flex-1 overflow-y-auto">
                {timeSlots.map((hour) => (
                    <div key={hour} className="flex border-b border-color-border min-h-[2.5rem] sm:min-h-[3rem]">
                        {/* Time Label */}
                        <div className="w-16 sm:w-20 flex-shrink-0 p-1 sm:p-2 text-xs text-color-foreground-muted border-r border-color-border">
                            <div className="text-right">
                                {new Date(0, 0, 0, hour).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    hour12: true,
                                })}
                            </div>
                        </div>

                        {/* Day Columns */}
                        {weekDates.map((date, dayIndex) => {
                            const daySlots = generateDaySlots(date);
                            const hourSlot = daySlots.find(slot =>
                                slot.startTime.getHours() === hour
                            );

                            const hourAppointments = getDayHourAppointments(date, hour);
                            const hasAppointments = hourAppointments.length > 0;

                            if (!hourSlot) {
                                // Business closed or no slot for this hour
                                return (
                                    <div
                                        key={dayIndex}
                                        className="flex-1 border-l border-color-border bg-color-background-muted/50 relative"
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-xs text-color-foreground-muted opacity-50">
                                                Closed
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // Enhanced slot with appointments
                            const enhancedSlot: CalendarSlot = {
                                ...hourSlot,
                                appointments: hourAppointments,
                            };

                            return (
                                <div
                                    key={dayIndex}
                                    className={cn(
                                        "flex-1 border-l border-color-border relative transition-colors",
                                        {
                                            'hover:bg-color-background-muted cursor-pointer': !hasAppointments,
                                            'bg-lumina-radiant/5': hasAppointments,
                                        }
                                    )}
                                    onClick={() => onTimeSlotClick?.(enhancedSlot.startTime, enhancedSlot.staffId)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const appointmentId = e.dataTransfer.getData('text/plain');
                                        if (appointmentId && onAppointmentDrop) {
                                            onAppointmentDrop(appointmentId, enhancedSlot);
                                        }
                                    }}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                    }}
                                >
                                    {/* Appointments */}
                                    <div className="absolute inset-0 p-0.5 sm:p-1">
                                        <div className="flex flex-col space-y-0.5 h-full overflow-hidden">
                                            {hourAppointments.slice(0, 2).map((appointment, aptIndex) => (
                                                <AppointmentBlock
                                                    key={appointment.id}
                                                    appointment={appointment}
                                                    view="week"
                                                    onClick={onAppointmentClick}
                                                    onDragStart={(apt) => {
                                                        // Handle drag start
                                                    }}
                                                    className={cn(
                                                        "flex-shrink-0 text-xs",
                                                        {
                                                            'opacity-90 scale-95': aptIndex > 0,
                                                        }
                                                    )}
                                                />
                                            ))}
                                            {/* Show overflow indicator */}
                                            {hourAppointments.length > 2 && (
                                                <div className="text-xs text-color-foreground-muted text-center bg-color-background-muted rounded px-1">
                                                    +{hourAppointments.length - 2}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Current Time Indicator for Today */}
            {(() => {
                const now = new Date();
                const todayIndex = weekDates.findIndex(date =>
                    date.toDateString() === now.toDateString()
                );

                if (todayIndex === -1) return null;

                const dayOfWeek = now.getDay();
                const todayHours = businessHours.find((h: { dayOfWeek: number }) => h.dayOfWeek === dayOfWeek);

                if (!todayHours || todayHours.isClosed) return null;

                const [openHour, openMinute] = todayHours.openTime!.split(':').map(Number);
                const [closeHour, closeMinute] = todayHours.closeTime!.split(':').map(Number);

                const openTime = new Date(now);
                openTime.setHours(openHour, openMinute, 0, 0);

                const closeTime = new Date(now);
                closeTime.setHours(closeHour, closeMinute, 0, 0);

                if (now < openTime || now > closeTime) return null;

                // Calculate position
                const totalMinutes = (closeHour * 60 + closeMinute) - (openHour * 60 + openMinute);
                const currentMinutes = (now.getHours() * 60 + now.getMinutes()) - (openHour * 60 + openMinute);
                const percentage = (currentMinutes / totalMinutes) * 100;

                const leftOffset = 16 + (todayIndex * (100 / 7)); // Account for time column and day position

                return (
                    <div
                        className="absolute z-20 pointer-events-none"
                        style={{
                            top: `${percentage}%`,
                            left: `${leftOffset}%`,
                            width: `${100 / 7}%`
                        }}
                    >
                        <div className="h-0.5 bg-lumina-coral shadow-sm rounded-full" />
                        <div className="absolute -top-2 -left-2">
                            <div className="h-4 w-4 rounded-full bg-lumina-coral border-2 border-white shadow-sm" />
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}