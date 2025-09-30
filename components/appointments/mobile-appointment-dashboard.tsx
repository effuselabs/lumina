'use client';

import { useMobileDetection } from '@/hooks/use-mobile-detection';
import { useTouchGestures } from '@/hooks/use-touch-gestures';
import { cn } from '@/lib/utils';
import { CalendarView, DashboardAppointment } from '@/types/dashboard-appointments';
import { useCallback, useState } from 'react';
import { MobileAppointmentModal } from './mobile-appointment-modal';
import { MobileCalendarHeader } from './mobile-calendar-header';
import { MobileCalendarView } from './mobile-calendar-view';
import { MobileSearchFilters } from './mobile-search-filters';

export interface MobileAppointmentDashboardProps {
    businessId: string;
    staffId?: string;
    initialView?: CalendarView;
    initialDate?: Date;
    appointments: DashboardAppointment[];
    staffMembers: Array<{
        id: string;
        firstName: string;
        lastName: string;
        displayName: string;
        isActive: boolean;
        color: string;
        role: string;
    }>;
    services: Array<{
        id: string;
        name: string;
        duration: number;
        price: number;
        isActive: boolean;
        category: string;
    }>;
    businessHours: Array<{
        dayOfWeek: number;
        openTime: string | null;
        closeTime: string | null;
        isClosed: boolean;
    }>;
    onAppointmentSave: (appointment: Partial<DashboardAppointment>) => Promise<void>;
    onAppointmentDelete: (appointmentId: string) => Promise<void>;
    onFilterChange: (filters: any) => void;
}

/**
 * Mobile-optimized Appointment Dashboard
 * 
 * Complete mobile dashboard with touch-optimized interface:
 * - Responsive layout for mobile, tablet, and desktop
 * - Touch gestures for navigation
 * - Mobile-optimized modals and filters
 * - Swipe navigation between dates
 * - Touch-friendly appointment interaction
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export function MobileAppointmentDashboard({
    businessId,
    staffId,
    initialView = 'week',
    initialDate = new Date(),
    appointments,
    staffMembers,
    services,
    businessHours,
    onAppointmentSave,
    onAppointmentDelete,
    onFilterChange,
}: MobileAppointmentDashboardProps) {
    const { isMobile, isTablet, orientation } = useMobileDetection();
    const [currentView, setCurrentView] = useState<CalendarView>(initialView);
    const [currentDate, setCurrentDate] = useState<Date>(initialDate);
    const [selectedAppointment, setSelectedAppointment] = useState<DashboardAppointment | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');

    // Navigation handlers
    const handleNavigate = useCallback((direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);

        switch (currentView) {
            case 'day':
                newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
                break;
            case 'week':
                newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
                break;
            case 'month':
                newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
                break;
        }

        setCurrentDate(newDate);
    }, [currentDate, currentView]);

    const handleToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);

    const handleViewChange = useCallback((view: CalendarView) => {
        setCurrentView(view);
    }, []);

    // Appointment handlers
    const handleAppointmentClick = useCallback((appointment: DashboardAppointment) => {
        setSelectedAppointment(appointment);
        setModalMode('view');
        setIsModalOpen(true);
    }, []);

    const handleTimeSlotClick = useCallback((slot: any) => {
        // Create new appointment
        setSelectedAppointment(null);
        setModalMode('create');
        setIsModalOpen(true);
    }, []);

    const handleAppointmentDrop = useCallback((appointmentId: string, newSlot: any) => {
        console.log('Appointment dropped:', appointmentId, newSlot);
        // Handle appointment rescheduling
    }, []);

    const handleModalClose = useCallback(() => {
        setIsModalOpen(false);
        setSelectedAppointment(null);
    }, []);

    const handleAppointmentSave = useCallback(async (appointmentData: Partial<DashboardAppointment>) => {
        await onAppointmentSave(appointmentData);
        setIsModalOpen(false);
    }, [onAppointmentSave]);

    const handleAppointmentDelete = useCallback(async (appointmentId: string) => {
        await onAppointmentDelete(appointmentId);
        setIsModalOpen(false);
    }, [onAppointmentDelete]);

    // Layout classes based on device type
    const containerClasses = cn(
        'flex flex-col h-full bg-color-background',
        {
            'min-h-screen': isMobile,
            'h-screen': !isMobile,
        }
    );

    const contentClasses = cn(
        'flex-1 flex flex-col overflow-hidden',
        {
            'pb-safe-area-inset-bottom': isMobile, // Account for mobile safe areas
        }
    );

    return (
        <div className={containerClasses}>
            {/* Header */}
            <div className="flex-shrink-0">
                <MobileCalendarHeader
                    view={currentView}
                    currentDate={currentDate}
                    onViewChange={handleViewChange}
                    onDateChange={setCurrentDate}
                    onNavigate={handleNavigate}
                    onToday={handleToday}
                />
            </div>

            {/* Search and Filters */}
            <div className="flex-shrink-0 p-4 border-b border-color-border">
                <MobileSearchFilters
                    onFilterChange={onFilterChange}
                    staffMembers={staffMembers}
                    services={services}
                    className="w-full"
                />
            </div>

            {/* Calendar Content */}
            <div className={contentClasses}>
                <MobileCalendarView
                    view={currentView}
                    currentDate={currentDate}
                    appointments={appointments}
                    staffMembers={staffMembers}
                    businessHours={businessHours}
                    onAppointmentClick={handleAppointmentClick}
                    onAppointmentDrop={handleAppointmentDrop}
                    onTimeSlotClick={handleTimeSlotClick}
                    onNavigate={handleNavigate}
                />
            </div>

            {/* Appointment Modal */}
            <MobileAppointmentModal
                appointment={selectedAppointment}
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSave={handleAppointmentSave}
                onDelete={handleAppointmentDelete}
                mode={modalMode}
                staffMembers={staffMembers}
                services={services}
            />

            {/* Mobile-specific floating action button for creating appointments */}
            {isMobile && (
                <div className="fixed bottom-6 right-6 z-40">
                    <button
                        onClick={() => {
                            setSelectedAppointment(null);
                            setModalMode('create');
                            setIsModalOpen(true);
                        }}
                        className="h-14 w-14 rounded-full bg-lumina-radiant text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center touch-manipulation"
                        aria-label="Create new appointment"
                    >
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                    </button>
                </div>
            )}

            {/* Mobile-specific status bar for gesture hints */}
            {isMobile && (
                <div className="flex-shrink-0 bg-color-background-muted/50 px-4 py-2 text-center">
                    <p className="text-xs text-color-foreground-muted">
                        Swipe left/right to navigate • Tap appointments to view details
                    </p>
                </div>
            )}
        </div>
    );
}

/**
 * Hook for managing mobile dashboard state
 * Provides centralized state management for mobile-specific features
 */
export function useMobileAppointmentDashboard() {
    const { isMobile, isTablet, orientation } = useMobileDetection();
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Touch gestures for global dashboard actions
    const { gestureState } = useTouchGestures({
        onLongPress: () => {
            // Long press to toggle fullscreen on mobile
            if (isMobile && document.fullscreenEnabled) {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                    setIsFullscreen(true);
                } else {
                    document.exitFullscreen();
                    setIsFullscreen(false);
                }
            }
        },
        longPressDelay: 1000,
    });

    // Handle orientation changes
    const handleOrientationChange = useCallback(() => {
        // Force re-render on orientation change
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }, []);

    return {
        isMobile,
        isTablet,
        orientation,
        isFullscreen,
        gestureState,
        handleOrientationChange,
    };
}