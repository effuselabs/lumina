'use client';

/**
 * Virtual Scrolling Component for Large Appointment Datasets
 * Optimizes rendering performance by only rendering visible items
 */

import { DashboardAppointment } from '@/types/dashboard-appointments';
import { useCallback, useMemo, useRef, useState } from 'react';

interface VirtualAppointmentListProps {
    appointments: DashboardAppointment[];
    itemHeight: number;
    containerHeight: number;
    renderItem: (appointment: DashboardAppointment, index: number) => React.ReactNode;
    overscan?: number;
    onScroll?: (scrollTop: number) => void;
    className?: string;
}

interface VirtualItem {
    index: number;
    appointment: DashboardAppointment;
    top: number;
    height: number;
}

export function VirtualAppointmentList({
    appointments,
    itemHeight,
    containerHeight,
    renderItem,
    overscan = 5,
    onScroll,
    className = ''
}: VirtualAppointmentListProps) {
    const [scrollTop, setScrollTop] = useState(0);
    const scrollElementRef = useRef<HTMLDivElement>(null);

    // Calculate total height of all items
    const totalHeight = appointments.length * itemHeight;

    // Calculate visible range with overscan
    const visibleRange = useMemo(() => {
        const start = Math.floor(scrollTop / itemHeight);
        const end = Math.min(
            start + Math.ceil(containerHeight / itemHeight),
            appointments.length - 1
        );

        return {
            start: Math.max(0, start - overscan),
            end: Math.min(appointments.length - 1, end + overscan)
        };
    }, [scrollTop, itemHeight, containerHeight, appointments.length, overscan]);

    // Generate virtual items for visible range
    const virtualItems = useMemo((): VirtualItem[] => {
        const items: VirtualItem[] = [];

        for (let i = visibleRange.start; i <= visibleRange.end; i++) {
            items.push({
                index: i,
                appointment: appointments[i],
                top: i * itemHeight,
                height: itemHeight
            });
        }

        return items;
    }, [visibleRange, appointments, itemHeight]);

    // Handle scroll events
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const newScrollTop = e.currentTarget.scrollTop;
        setScrollTop(newScrollTop);
        onScroll?.(newScrollTop);
    }, [onScroll]);

    // Scroll to specific appointment
    const scrollToAppointment = useCallback((appointmentId: string) => {
        const index = appointments.findIndex(apt => apt.id === appointmentId);
        if (index !== -1 && scrollElementRef.current) {
            const targetScrollTop = index * itemHeight;
            scrollElementRef.current.scrollTop = targetScrollTop;
            setScrollTop(targetScrollTop);
        }
    }, [appointments, itemHeight]);

    // Scroll to index
    const scrollToIndex = useCallback((index: number) => {
        if (scrollElementRef.current && index >= 0 && index < appointments.length) {
            const targetScrollTop = index * itemHeight;
            scrollElementRef.current.scrollTop = targetScrollTop;
            setScrollTop(targetScrollTop);
        }
    }, [appointments.length, itemHeight]);

    return (
        <div
            ref={scrollElementRef}
            className={`overflow-auto ${className}`}
            style={{ height: containerHeight }}
            onScroll={handleScroll}
        >
            {/* Total height container */}
            <div style={{ height: totalHeight, position: 'relative' }}>
                {/* Rendered virtual items */}
                {virtualItems.map((virtualItem) => (
                    <div
                        key={virtualItem.appointment.id}
                        style={{
                            position: 'absolute',
                            top: virtualItem.top,
                            height: virtualItem.height,
                            width: '100%'
                        }}
                    >
                        {renderItem(virtualItem.appointment, virtualItem.index)}
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Hook for managing virtual scrolling state
 */
export function useVirtualScrolling(
    itemCount: number,
    itemHeight: number,
    containerHeight: number
) {
    const [scrollTop, setScrollTop] = useState(0);

    const visibleRange = useMemo(() => {
        const start = Math.floor(scrollTop / itemHeight);
        const end = Math.min(
            start + Math.ceil(containerHeight / itemHeight),
            itemCount - 1
        );

        return { start, end };
    }, [scrollTop, itemHeight, containerHeight, itemCount]);

    const totalHeight = itemCount * itemHeight;

    return {
        scrollTop,
        setScrollTop,
        visibleRange,
        totalHeight,
        isItemVisible: (index: number) =>
            index >= visibleRange.start && index <= visibleRange.end
    };
}

/**
 * Virtual Grid Component for Calendar Views
 */
interface VirtualCalendarGridProps {
    days: Date[];
    appointments: DashboardAppointment[];
    cellHeight: number;
    cellWidth: number;
    containerHeight: number;
    containerWidth: number;
    renderCell: (day: Date, appointments: DashboardAppointment[]) => React.ReactNode;
    getAppointmentsForDay: (day: Date) => DashboardAppointment[];
}

export function VirtualCalendarGrid({
    days,
    appointments,
    cellHeight,
    cellWidth,
    containerHeight,
    containerWidth,
    renderCell,
    getAppointmentsForDay
}: VirtualCalendarGridProps) {
    const [scrollTop, setScrollTop] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const cols = Math.floor(containerWidth / cellWidth);
    const rows = Math.ceil(days.length / cols);

    const visibleRowRange = useMemo(() => {
        const start = Math.floor(scrollTop / cellHeight);
        const end = Math.min(
            start + Math.ceil(containerHeight / cellHeight),
            rows - 1
        );

        return { start: Math.max(0, start), end };
    }, [scrollTop, cellHeight, containerHeight, rows]);

    const visibleCells = useMemo(() => {
        const cells: Array<{ day: Date; row: number; col: number; top: number; left: number }> = [];

        for (let row = visibleRowRange.start; row <= visibleRowRange.end; row++) {
            for (let col = 0; col < cols; col++) {
                const dayIndex = row * cols + col;
                if (dayIndex < days.length) {
                    cells.push({
                        day: days[dayIndex],
                        row,
                        col,
                        top: row * cellHeight,
                        left: col * cellWidth
                    });
                }
            }
        }

        return cells;
    }, [visibleRowRange, cols, days, cellHeight, cellWidth]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
        setScrollLeft(e.currentTarget.scrollLeft);
    }, []);

    return (
        <div
            className="overflow-auto"
            style={{ height: containerHeight, width: containerWidth }}
            onScroll={handleScroll}
        >
            <div
                style={{
                    height: rows * cellHeight,
                    width: cols * cellWidth,
                    position: 'relative'
                }}
            >
                {visibleCells.map(({ day, top, left }) => (
                    <div
                        key={day.toISOString()}
                        style={{
                            position: 'absolute',
                            top,
                            left,
                            width: cellWidth,
                            height: cellHeight
                        }}
                    >
                        {renderCell(day, getAppointmentsForDay(day))}
                    </div>
                ))}
            </div>
        </div>
    );
}