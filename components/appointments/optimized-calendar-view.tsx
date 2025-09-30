'use client';

/**
 * Optimized Calendar View with Memoization
 * Implements React.memo and useMemo for efficient rendering
 */

import { DashboardAppointment } from '@/types/dashboard-appointments';
import React, { memo, useCallback, useMemo } from 'react';
import { VirtualAppointmentList, VirtualCalendarGrid } from './virtual-appointment-list';

interface OptimizedCalendarViewProps {
    view: 'day' | 'week' | 'month';
    currentDate: Date;
    appointments: DashboardAppointment[];
    staffMembers: Array<{ id: string; name: string; color: string }>;
    onAppointmentClick: (appointment: DashboardAppointment) => void;
    onAppointmentDrop: (appointmentId: string, newSlot: TimeSlot) => void;
    onTimeSlotClick: (timeSlot: TimeSlot) => void;
    businessHours: { start: number; end: number };
    containerHeight: number;
    containerWidth: number;
}

interface TimeSlot {
    startTime: Date;
    endTime: Date;
    staffId: string;
}

// Memoized appointment block component
const AppointmentBlock = memo<{
    appointment: DashboardAppointment;
    onClick: (appointment: DashboardAppointment) => void;
    style?: React.CSSProperties;
}>(({ appointment, onClick, style }) => {
    const handleClick = useCallback(() => {
        onClick(appointment);
    }, [appointment, onClick]);

    const appointmentStyle = useMemo(() => ({
        ...style,
        backgroundColor: appointment.staff.color,
        borderRadius: '4px',
        padding: '4px 8px',
        margin: '1px 0',
        cursor: 'pointer',
        fontSize: '12px',
        color: 'white',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const
    }), [style, appointment.staff.color]);

    return (
        <div
            style={appointmentStyle}
            onClick={handleClick}
            title={`${appointment.client.firstName} ${appointment.client.lastName} - ${appointment.services.map(s => s.name).join(', ')}`}
        >
            <div className="font-medium">
                {appointment.client.firstName} {appointment.client.lastName}
            </div>
            <div className="text-xs opacity-90">
                {appointment.services.map(s => s.name).join(', ')}
            </div>
        </div>
    );
});

AppointmentBlock.displayName = 'AppointmentBlock';

// Memoized time slot component
const TimeSlotCell = memo<{
    timeSlot: TimeSlot;
    appointments: DashboardAppointment[];
    onAppointmentClick: (appointment: DashboardAppointment) => void;
    onTimeSlotClick: (timeSlot: TimeSlot) => void;
    height: number;
}>(({ timeSlot, appointments, onAppointmentClick, onTimeSlotClick, height }) => {
    const handleSlotClick = useCallback(() => {
        if (appointments.length === 0) {
            onTimeSlotClick(timeSlot);
        }
    }, [timeSlot, appointments.length, onTimeSlotClick]);

    const slotStyle = useMemo(() => ({
        height,
        border: '1px solid #e5e7eb',
        position: 'relative' as const,
        cursor: appointments.length === 0 ? 'pointer' : 'default',
        backgroundColor: appointments.length === 0 ? 'transparent' : '#f9fafb'
    }), [height, appointments.length]);

    return (
        <div style={slotStyle} onClick={handleSlotClick}>
            {appointments.map((appointment, index) => (
                <AppointmentBlock
                    key={appointment.id}
                    appointment={appointment}
                    onClick={onAppointmentClick}
                    style={{
                        position: 'absolute',
                        top: index * 20,
                        left: 2,
                        right: 2,
                        zIndex: 1
                    }}
                />
            ))}
        </div>
    );
});

TimeSlotCell.displayName = 'TimeSlotCell';

