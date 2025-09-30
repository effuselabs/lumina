/**
 * Dashboard Appointment Types
 * Enhanced appointment types for dashboard management
 */

export interface DashboardAppointment {
    // Core appointment data
    id: string;
    businessId: string;
    clientId: string;
    staffId: string;
    startTime: Date;
    endTime: Date;
    status: string;
    services: Array<{
        id: string;
        name: string;
        duration: number;
        price: number;
    }>;
    totalPrice: number;
    totalDuration: number;
    notes?: string;

    // Enhanced data for dashboard
    client: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        avatar?: string;
    };

    staff: {
        id: string;
        firstName: string;
        lastName: string;
        displayName: string;
        color: string; // For calendar color coding
    };

    // Computed properties
    isConflicted: boolean;
    canEdit: boolean;
    canCancel: boolean;
    canReschedule: boolean;

    // Real-time status
    lastUpdated: Date;
    updatedBy?: string;
}