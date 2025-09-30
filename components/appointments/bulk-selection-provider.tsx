'use client';

import { DashboardAppointment } from '@/types/appointment-types';
import React, { createContext, useCallback, useContext, useState } from 'react';

interface BulkSelectionContextType {
    selectedAppointments: Set<string>;
    isSelectionMode: boolean;
    selectAppointment: (appointmentId: string) => void;
    deselectAppointment: (appointmentId: string) => void;
    toggleAppointment: (appointmentId: string) => void;
    selectAll: (appointments: DashboardAppointment[]) => void;
    clearSelection: () => void;
    enterSelectionMode: () => void;
    exitSelectionMode: () => void;
    getSelectedAppointments: (appointments: DashboardAppointment[]) => DashboardAppointment[];
}

const BulkSelectionContext = createContext<BulkSelectionContextType | undefined>(undefined);

export function useBulkSelection() {
    const context = useContext(BulkSelectionContext);
    if (!context) {
        throw new Error('useBulkSelection must be used within a BulkSelectionProvider');
    }
    return context;
}

interface BulkSelectionProviderProps {
    children: React.ReactNode;
}

export function BulkSelectionProvider({ children }: BulkSelectionProviderProps) {
    const [selectedAppointments, setSelectedAppointments] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const selectAppointment = useCallback((appointmentId: string) => {
        setSelectedAppointments(prev => new Set(prev).add(appointmentId));
    }, []);

    const deselectAppointment = useCallback((appointmentId: string) => {
        setSelectedAppointments(prev => {
            const newSet = new Set(prev);
            newSet.delete(appointmentId);
            return newSet;
        });
    }, []);

    const toggleAppointment = useCallback((appointmentId: string) => {
        setSelectedAppointments(prev => {
            const newSet = new Set(prev);
            if (newSet.has(appointmentId)) {
                newSet.delete(appointmentId);
            } else {
                newSet.add(appointmentId);
            }
            return newSet;
        });
    }, []);

    const selectAll = useCallback((appointments: DashboardAppointment[]) => {
        const allIds = appointments.map(apt => apt.id);
        setSelectedAppointments(new Set(allIds));
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedAppointments(new Set());
    }, []);

    const enterSelectionMode = useCallback(() => {
        setIsSelectionMode(true);
    }, []);

    const exitSelectionMode = useCallback(() => {
        setIsSelectionMode(false);
        clearSelection();
    }, [clearSelection]);

    const getSelectedAppointments = useCallback((appointments: DashboardAppointment[]) => {
        return appointments.filter(apt => selectedAppointments.has(apt.id));
    }, [selectedAppointments]);

    const value: BulkSelectionContextType = {
        selectedAppointments,
        isSelectionMode,
        selectAppointment,
        deselectAppointment,
        toggleAppointment,
        selectAll,
        clearSelection,
        enterSelectionMode,
        exitSelectionMode,
        getSelectedAppointments,
    };

    return (
        <BulkSelectionContext.Provider value={value}>
            {children}
        </BulkSelectionContext.Provider>
    );
}