// Memoized day view component
const OptimizedDayView = memo<{
    date: Date;
    appointments: DashboardAppointment[];
    staffMembers: Array<{ id: string; name: string; color: string }>;
    onAppointmentClick: (appointment: DashboardAppointment) => void;
    onTimeSlotClick: (timeSlot: TimeSlot) => void;
    businessHours: { start: number; end: number };
    containerHeight: number;
}>(({ date, appointments, staffMembers, onAppointmentClick, onTimeSlotClick, businessHours, containerHeight }) => {
    // Generate time slots for the day
    const timeSlots = useMemo(() => {
        const slots: TimeSlot[] = [];
        const startHour = businessHours.start;
        const endHour = businessHours.end;

        staffMembers.forEach(staff => {
            for (let hour = startHour; hour < endHour; hour++) {
                for (let minute = 0; minute < 60; minute += 30) {
                    const startTime = new Date(date);
                    startTime.setHours(hour, minute, 0, 0);

                    const endTime = new Date(startTime);
                    endTime.setMinutes(endTime.getMinutes() + 30);

                    slots.push({
                        startTime,
                        endTime,
                        staffId: staff.id
                    });
                }
            }
        });

        return slots;
    }, [date, staffMembers, businessHours]);

    // Group appointments by time slot
    const appointmentsBySlot = useMemo(() => {
        const slotMap = new Map<string, DashboardAppointment[]>();

        timeSlots.forEach(slot => {
            const key = `${slot.staffId}-${slot.startTime.getTime()}`;
            const slotAppointments = appointments.filter(apt =>
                apt.staffId === slot.staffId &&
                apt.startTime <= slot.endTime &&
                apt.endTime > slot.startTime
            );
            slotMap.set(key, slotAppointments);
        });

        return slotMap;
    }, [timeSlots, appointments]);

    const renderTimeSlot = useCallback((slot: TimeSlot, index: number) => {
        const key = `${slot.staffId}-${slot.startTime.getTime()}`;
        const slotAppointments = appointmentsBySlot.get(key) || [];

        return (
            <TimeSlotCell
                key={key}
                timeSlot={slot}
                appointments={slotAppointments}
                onAppointmentClick={onAppointmentClick}
                onTimeSlotClick={onTimeSlotClick}
                height={60}
            />
        );
    }, [appointmentsBySlot, onAppointmentClick, onTimeSlotClick]);

    return (
        <VirtualAppointmentList
            appointments={timeSlots.map((slot, index) => ({ ...slot, id: `${slot.staffId}-${slot.startTime.getTime()}` } as any))}
            itemHeight={60}
            containerHeight={containerHeight}
            renderItem={(slot: any, index) => renderTimeSlot(slot, index)}
            className="day-view-container"
        />
    );
});

OptimizedDayView.displayName = 'OptimizedDayView';

// Memoized week view component
const OptimizedWeekView = memo<{
    startDate: Date;
    appointments: DashboardAppointment[];
    staffMembers: Array<{ id: string; name: string; color: string }>;
    onAppointmentClick: (appointment: DashboardAppointment) => void;
    onTimeSlotClick: (timeSlot: TimeSlot) => void;
    containerHeight: number;
    containerWidth: number;
}>(({ startDate, appointments, staffMembers, onAppointmentClick, onTimeSlotClick, containerHeight, containerWidth }) => {
    // Generate week days
    const weekDays = useMemo(() => {
        const days: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(startDate);
            day.setDate(day.getDate() + i);
            days.push(day);
        }
        return days;
    }, [startDate]);

    // Group appointments by day
    const appointmentsByDay = useMemo(() => {
        const dayMap = new Map<string, DashboardAppointment[]>();

        weekDays.forEach(day => {
            const dayKey = day.toDateString();
            const dayAppointments = appointments.filter(apt =>
                apt.startTime.toDateString() === dayKey
            );
            dayMap.set(dayKey, dayAppointments);
        });

        return dayMap;
    }, [weekDays, appointments]);

    const renderDayCell = useCallback((day: Date, dayAppointments: DashboardAppointment[]) => {
        return (
            <div className="week-day-cell border border-gray-200 p-2">
                <div className="font-medium text-sm mb-2">
                    {day.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                </div>
                <div className="space-y-1">
                    {dayAppointments.slice(0, 5).map(appointment => (
                        <AppointmentBlock
                            key={appointment.id}
                            appointment={appointment}
                            onClick={onAppointmentClick}
                        />
                    ))}
                    {dayAppointments.length > 5 && (
                        <div className="text-xs text-gray-500">
                            +{dayAppointments.length - 5} more
                        </div>
                    )}
                </div>
            </div>
        );
    }, [onAppointmentClick]);

    const getAppointmentsForDay = useCallback((day: Date) => {
        return appointmentsByDay.get(day.toDateString()) || [];
    }, [appointmentsByDay]);

    return (
        <VirtualCalendarGrid
            days={weekDays}
            appointments={appointments}
            cellHeight={200}
            cellWidth={containerWidth / 7}
            containerHeight={containerHeight}
            containerWidth={containerWidth}
            renderCell={renderDayCell}
            getAppointmentsForDay={getAppointmentsForDay}
        />
    );
});

