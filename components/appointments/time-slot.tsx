'use client';

import { cn } from '@/lib/utils';
import { TimeSlotProps } from '@/types/dashboard-appointments';
import { AppointmentBlock } from './appointment-block';

/**
 * TimeSlot Component
 * 
 * Displays a time period in the calendar with appointments.
 * Handles click events and visual states for time slot selection.
 * 
 * Requirements: 1.1, 1.2
 */
export function TimeSlot({
    slot,
    view,
    isSelected = false,
    onClick,
    className,
}: TimeSlotProps) {
    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const getSlotHeight = (): string => {
        switch (view) {
            case 'day':
                return 'h-16'; // 64px for detailed day view
            case 'week':
                return 'h-12'; // 48px for week view
            case 'month':
                return 'h-8'; // 32px for compact month view
            default:
                return 'h-12';
        }
    };

    const handleClick = () => {
        onClick?.(slot);
    };

    const hasConflicts = slot.conflicts.length > 0;
    const hasAppointments = slot.appointments.length > 0;

    return (
        <div
            className={cn(
                'relative border-b border-color-border transition-colors',
                getSlotHeight(),
                {
                    'bg-color-background hover:bg-color-background-muted cursor-pointer': slot.isAvailable && !hasAppointments,
                    'bg-color-background-muted': !slot.isAvailable,
                    'bg-lumina-radiant/5 border-lumina-coral': isSelected,
                    'bg-red-50 border-red-200': hasConflicts,
                },
                className
            )}
            onClick={handleClick}
        >
            {/* Time Label (only for day view) */}
            {view === 'day' && (
                <div className="absolute left-2 top-1 text-xs text-color-foreground-muted">
                    {formatTime(slot.startTime)}
                </div>
            )}

            {/* Appointments */}
            <div className="absolute inset-0 p-1">
                <div className="flex flex-col space-y-1 h-full overflow-hidden">
                    {slot.appointments.map((appointment, index) => (
                        <AppointmentBlock
                            key={appointment.id}
                            appointment={appointment}
                            view={view}
                            onClick={(apt) => {
                                // Prevent slot click when clicking appointment
                                // This will be handled by the parent component
                            }}
                            className={cn(
                                "flex-shrink-0",
                                {
                                    'z-10': index === 0,
                                    'opacity-90 transform scale-95 -mt-1': index > 0, // Stack overlapping appointments
                                }
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* Conflict Indicator */}
            {hasConflicts && (
                <div className="absolute top-1 right-1">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                </div>
            )}

            {/* Availability Indicator */}
            {!slot.isAvailable && !hasAppointments && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-xs text-color-foreground-muted">Unavailable</div>
                </div>
            )}
        </div>
    );
}