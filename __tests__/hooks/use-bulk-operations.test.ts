import { useBulkOperations } from '@/hooks/use-bulk-operations';
import { getBulkOperationsService } from '@/lib/services/bulk-operations-service';
import { AppointmentStatus } from '@/types';
import { act, renderHook } from '@testing-library/react';

// Mock the service
jest.mock('@/lib/services/bulk-operations-service');

const mockService = {
    cancelAppointments: jest.fn(),
    updateAppointmentStatus: jest.fn(),
    rescheduleAppointments: jest.fn(),
    validateBulkOperation: jest.fn(),
    getTimeSlotConflicts: jest.fn(),
    getOperationHistory: jest.fn(),
};

(getBulkOperationsService as jest.Mock).mockReturnValue(mockService);

describe('useBulkOperations', () => {
    const mockProps = {
        businessId: 'business-123',
        onOperationComplete: jest.fn(),
        onError: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with correct default state', () => {
        const { result } = renderHook(() => useBulkOperations(mockProps));

        expect(result.current.isLoading).toBe(false);
        expect(result.current.currentOperation).toBe(null);
        expect(result.current.operationResults).toEqual([]);
        expect(result.current.operationHistory).toEqual([]);
    });

    describe('cancelAppointments', () => {
        it('should successfully cancel appointments', async () => {
            const mockResults = [
                {
                    appointmentId: 'apt-1',
                    clientName: 'John Doe',
                    status: 'success' as const,
                    message: 'Cancelled successfully',
                },
            ];

            mockService.cancelAppointments.mockResolvedValueOnce(mockResults);

            const { result } = renderHook(() => useBulkOperations(mockProps));

            await act(async () => {
                const results = await result.current.cancelAppointments(['apt-1'], 'Test reason');
                expect(results).toEqual(mockResults);
            });

            expect(mockService.cancelAppointments).toHaveBeenCalledWith(
                ['apt-1'],
                'Test reason',
                true,
                expect.any(Function)
            );
            expect(mockProps.onOperationComplete).toHaveBeenCalledWith('cancel', mockResults);
            expect(result.current.operationResults).toEqual(mockResults);
        });

        it('should handle cancellation errors', async () => {
            const error = new Error('Cancellation failed');
            mockService.cancelAppointments.mockRejectedValueOnce(error);

            const { result } = renderHook(() => useBulkOperations(mockProps));

            await act(async () => {
                await expect(result.current.cancelAppointments(['apt-1'])).rejects.toThrow(error);
            });

            expect(mockProps.onError).toHaveBeenCalledWith(error);
        });

        it('should update loading state during operation', async () => {
            let resolvePromise: (value: any) => void;
            const promise = new Promise((resolve) => {
                resolvePromise = resolve;
            });

            mockService.cancelAppointments.mockReturnValueOnce(promise);

            const { result } = renderHook(() => useBulkOperations(mockProps));

            // Start the operation
            act(() => {
                result.current.cancelAppointments(['apt-1']);
            });

            // Should be loading
            expect(result.current.isLoading).toBe(true);
            expect(result.current.currentOperation).toBe('cancel');

            // Resolve the promise
            await act(async () => {
                resolvePromise!([]);
            });

            // Should no longer be loading
            expect(result.current.isLoading).toBe(false);
            expect(result.current.currentOperation).toBe(null);
        });
    });

    describe('updateAppointmentStatus', () => {
        it('should successfully update appointment status', async () => {
            const mockResults = [
                {
                    appointmentId: 'apt-1',
                    clientName: 'John Doe',
                    status: 'success' as const,
                    message: 'Status updated successfully',
                },
            ];

            mockService.updateAppointmentStatus.mockResolvedValueOnce(mockResults);

            const { result } = renderHook(() => useBulkOperations(mockProps));

            await act(async () => {
                const results = await result.current.updateAppointmentStatus(
                    ['apt-1'],
                    'confirmed' as AppointmentStatus,
                    'Test notes'
                );
                expect(results).toEqual(mockResults);
            });

            expect(mockService.updateAppointmentStatus).toHaveBeenCalledWith(
                ['apt-1'],
                'confirmed',
                'Test notes',
                expect.any(Function)
            );
            expect(mockProps.onOperationComplete).toHaveBeenCalledWith('status_update', mockResults);
        });
    });

    describe('rescheduleAppointments', () => {
        it('should successfully reschedule appointments', async () => {
            const newDateTime = new Date('2024-01-15T14:00:00');
            const mockResults = [
                {
                    appointmentId: 'apt-1',
                    clientName: 'John Doe',
                    status: 'success' as const,
                    message: 'Rescheduled successfully',
                    originalTime: new Date('2024-01-15T10:00:00'),
                    newTime: newDateTime,
                },
            ];

            mockService.rescheduleAppointments.mockResolvedValueOnce(mockResults);

            const { result } = renderHook(() => useBulkOperations(mockProps));

            await act(async () => {
                const results = await result.current.rescheduleAppointments(
                    ['apt-1'],
                    newDateTime,
                    false
                );
                expect(results).toEqual(mockResults);
            });

            expect(mockService.rescheduleAppointments).toHaveBeenCalledWith(
                ['apt-1'],
                newDateTime,
                false,
                expect.any(Function)
            );
            expect(mockProps.onOperationComplete).toHaveBeenCalledWith('reschedule', mockResults);
        });
    });

    describe('validateOperation', () => {
        it('should validate bulk operation', async () => {
            const mockValidation = {
                valid: true,
                conflicts: [],
                warnings: [],
            };

            mockService.validateBulkOperation.mockResolvedValueOnce(mockValidation);

            const { result } = renderHook(() => useBulkOperations(mockProps));

            await act(async () => {
                const validation = await result.current.validateOperation(
                    'reschedule',
                    ['apt-1'],
                    { newDateTime: new Date('2024-01-15T14:00:00') }
                );
                expect(validation).toEqual(mockValidation);
            });

            expect(mockService.validateBulkOperation).toHaveBeenCalledWith(
                'reschedule',
                ['apt-1'],
                { newDateTime: new Date('2024-01-15T14:00:00') }
            );
        });
    });

    describe('getTimeSlotConflicts', () => {
        it('should get time slot conflicts', async () => {
            const mockConflicts = [
                {
                    appointmentId: 'apt-1',
                    conflicts: [
                        {
                            type: 'staff_unavailable' as const,
                            message: 'Staff unavailable',
                            suggestedAlternatives: [new Date('2024-01-15T15:00:00')],
                        },
                    ],
                },
            ];

            mockService.getTimeSlotConflicts.mockResolvedValueOnce(mockConflicts);

            const { result } = renderHook(() => useBulkOperations(mockProps));

            await act(async () => {
                const conflicts = await result.current.getTimeSlotConflicts(
                    ['apt-1'],
                    new Date('2024-01-15T14:00:00')
                );
                expect(conflicts).toEqual(mockConflicts);
            });
        });
    });

    describe('loadOperationHistory', () => {
        it('should load operation history', async () => {
            const mockHistory = [
                {
                    id: '1',
                    operation: 'cancel' as const,
                    performedBy: {
                        id: 'user-1',
                        name: 'John Doe',
                        email: 'john@example.com',
                    },
                    performedAt: new Date('2024-01-15T10:00:00'),
                    appointmentCount: 1,
                    successCount: 1,
                    errorCount: 0,
                    warningCount: 0,
                    details: {
                        appointmentIds: ['apt-1'],
                        clientNames: ['Client 1'],
                    },
                    status: 'completed' as const,
                },
            ];

            mockService.getOperationHistory.mockResolvedValueOnce(mockHistory);

            const { result } = renderHook(() => useBulkOperations(mockProps));

            await act(async () => {
                const history = await result.current.loadOperationHistory();
                expect(history).toEqual(mockHistory);
            });

            expect(result.current.operationHistory).toEqual(mockHistory);
        });

        it('should handle history loading errors', async () => {
            mockService.getOperationHistory.mockRejectedValueOnce(new Error('Failed to load'));

            const { result } = renderHook(() => useBulkOperations(mockProps));

            await act(async () => {
                const history = await result.current.loadOperationHistory();
                expect(history).toEqual([]);
            });

            expect(result.current.operationHistory).toEqual([]);
        });
    });

    describe('clearResults', () => {
        it('should clear operation results', async () => {
            const mockResults = [
                {
                    appointmentId: 'apt-1',
                    clientName: 'John Doe',
                    status: 'success' as const,
                },
            ];

            mockService.cancelAppointments.mockResolvedValueOnce(mockResults);

            const { result } = renderHook(() => useBulkOperations(mockProps));

            // First, perform an operation to have results
            await act(async () => {
                await result.current.cancelAppointments(['apt-1']);
            });

            expect(result.current.operationResults).toEqual(mockResults);

            // Clear results
            act(() => {
                result.current.clearResults();
            });

            expect(result.current.operationResults).toEqual([]);
        });
    });

    describe('progress callbacks', () => {
        it('should call progress callback during operations', async () => {
            const mockResults = [
                { appointmentId: 'apt-1', clientName: 'John Doe', status: 'success' as const },
                { appointmentId: 'apt-2', clientName: 'Jane Smith', status: 'success' as const },
            ];

            // Mock the service to call the progress callback
            mockService.cancelAppointments.mockImplementation(async (ids, reason, notify, onProgress) => {
                if (onProgress) {
                    // Simulate progressive results
                    onProgress([mockResults[0]]);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    onProgress(mockResults);
                }
                return mockResults;
            });

            const { result } = renderHook(() => useBulkOperations(mockProps));

            const progressCallback = jest.fn();

            await act(async () => {
                await result.current.cancelAppointments(['apt-1', 'apt-2'], 'Test', true, progressCallback);
            });

            expect(progressCallback).toHaveBeenCalledWith([mockResults[0]]);
            expect(progressCallback).toHaveBeenCalledWith(mockResults);
        });
    });
});