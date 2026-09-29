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

const BulkSelectionContext = createContext<
  BulkSelectionContextType | undefined
>(undefined);

export function useBulkSelection() {
  const context = useContext(BulkSelectionContext);
  if (!context) {
    throw new Error(
      'useBulkSelection must be used within a BulkSelectionProvider'
    );
  }
  return context;
}
