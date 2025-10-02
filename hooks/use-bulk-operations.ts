'use client';

import {
    BulkOperationHistoryEntry,
    BulkOperationResult,
    getBulkOperationsService
} from '@/lib/services/bulk-operations-service';
import { AppointmentStatus } from '@/types';
import { useCallback, useState } from 'react';

interface UseBulkOperationsProps {
    businessId: string;
    onOperationComplete?: (operation: string, results: BulkOperationResult[]) => void;
    onError?: (error: Error) => void;
}

export function useBulkOperations({
    businessId,
    onOperationComplete,
    onError,
}: UseBulkOperationsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [currentOperation, setCurrentOperation] = useState<string | null>(null);
    const [operationResults, setOperationResults] = useState<BulkOperationResult[]>([]);
    const [operationHistory, setOperationHistory] = useState<BulkOperationHistoryEntry[]>([]);

    const service = getBulkOperationsService(businessId);

    const executeWithProgress = useCallback(async <T>(
        operation: string,
        asyncOperation: () => Promise<T>,
        onProgress?: (progress: number) => void
    ): Promise<T> => {
        setIsLoading(true);
        setCurrentOperation(operation);
        setOperationResults([]);

        try {
            // Simulate progress updates
            if (onProgress) {
                onProgress(10);
                await new Promise(resolve => setTimeout(resolve, 100));
                onProgress(30);
                await new Promise(resolve => setTimeout(resolve, 100));
                onProgress(60);
            }

            const result = await asyncOperation();

            if (onProgress) {
                onProgress(100);
            }

            return result;
        } finally {
            setIsLoading(false);
            setCurrentOperation(null);
        }
    }, []);

    const cancelAppointments = useCallback(async (
        appointmentIds: string[],
        reason?: string,
        notifyClients: boolean = true,
        onProgress?: (results: BulkOperationResult[]) => void
    ): Promise<BulkOperationResult[]> => {
        try {
            const results = await executeWithProgress(
                'cancel',
                async () => {
                    const results = await service.cancelAppointments(appointmentIds, reason, notifyClients);

                    // Simulate progressive results for UI feedback
                    if (onProgress) {
                        for (let i = 0; i < results.length; i++) {
                            await new Promise(resolve => setTimeout(resolve, 200));
                            onProgress(results.slice(0, i + 1));
                        }
                    }

                    return results;
                }
            );

            setOperationResults(results);
            onOperationComplete?.('cancel', results);
            return results;
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            onError?.(err);
            throw err;
        }
    }, [businessId, service, executeWithProgress, onOperationComplete, onError]);

    const updateAppointmentStatus = useCallback(async (
        appointmentIds: string[],
        newStatus: AppointmentStatus,
        notes?: string,
        onProgress?: (results: BulkOperationResult[]) => void
    ): Promise<BulkOperationResult[]> => {
        try {
            const results = await executeWithProgress(
                'status_update',
                async () => {
                    const results = await service.updateAppointmentStatus(appointmentIds, newStatus, notes);

                    if (onProgress) {
                        for (let i = 0; i < results.length; i++) {
                            await new Promise(resolve => setTimeout(resolve, 150));
                            onProgress(results.slice(0, i + 1));
                        }
                    }

                    return results;
                }
            );

            setOperationResults(results);
            onOperationComplete?.('status_update', results);
            return results;
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            onError?.(err);
            throw err;
        }
    }, [businessId, service, executeWithProgress, onOperationComplete, onError]);

    const rescheduleAppointments = useCallback(async (
        appointmentIds: string[],
        newDateTime: Date,
        preserveStaff: boolean = true,
        onProgress?: (results: BulkOperationResult[]) => void
    ): Promise<BulkOperationResult[]> => {
        try {
            const results = await executeWithProgress(
                'reschedule',
                async () => {
                    const results = await service.rescheduleAppointments(appointmentIds, newDateTime, preserveStaff);

                    if (onProgress) {
                        for (let i = 0; i < results.length; i++) {
                            await new Promise(resolve => setTimeout(resolve, 300));
                            onProgress(results.slice(0, i + 1));
                        }
                    }

                    return results;
                }
            );

            setOperationResults(results);
            onOperationComplete?.('reschedule', results);
            return results;
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            onError?.(err);
            throw err;
        }
    }, [businessId, service, executeWithProgress, onOperationComplete, onError]);

    const validateOperation = useCallback(async (
        operation: 'cancel' | 'status_update' | 'reschedule',
        appointmentIds: string[],
        params?: {
            newDateTime?: Date;
            newStatus?: AppointmentStatus;
        }
    ) => {
        return await service.validateBulkOperation(operation, appointmentIds, params);
    }, [service]);

    const getTimeSlotConflicts = useCallback(async (
        appointmentIds: string[],
        newDateTime: Date
    ) => {
        return await service.getTimeSlotConflicts(appointmentIds, newDateTime);
    }, [service]);

    const loadOperationHistory = useCallback(async (
        filters?: {
            operation?: 'cancel' | 'status_update' | 'reschedule';
            dateRange?: {
                start: Date;
                end: Date;
            };
            performedBy?: string;
        }
    ) => {
        try {
            const history = await service.getOperationHistory(filters);
            setOperationHistory(history);
            return history;
        } catch (error) {
            console.error('Failed to load operation history:', error);
            return [];
        }
    }, [service]);

    const clearResults = useCallback(() => {
        setOperationResults([]);
    }, []);

    return {
        // State
        isLoading,
        currentOperation,
        operationResults,
        operationHistory,

        // Operations
        cancelAppointments,
        updateAppointmentStatus,
        rescheduleAppointments,

        // Validation
        validateOperation,
        getTimeSlotConflicts,

        // History
        loadOperationHistory,

        // Utilities
        clearResults,
    };
}