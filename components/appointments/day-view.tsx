'use client';

import { cn } from '@/lib/utils';
import { CalendarSlot, CalendarViewProps, DashboardAppointment } from '@/types/dashboard-appointments';
import { AppointmentBlock } from './appointment-block';
import { useDragDropState } from './drag-drop-context';
import { DropZone } from './drop-zone';

/**
 * DayView Component
 * 
 * Displays appointments in a single day format with hourly time slots.
 * Features:
 * - Hourly time slots with 30-minute intervals
 * - Multi-staff column layout
 * - Business hours highlighting
 * - Appointment overflow and stacking handling
 * - Drag-and-drop support for rescheduling
 * 
 * Requirements: 1.2, 1.7, 2.1, 2.7, 2.2, 2.3
 */
export function DayView({
    currentDate,
    appointments,
    staffMembers,
    businessHours,
    onAppointmentClick,
    onAppointmentDrop,
    onTimeSlotClick,
}: Omit<CalendarViewProps, 'view'>) {
    const activeStaff = staffMembers.filter(s => s.isActive);
    const dragState = useDragDropState();

    // Generate hourly time slots for the day
    const generateTimeSlots = () => {
        const dayOfWeek = currentDate.getDay();
        const todayHours = businessHours.find(h => h.dayOfWeek === dayOfWeek);

        if (!todayHours || todayHours.isClosed || !todayHours.openTime || !todayHours.closeTime) {
            return [];
        }

        const slots = [];
        const [openHour, openMinute] = todayHours.openTime.split(':').map(Number);
        const [closeHour, closeMinute] = todayHours.closeTime.split(':').map(Number);

        // Start from business open time
        const startTime = new Date(currentDate);
        startTime.setHours(openHour, openMinute, 0, 0);

        const endTime = new Date(currentDate);
        endTime.setHours(closeHour, closeMinute, 0, 0);

        const current = new Date(startTime);

        // Generate 30-minute time slots
        while (current < endTime) {
            const slotEnd = new Date(current);
            slotEnd.setMinutes(current.getMinutes() + 30);

            slots.push({
                startTime: new Date(current),
                endTime: new Date(slotEnd),
                staffId: '', // Will be set per staff column
                isAvailable: true,
                appointments: [],
                conflicts: [],
            });

            current.setMinutes(current.getMinutes() + 30);
        }

        return slots;
    };

    const baseTimeSlots = generateTimeSlots();

    // Get appointments for each staff member and time slot
    const getStaffAppointmentsForSlot = (slot: CalendarSlot, staffId: string): DashboardAppointment[] => {
        return appointments.filter(apt => {
            if (apt.staffId !== staffId) return false;

            // Check if appointment overlaps with this time slot
            const aptStart = apt.startTime;
            const aptEnd = apt.endTime;
            const slotStart = slot.startTime;
            const slotEnd = slot.endTime;

            return (aptStart < slotEnd && aptEnd > slotStart);
        });
    };

    // Detect conflicts for overlapping appointments
    const detectConflicts = (appointments: DashboardAppointment[]) => {
        const conflicts = [];

        for (let i = 0; i < appointments.length; i++) {
            for (let j = i + 1; j < appointments.length; j++) {
                const apt1 = appointments[i];
                const apt2 = appointments[j];

                // Check for time overlap
                if (apt1.startTime < apt2.endTime && apt1.endTime > apt2.startTime) {
                    conflicts.push({
                        type: 'overlap' as const,
                        severity: 'error' as const,
                        message: 'Overlapping appointments detected',
                        affectedAppointments: [apt1.id, apt2.id],
                    });
                }
            }
        }

        return conflicts;
    };

    // Format time for display
    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    // Check if time slot is within business hours
    const isWithinBusinessHours = (slot: CalendarSlot): boolean => {
        const dayOfWeek = currentDate.getDay();
        const todayHours = businessHours.find(h => h.dayOfWeek === dayOfWeek);

        if (!todayHours || todayHours.isClosed) return false;

        const [openHour, openMinute] = todayHours.openTime!.split(':').map(Number);
        const [closeHour, closeMinute] = todayHours.closeTime!.split(':').map(Number);

        const openTime = new Date(currentDate);
        openTime.setHours(openHour, openMinute, 0, 0);

        const closeTime = new Date(currentDate);
        closeTime.setHours(closeHour, closeMinute, 0, 0);

        return slot.startTime >= openTime && slot.endTime <= closeTime;
    };

    // Handle time slot click
    const handleTimeSlotClick = (slot: CalendarSlot, staffId: string) => {
        const staffSlot = {
            ...slot,
            staffId,
        };
        onTimeSlotClick(staffSlot);
    };

    // Handle appointment drag and drop
    const handleAppointmentDrop = (appointmentId: string, newSlot: CalendarSlot) => {
        if (onAppointmentDrop) {
            onAppointmentDrop(appointmentId, newSlot);
        }
    };

    // Check if a slot should show drop feedback
    const shouldShowDropFeedback = (slot: CalendarSlot, staffId: string) => {
        if (!dragState.isDragging || !dragState.draggedAppointment) return false;

        // Don't show feedback on the original slot
        if (dragState.draggedFrom &&
            dragState.draggedFrom.startTime.getTime() === slot.startTime.getTime() &&
            dragState.draggedFrom.staffId === staffId) {
            return false;
        }

        return true;
    };

    if (baseTimeSlots.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-color-foreground-muted">
                <div className="text-center">
                    <p className="text-lg font-medium mb-2">Business Closed</p>
                    <p className="text-sm">No business hours set for this day</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-color-background">
            {/* Staff Headers */}
            <div className="flex border-b-2 border-color-border bg-color-background-muted sticky top-0 z-10">
                <div className="w-16 sm:w-24 flex-shrink-0 p-2 sm:p-4 text-xs sm:text-sm font-semibold text-color-foreground-muted border-r border-color-border">
                    Time
                </div>
                {activeStaff.map((staff) => (
                    <div
                        key={staff.id}
                        className="flex-1 p-2 sm:p-4 text-xs sm:text-sm font-semibold text-center border-l border-color-border min-w-0"
                        style={{
                            borderLeftColor: staff.color,
                            borderLeftWidth: '3px'
                        }}
                    >
                        <div className="truncate" title={staff.displayName}>
                            <span className="hidden sm:inline">{staff.displayName}</span>
                            <span className="sm:hidden">{staff.displayName.split(' ')[0]}</span>
                        </div>
                        <div className="text-xs text-color-foreground-muted font-normal mt-1 hidden sm:block">
                            {staff.role}
                        </div>
                    </div>
                ))}
            </div>

            {/* Time Slots Grid */}
            <div className="flex-1 overflow-y-auto">
                {baseTimeSlots.map((slot, slotIndex) => {
                    const isBusinessHours = isWithinBusinessHours(slot);
                    const isHourMark = slot.startTime.getMinutes() === 0;

                    return (
                        <div
                            key={slotIndex}
                            className={cn(
                                "flex border-b border-color-border",
                                {
                                    'border-b-2': isHourMark,
                                    'bg-color-background-muted/30': !isBusinessHours,
                                }
                            )}
                        >
                            {/* Time Label */}
                            <div className={cn(
                                "w-16 sm:w-24 flex-shrink-0 p-1 sm:p-3 text-xs border-r border-color-border relative",
                                {
                                    'font-semibold text-color-foreground': isHourMark,
                                    'text-color-foreground-muted': !isHourMark,
                                    'bg-color-background-muted/50': !isBusinessHours,
                                }
                            )}>
                                <div className="text-right text-xs sm:text-sm">
                                    <span className="hidden sm:inline">{formatTime(slot.startTime)}</span>
                                    <span className="sm:hidden">{slot.startTime.getHours()}:{slot.startTime.getMinutes().toString().padStart(2, '0')}</span>
                                </div>
                                {!isBusinessHours && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-xs text-color-foreground-muted opacity-50">
                                            <span className="hidden sm:inline">Closed</span>
                                            <span className="sm:hidden">X</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Staff Columns */}
                            {activeStaff.map((staff) => {
                                const staffAppointments = getStaffAppointmentsForSlot(slot, staff.id);
                                const conflicts = detectConflicts(staffAppointments);
                                const hasConflicts = conflicts.length > 0;
                                const hasAppointments = staffAppointments.length > 0;

                                const staffSlot: CalendarSlot = {
                                    ...slot,
                                    staffId: staff.id,
                                    appointments: staffAppointments,
                                    conflicts,
                                    isAvailable: isBusinessHours && !hasConflicts,
                                };

                                return (
                                    <DropZone
                                        key={staff.id}
                                        slot={staffSlot}
                                        appointments={appointments}
                                        onDrop={handleAppointmentDrop}
                                        showFeedback={shouldShowDropFeedback(staffSlot, staff.id)}
                                        disabled={!isBusinessHours}
                                        className={cn(
                                            "flex-1 border-l border-color-border relative min-h-[2.5rem] sm:min-h-[3rem] transition-colors touch-manipulation",
                                            {
                                                'bg-color-background hover:bg-color-background-muted cursor-pointer':
                                                    isBusinessHours && !hasAppointments,
                                                'bg-color-background-muted/50': !isBusinessHours,
                                                'bg-red-50 border-red-200': hasConflicts,
                                            }
                                        )}
                                    >
                                        <div
                                            className="absolute inset-0"
                                            onClick={() => handleTimeSlotClick(staffSlot, staff.id)}
                                        >
                                            {/* Appointment Blocks */}
                                            <div className="absolute inset-0 p-1 pointer-events-none">
                                                <div className="flex flex-col space-y-1 h-full overflow-hidden">
                                                    {staffAppointments.map((appointment, aptIndex) => (
                                                        <div key={appointment.id} className="pointer-events-auto">
                                                            <AppointmentBlock
                                                                appointment={appointment}
                                                                view="day"
                                                                onClick={onAppointmentClick}
                                                                isDragging={dragState.draggedAppointment?.id === appointment.id}
                                                                className={cn(
                                                                    "flex-shrink-0",
                                                                    {
                                                                        'z-10': aptIndex === 0, // Bring first appointment to front
                                                                        'opacity-90 transform scale-95': aptIndex > 0, // Stack overlapping appointments
                                                                    }
                                                                )}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Conflict Indicator */}
                                            {hasConflicts && (
                                                <div className="absolute top-1 right-1 z-20">
                                                    <div
                                                        className="h-3 w-3 rounded-full bg-red-500 border-2 border-white shadow-sm"
                                                        title="Scheduling conflict detected"
                                                    />
                                                </div>
                                            )}

                                            {/* Availability Indicator */}
                                            {!isBusinessHours && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <div className="text-xs text-color-foreground-muted opacity-50">
                                                        Closed
                                                    </div>
                                                </div>
                                            )}

                                            {/* Hour Marker */}
                                            {isHourMark && (
                                                <div className="absolute left-0 top-0 w-full h-px bg-color-border opacity-50" />
                                            )}
                                        </div>
                                    </DropZone>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Current Time Indicator */}
            {(() => {
                const now = new Date();
                const isToday = now.toDateString() === currentDate.toDateString();

                if (!isToday) return null;

                const dayOfWeek = now.getDay();
                const todayHours = businessHours.find(h => h.dayOfWeek === dayOfWeek);

                if (!todayHours || todayHours.isClosed) return null;

                const [openHour, openMinute] = todayHours.openTime!.split(':').map(Number);
                const [closeHour, closeMinute] = todayHours.closeTime!.split(':').map(Number);

                const openTime = new Date(currentDate);
                openTime.setHours(openHour, openMinute, 0, 0);

                const closeTime = new Date(currentDate);
                closeTime.setHours(closeHour, closeMinute, 0, 0);

                if (now < openTime || now > closeTime) return null;

                // Calculate position based on time
                const totalMinutes = (closeHour * 60 + closeMinute) - (openHour * 60 + openMinute);
                const currentMinutes = (now.getHours() * 60 + now.getMinutes()) - (openHour * 60 + openMinute);
                const percentage = (currentMinutes / totalMinutes) * 100;

                return (
                    <div
                        className="absolute left-0 right-0 z-30 pointer-events-none"
                        style={{ top: `${percentage}%` }}
                    >
                        <div className="flex items-center">
                            <div className="w-24 flex-shrink-0 pr-2 text-right">
                                <div className="inline-block bg-lumina-coral text-white text-xs px-2 py-1 rounded-full font-medium">
                                    {formatTime(now)}
                                </div>
                            </div>
                            <div className="flex-1 h-0.5 bg-lumina-coral shadow-sm" />
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}