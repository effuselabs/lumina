'use client';

import { DashboardAppointment } from '@/types/dashboard-appointments';
import { createContext, useContext } from 'react';

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
  getSelectedAppointments: (
    appointments: DashboardAppointment[]
  ) => DashboardAppointment[];
}

/**
 * Selection off. No screen offers bulk selection yet, so no provider is
 * rendered — and the hook threw without one, which crashed the calendar the
 * first time it showed a real appointment. Until a screen opts in by providing
 * a value, every block reads this.
 */
const SELECTION_OFF: BulkSelectionContextType = {
  selectedAppointments: new Set(),
  isSelectionMode: false,
  selectAppointment: () => {},
  deselectAppointment: () => {},
  toggleAppointment: () => {},
  selectAll: () => {},
  clearSelection: () => {},
  enterSelectionMode: () => {},
  exitSelectionMode: () => {},
  getSelectedAppointments: () => [],
};

const BulkSelectionContext =
  createContext<BulkSelectionContextType>(SELECTION_OFF);

export function useBulkSelection() {
  return useContext(BulkSelectionContext);
}
