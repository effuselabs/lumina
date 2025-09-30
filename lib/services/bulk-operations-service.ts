import { AppointmentStatus } from '@prisma/client';

export interface BulkOperationResult {
  appointmentId: string;
  clientName: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message?: string;
  originalTime?: Date;
  newTime?: Date;
}

export interface BulkOperationHistoryEntry {
  id: string;
  operation: 'cancel' | 'status_update' | 'reschedule';
  performedBy: {
    id: string;
    name: string;
    email: string;
  };
  performedAt: Date;
  appointmentCount: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
  details: {
    appointmentIds: string[];
    clientNames: string[];
    originalValues?: any;
    newValues?: any;
    errors?: string[];
  };
  status: 'completed' | 'partial' | 'failed';
}

export class BulkOperationsService {
  private businessId: string;

  constructor(businessId: string) {
    this.businessId = businessId;
  }

  /**
   * Cancel multiple appointments
   */
  async cancelAppointments(
    appointmentIds: string[],
    reason?: string,
    notifyClients: boolean = true
  ): Promise<BulkOperationResult[]> {
    const _results: BulkOperationResult[] = [];

    try {
      const response = await fetch('/api/appointments/bulk/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: this.businessId,
          appointmentIds,
          reason,
          notifyClients,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel appointments');
      }

      const data = await response.json();
      return data.results;
    } catch (error) {
      // Return error results for all appointments
      return appointmentIds.map(id => ({
        appointmentId: id,
        clientName: 'Unknown',
        status: 'error' as const,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }

  /**
   * Update status for multiple appointments
   */
  async updateAppointmentStatus(
    appointmentIds: string[],
    newStatus: AppointmentStatus,
    notes?: string
  ): Promise<BulkOperationResult[]> {
    try {
      const response = await fetch('/api/appointments/bulk/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: this.businessId,
          appointmentIds,
          status: newStatus,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update appointment status');
      }

      const data = await response.json();
      return data.results;
    } catch (error) {
      return appointmentIds.map(id => ({
        appointmentId: id,
        clientName: 'Unknown',
        status: 'error' as const,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }

  /**
   * Reschedule multiple appointments
   */
  async rescheduleAppointments(
    appointmentIds: string[],
    newDateTime: Date,
    preserveStaff: boolean = true
  ): Promise<BulkOperationResult[]> {
    try {
      const response = await fetch('/api/appointments/bulk/reschedule', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: this.businessId,
          appointmentIds,
          newDateTime: newDateTime.toISOString(),
          preserveStaff,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reschedule appointments');
      }

      const data = await response.json();
      return data.results;
    } catch (error) {
      return appointmentIds.map(id => ({
        appointmentId: id,
        clientName: 'Unknown',
        status: 'error' as const,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }

  /**
   * Get bulk operation history
   */
  async getOperationHistory(filters?: {
    operation?: 'cancel' | 'status_update' | 'reschedule';
    dateRange?: {
      start: Date;
      end: Date;
    };
    performedBy?: string;
  }): Promise<BulkOperationHistoryEntry[]> {
    try {
      const params = new URLSearchParams({
        businessId: this.businessId,
      });

      if (filters?.operation) {
        params.append('operation', filters.operation);
      }
      if (filters?.dateRange) {
        params.append('startDate', filters.dateRange.start.toISOString());
        params.append('endDate', filters.dateRange.end.toISOString());
      }
      if (filters?.performedBy) {
        params.append('performedBy', filters.performedBy);
      }

      const response = await fetch(`/api/appointments/bulk/history?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch operation history');
      }

      const data = await response.json();
      return data.history.map((entry: any) => ({
        ...entry,
        performedAt: new Date(entry.performedAt),
      }));
    } catch (error) {
      console.error('Error fetching bulk operation history:', error);
      return [];
    }
  }

  /**
   * Validate bulk operation before execution
   */
  async validateBulkOperation(
    operation: 'cancel' | 'status_update' | 'reschedule',
    appointmentIds: string[],
    params?: {
      newDateTime?: Date;
      newStatus?: AppointmentStatus;
    }
  ): Promise<{
    valid: boolean;
    conflicts: Array<{
      appointmentId: string;
      type:
        | 'staff_unavailable'
        | 'time_overlap'
        | 'business_closed'
        | 'invalid_status';
      message: string;
      suggestedAlternatives?: Date[];
    }>;
    warnings: Array<{
      appointmentId: string;
      message: string;
    }>;
  }> {
    try {
      const response = await fetch('/api/appointments/bulk/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: this.businessId,
          operation,
          appointmentIds,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate bulk operation');
      }

      return await response.json();
    } catch (error) {
      return {
        valid: false,
        conflicts: [
          {
            appointmentId: 'validation',
            type: 'invalid_status',
            message:
              error instanceof Error ? error.message : 'Validation failed',
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Get appointment conflicts for a specific time slot
   */
  async getTimeSlotConflicts(
    appointmentIds: string[],
    newDateTime: Date
  ): Promise<
    Array<{
      appointmentId: string;
      conflicts: Array<{
        type: 'staff_unavailable' | 'time_overlap' | 'business_closed';
        message: string;
        suggestedAlternatives: Date[];
      }>;
    }>
  > {
    try {
      const response = await fetch('/api/appointments/bulk/conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: this.businessId,
          appointmentIds,
          newDateTime: newDateTime.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check conflicts');
      }

      const data = await response.json();
      return data.conflicts.map((conflict: any) => ({
        ...conflict,
        conflicts: conflict.conflicts.map((c: any) => ({
          ...c,
          suggestedAlternatives: c.suggestedAlternatives.map(
            (alt: string) => new Date(alt)
          ),
        })),
      }));
    } catch (error) {
      console.error('Error checking time slot conflicts:', error);
      return [];
    }
  }

  /**
   * Create audit log entry for bulk operation
   */
  private async createAuditLog(
    operation: 'cancel' | 'status_update' | 'reschedule',
    appointmentIds: string[],
    results: BulkOperationResult[],
    metadata?: any
  ): Promise<void> {
    try {
      await fetch('/api/appointments/bulk/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: this.businessId,
          operation,
          appointmentIds,
          results,
          metadata,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging failure shouldn't break the operation
    }
  }
}

// Singleton instance factory
const bulkOperationsServices = new Map<string, BulkOperationsService>();

export function getBulkOperationsService(
  businessId: string
): BulkOperationsService {
  if (!bulkOperationsServices.has(businessId)) {
    bulkOperationsServices.set(
      businessId,
      new BulkOperationsService(businessId)
    );
  }
  return bulkOperationsServices.get(businessId)!;
}
