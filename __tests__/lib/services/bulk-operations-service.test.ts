import { BulkOperationsService, getBulkOperationsService } from '@/lib/services/bulk-operations-service';
import { AppointmentStatus } from '@/types/dashboard-appointments';

// Mock fetch globally
global.fetch = jest.fn();

describe('BulkOperationsService', () => {
    let service: BulkOperationsService;
    const mockBusinessId = 'business-123';

    beforeEach(() => {
        service = new BulkOperationsService(mockBusinessId);
        jest.clearAllMocks();
    });

    describe('cancelAppointments', () => {
        it('should successfully cancel appointments', async () => {
            const mockResponse = {
                results: [
                    {
                        appointmentId: 'apt-1',
                        clientName: 'John Doe',
                        status: 'success',
                        message: 'Appointment cancelled successfully',
                    },
                    {
                        appointmentId: 'apt-2',
                        clientName: 'Jane Smith',
                        status: 'success',
                        message: 'Appointment cancelled successfully',
                    },
                ],
            };

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await service.cancelAppointments(['apt-1', 'apt-2'], 'Test reason');

            expect(fetch).toHaveBeenCalledWith('/api/appointments/bulk/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    businessId: mockBusinessId,
                    appointmentIds: ['apt-1', 'apt-2'],
                    reason: 'Test reason',
                    notifyClients: true,
                }),
            });

            expect(result).toEqual(mockResponse.results);
        });

        it('should handle API errors gracefully', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
            });

            const result = await service.cancelAppointments(['apt-1', 'apt-2']);

            expect(result).toHaveLength(2);
            expect(result[0].status).toBe('error');
            expect(result[1].status).toBe('error');
        });

        it('should handle network errors', async () => {
            (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const result = await service.cancelAppointments(['apt-1']);

            expect(result).toHaveLength(1);
            expect(result[0].status).toBe('error');
            expect(result[0].message).toBe('Network error');
        });
    });

    describe('updateAppointmentStatus', () => {
        it('should successfully update appointment status', async () => {
            const mockResponse = {
                results: [
                    {
                        appointmentId: 'apt-1',
                        clientName: 'John Doe',
                        status: 'success',
                        message: 'Status updated successfully',
                    },
                ],
            };

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await service.updateAppointmentStatus(
                ['apt-1'],
                'confirmed' as AppointmentStatus,
                'Test notes'
            );

            expect(fetch).toHaveBeenCalledWith('/api/appointments/bulk/status', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    businessId: mockBusinessId,
                    appointmentIds: ['apt-1'],
                    status: 'confirmed',
                    notes: 'Test notes',
                }),
            });

            expect(result).toEqual(mockResponse.results);
        });
    });

    describe('rescheduleAppointments', () => {
        it('should successfully reschedule appointments', async () => {
            const newDateTime = new Date('2024-01-15T14:00:00');
            const mockResponse = {
                results: [
                    {
                        appointmentId: 'apt-1',
                        clientName: 'John Doe',
                        status: 'success',
                        message: 'Appointment rescheduled successfully',
                        originalTime: new Date('2024-01-15T10:00:00'),
                        newTime: newDateTime,
                    },
                ],
            };

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await service.rescheduleAppointments(['apt-1'], newDateTime, false);

            expect(fetch).toHaveBeenCalledWith('/api/appointments/bulk/reschedule', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    businessId: mockBusinessId,
                    appointmentIds: ['apt-1'],
                    newDateTime: newDateTime.toISOString(),
                    preserveStaff: false,
                }),
            });

            expect(result).toEqual(mockResponse.results);
        });
    });

    describe('getOperationHistory', () => {
        it('should fetch operation history with filters', async () => {
            const mockHistory = [
                {
                    id: '1',
                    operation: 'cancel',
                    performedBy: {
                        id: 'user-1',
                        name: 'John Doe',
                        email: 'john@example.com',
                    },
                    performedAt: '2024-01-15T10:00:00Z',
                    appointmentCount: 2,
                    successCount: 2,
                    errorCount: 0,
                    warningCount: 0,
                    details: {
                        appointmentIds: ['apt-1', 'apt-2'],
                        clientNames: ['Client 1', 'Client 2'],
                    },
                    status: 'completed',
                },
            ];

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ history: mockHistory }),
            });

            const filters = {
                operation: 'cancel' as const,
                dateRange: {
                    start: new Date('2024-01-01'),
                    end: new Date('2024-01-31'),
                },
            };

            const result = await service.getOperationHistory(filters);

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/appointments/bulk/history')
            );

            expect(result).toHaveLength(1);
            expect(result[0].performedAt).toBeInstanceOf(Date);
        });

        it('should handle empty history', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ history: [] }),
            });

            const result = await service.getOperationHistory();

            expect(result).toEqual([]);
        });
    });

    describe('validateBulkOperation', () => {
        it('should validate bulk operation successfully', async () => {
            const mockValidation = {
                valid: true,
                conflicts: [],
                warnings: [],
            };

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockValidation,
            });

            const result = await service.validateBulkOperation(
                'reschedule',
                ['apt-1'],
                { newDateTime: new Date('2024-01-15T14:00:00') }
            );

            expect(fetch).toHaveBeenCalledWith('/api/appointments/bulk/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    businessId: mockBusinessId,
                    operation: 'reschedule',
                    appointmentIds: ['apt-1'],
                    params: { newDateTime: new Date('2024-01-15T14:00:00') },
                }),
            });

            expect(result).toEqual(mockValidation);
        });

        it('should return conflicts when validation fails', async () => {
            const mockValidation = {
                valid: false,
                conflicts: [
                    {
                        appointmentId: 'apt-1',
                        type: 'staff_unavailable',
                        message: 'Staff member is not available at the selected time',
                        suggestedAlternatives: [new Date('2024-01-15T15:00:00')],
                    },
                ],
                warnings: [],
            };

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockValidation,
            });

            const result = await service.validateBulkOperation('reschedule', ['apt-1']);

            expect(result.valid).toBe(false);
            expect(result.conflicts).toHaveLength(1);
        });
    });

    describe('getTimeSlotConflicts', () => {
        it('should return conflicts for time slot', async () => {
            const mockConflicts = [
                {
                    appointmentId: 'apt-1',
                    conflicts: [
                        {
                            type: 'staff_unavailable',
                            message: 'Staff member has another appointment',
                            suggestedAlternatives: ['2024-01-15T15:00:00Z', '2024-01-15T16:00:00Z'],
                        },
                    ],
                },
            ];

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ conflicts: mockConflicts }),
            });

            const result = await service.getTimeSlotConflicts(
                ['apt-1'],
                new Date('2024-01-15T14:00:00')
            );

            expect(result).toHaveLength(1);
            expect(result[0].conflicts[0].suggestedAlternatives).toHaveLength(2);
            expect(result[0].conflicts[0].suggestedAlternatives[0]).toBeInstanceOf(Date);
        });
    });
});

describe('getBulkOperationsService', () => {
    it('should return singleton instance for business', () => {
        const service1 = getBulkOperationsService('business-1');
        const service2 = getBulkOperationsService('business-1');
        const service3 = getBulkOperationsService('business-2');

        expect(service1).toBe(service2);
        expect(service1).not.toBe(service3);
    });
});