OptimizedWeekView.displayName = 'OptimizedWeekView';

// Main optimized calendar view component
export const OptimizedCalendarView = memo<OptimizedCalendarViewProps>(({
    view,
    currentDate,
    appointments,
    staffMembers,
    onAppointmentClick,
    onAppointmentDrop,
    onTimeSlotClick,
    businessHours,
    containerHeight,
    containerWidth
}) => {
    // Memoize filtered appointments based on current view
    const filteredAppointments = useMemo(() => {
        const startOfView = new Date(currentDate);
        const endOfView = new Date(currentDate);

        switch (view) {
            case 'day':
                startOfView.setHours(0, 0, 0, 0);
                endOfView.setHours(23, 59, 59, 999);
                break;
            case 'week':
                const dayOfWeek = startOfView.getDay();
                startOfView.setDate(startOfView.getDate() - dayOfWeek);
                startOfView.setHours(0, 0, 0, 0);
                endOfView.setDate(startOfView.getDate() + 6);
                endOfView.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startOfView.setDate(1);
                startOfView.setHours(0, 0, 0, 0);
                endOfView.setMonth(endOfView.getMonth() + 1, 0);
                endOfView.setHours(23, 59, 59, 999);
                break;
        }

        return appointments.filter(apt =>
            apt.startTime >= startOfView && apt.startTime <= endOfView
        );
    }, [appointments, currentDate, view]);

    // Render appropriate view component
    const renderView = useMemo(() => {
        switch (view) {
            case 'day':
                return (
                    <OptimizedDayView
                        date={currentDate}
                        appointments={filteredAppointments}
                        staffMembers={staffMembers}
                        onAppointmentClick={onAppointmentClick}
                        onTimeSlotClick={onTimeSlotClick}
                        businessHours={businessHours}
                        containerHeight={containerHeight}
                    />
                );
            case 'week':
                const weekStart = new Date(currentDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                return (
                    <OptimizedWeekView
                        startDate={weekStart}
                        appointments={filteredAppointments}
                        staffMembers={staffMembers}
                        onAppointmentClick={onAppointmentClick}
                        onTimeSlotClick={onTimeSlotClick}
                        containerHeight={containerHeight}
                        containerWidth={containerWidth}
                    />
                );
            case 'month':
                // Month view implementation would go here
                return <div>Month view optimization coming soon</div>;
            default:
                return null;
        }
    }, [view, currentDate, filteredAppointments, staffMembers, onAppointmentClick, onTimeSlotClick, businessHours, containerHeight, containerWidth]);

    return (
        <div className="optimized-calendar-view">
            {renderView}
        </div>
    );
});

OptimizedCalendarView.displayName = 'OptimizedCalendarView';