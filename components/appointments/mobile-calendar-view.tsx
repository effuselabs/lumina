'use client';

import { useMobileDetection } from '@/hooks/use-mobile-detection';
import { useTouchGestures } from '@/hooks/use-touch-gestures';
import { CalendarViewProps } from '@/types/dashboard-appointments';
import { useRef } from 'react';
import { DayView } from './day-view';
import { DragDropManager } from './drag-drop-manager';
import { MonthView } from './month-view';
import { WeekView } from './week-view';

/**
 * Mobile-optimized Calendar View Component
 * 
 * Wraps the standard calendar views with mobile-specific optimizations:
 * - Touch gesture support for navigation
 * - Responsive layout adjustments
 * - Touch-friendly interaction areas
 * - Optimized rendering for mobile performance
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

interface MobileCalendarViewProps extends CalendarViewProps {
    onAppointmentMove?: (appointmentId: string, newSlot: any) => Promise<void>;
    onNavigate?: (direction: 'prev' | 'next') => void;
}

export function MobileCalendarView({
    view,
    currentDate,
    appointments,
    staffMembers,
    businessHours,
    onAppointmentClick,
    onAppointmentDrop,
    onTimeSlotClick,
    onAppointmentMove,
    onNavigate,
}: MobileCalendarViewProps) {
    const { isMobile, isTablet, isTouchDevice } = useMobileDetection();
    const calendarRef = useRef<HTMLDivElement>(null);

    // Touch gestures for calendar navigation
    const { attachToElement, gestureState } = useTouchGestures({
        onSwipeLeft: () => onNavigate?.('next'),
        onSwipeRight: () => onNavigate?.('prev'),
        threshold: 50,
        preventScroll: false,
    });

    // Attach gestures to calendar container
    const calendarRefCallback = (element: HTMLDivElement | null) => {
        if (element && isTouchDevice && onNavigate) {
            attachToElement(element);
        }
    };

    // Generate all possible slots for alternatives
    const generateAllSlots = () => {
        // This would typically come from a service or be calculated
        // For now, return empty array - will be implemented when integrating with real data
        return [];
    };

    const allSlots = generateAllSlots();

    // Default appointment move handler
    const handleAppointmentMove = async (appointmentId: string, newSlot: any) => {
        if (onAppointmentMove) {
            await onAppointmentMove(appointmentId, newSlot);
        } else {
            console.log('Moving appointment:', appointmentId, 'to slot:', newSlot);
            // Default implementation - would integrate with API
        }
    };

    // Enhanced appointment click handler for mobile
    const handleAppointmentClick = (appointment: any) => {
        // Add haptic feedback on mobile devices
        if (isMobile && 'vibrate' in navigator) {
            navigator.vibrate(50);
        }
        if (onAppointmentClick) {
            onAppointmentClick(appointment);
        }
    };

    // Enhanced time slot click handler for mobile
    const handleTimeSlotClick = (slot: any) => {
        // Add haptic feedback on mobile devices
        if (isMobile && 'vibrate' in navigator) {
            navigator.vibrate(30);
        }
        if (onTimeSlotClick) {
            onTimeSlotClick(slot);
        }
    };

    const renderView = () => {
        const commonProps = {
            currentDate,
            appointments,
            staffMembers,
            businessHours,
            onAppointmentClick: handleAppointmentClick,
            onAppointmentDrop,
            onTimeSlotClick: handleTimeSlotClick,
        };

        switch (view) {
            case 'day':
                return <MobileDayView {...commonProps} />;
            case 'week':
                return <MobileWeekView {...commonProps} />;
            case 'month':
                return <MobileMonthView {...commonProps} />;
            default:
                return <MobileWeekView {...commonProps} />;
        }
    };

    return (
        <div
            ref={calendarRefCallback}
            className="flex flex-col h-full bg-color-background relative"
        >
            {/* Gesture feedback indicator */}
            {gestureState.isSwiping && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {onNavigate ? 'Swipe to navigate' : 'Swiping...'}
                </div>
            )}

            <DragDropManager
                appointments={appointments}
                allSlots={allSlots}
                onAppointmentMove={handleAppointmentMove}
            >
                {renderView()}
            </DragDropManager>
        </div>
    );
}

/**
 * Mobile-optimized Day View
 */
function MobileDayView(props: Omit<CalendarViewProps, 'view'>) {
    const { isMobile } = useMobileDetection();

    if (isMobile) {
        // Use mobile-specific optimizations
        return (
            <div className="flex-1 overflow-hidden">
                <DayView {...props} />
            </div>
        );
    }

    return <DayView {...props} />;
}

/**
 * Mobile-optimized Week View
 */
function MobileWeekView(props: Omit<CalendarViewProps, 'view'>) {
    const { isMobile } = useMobileDetection();

    if (isMobile) {
        // Use mobile-specific optimizations
        return (
            <div className="flex-1 overflow-hidden">
                <WeekView {...props} />
            </div>
        );
    }

    return <WeekView {...props} />;
}

/**
 * Mobile-optimized Month View
 */
function MobileMonthView(props: Omit<CalendarViewProps, 'view'>) {
    const { isMobile } = useMobileDetection();

    if (isMobile) {
        // Use mobile-specific optimizations
        return (
            <div className="flex-1 overflow-hidden">
                <MonthView {...props} />
            </div>
        );
    }

    return <MonthView {...props} />;
}