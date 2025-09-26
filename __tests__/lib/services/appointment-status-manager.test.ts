import { prisma } from '@/lib/prisma';
import { AppointmentStatusManager } from '@/lib/services/appointment-status-manager';
import { AppointmentStatus } from '@prisma/client';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        appointment: {
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        appointmentStatusHistory: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('AppointmentStatusManager', () => {
    let statusManager: AppointmentStatusManager;

    beforeEach(() => {
        statusManager = new AppointmentStatusManager();
        jest.clearAllMocks();
    });

    describe('validateStatusTransition', () => {
        it('should allow valid transitions from SCHEDULED', async () => {
            const isValid1 = await statusManager.validateStatusTransition(
                AppointmentStatus.SCHEDULED,
                AppointmentStatus.CONFIRMED
            );
            const isValid2 = await statusManager.validateStatusTransition(
                AppointmentStatus.SCHEDULED,
                AppointmentStatus.CANCELLED
            );

            expect(isValid1).toBe(true);
            expect(isValid2).toBe(true);
        });

        it('should reject invalid transitions from SCHEDULED', async () => {
            const isValid = await statusManager.validateStatusTransition(
                AppointmentStatus.SCHEDULED,
                AppointmentStatus.IN_PROGRESS
            );

            expect(isValid).toBe(false);
        });

        it('should allow valid transitions from CONFIRMED', async () => {
            const isValid1 = await statusManager.validateStatusTransition(
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.IN_PROGRESS
            );
            const isValid2 = await statusManager.validateStatusTransition(
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.CANCELLED
            );
            const isValid3 = await statusManager.validateStatusTransition(
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.NO_SHOW
            );

            expect(isValid1).toBe(true);
            expect(isValid2).toBe(true);
            expect(isValid3).toBe(true);
        });

        it('should allow valid transitions from IN_PROGRESS', async () => {
            const isValid1 = await statusManager.validateStatusTransition(
                AppointmentStatus.IN_PROGRESS,
                AppointmentStatus.COMPLETED
            );
            const isValid2 = await statusManager.validateStatusTransition(
                AppointmentStatus.IN_PROGRESS,
                AppointmentStatus.CANCELLED
            );

            expect(isValid1).toBe(true);
            expect(isValid2).toBe(true);
        });

        it('should not allow transitions from COMPLETED (final state)', async () => {
            const isValid = await statusManager.validateStatusTransition(
                AppointmentStatus.COMPLETED,
                AppointmentStatus.CANCELLED
            );

            expect(isValid).toBe(false);
        });

        it('should allow rescheduling from CANCELLED', async () => {
            const isValid = await statusManager.validateStatusTransition(
                AppointmentStatus.CANCELLED,
                AppointmentStatus.SCHEDULED
            );

            expect(isValid).toBe(true);
        });

        it('should allow rescheduling from NO_SHOW', async () => {
            const isValid = await statusManager.validateStatusTransition(
                AppointmentStatus.NO_SHOW,
                AppointmentStatus.SCHEDULED
            );

            expect(isValid).toBe(true);
        });
    });

    describe('getValidTransitions', () => {
        it('should return correct valid transitions for SCHEDULED', () => {
            const transitions = statusManager.getValidTransitions(AppointmentStatus.SCHEDULED);

            expect(transitions).toEqual([
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.CANCELLED,
            ]);
        });

        it('should return correct valid transitions for CONFIRMED', () => {
            const transitions = statusManager.getValidTransitions(AppointmentStatus.CONFIRMED);

            expect(transitions).toEqual([
                AppointmentStatus.IN_PROGRESS,
                AppointmentStatus.CANCELLED,
                AppointmentStatus.NO_SHOW,
            ]);
        });

        it('should return correct valid transitions for IN_PROGRESS', () => {
            const transitions = statusManager.getValidTransitions(AppointmentStatus.IN_PROGRESS);

            expect(transitions).toEqual([
                AppointmentStatus.COMPLETED,
                AppointmentStatus.CANCELLED,
            ]);
        });

        it('should return empty array for COMPLETED (final state)', () => {
            const transitions = statusManager.getValidTransitions(AppointmentStatus.COMPLETED);

            expect(transitions).toEqual([]);
        });

        it('should return correct valid transitions for CANCELLED', () => {
            const transitions = statusManager.getValidTransitions(AppointmentStatus.CANCELLED);

            expect(transitions).toEqual([AppointmentStatus.SCHEDULED]);
        });

        it('should return correct valid transitions for NO_SHOW', () => {
            const transitions = statusManager.getValidTransitions(AppointmentStatus.NO_SHOW);

            expect(transitions).toEqual([AppointmentStatus.SCHEDULED]);
        });
    });

    describe('updateStatus', () => {
        const mockAppointment = {
            id: 'appointment-1',
            status: AppointmentStatus.SCHEDULED,
            confirmedAt: null,
            startedAt: null,
            completedAt: null,
            cancelledAt: null,
        };

        beforeEach(() => {
            mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment);
            mockPrisma.$transaction.mockImplementation(async (callback) => {
                return await callback(mockPrisma);
            });
        });

        it('should successfully update status with valid transition', async () => {
            const updatedAppointment = {
                ...mockAppointment,
                status: AppointmentStatus.CONFIRMED,
                confirmedAt: new Date(),
            };

            mockPrisma.appointment.update.mockResolvedValue(updatedAppointment);
            mockPrisma.appointmentStatusHistory.create.mockResolvedValue({} as any);

            const result = await statusManager.updateStatus(
                'appointment-1',
                AppointmentStatus.CONFIRMED,
                'business-1',
                { changedBy: 'user-1', reason: 'Client confirmed' }
            );

            expect(result.success).toBe(true);
            expect(result.appointment?.status).toBe(AppointmentStatus.CONFIRMED);
            expect(result.appointment?.confirmedAt).toBeDefined();

            expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
                where: { id: 'appointment-1' },
                data: {
                    status: AppointmentStatus.CONFIRMED,
                    confirmedAt: expect.any(Date),
                },
                select: {
                    id: true,
                    status: true,
                    confirmedAt: true,
                    startedAt: true,
                    completedAt: true,
                    cancelledAt: true,
                },
            });

            expect(mockPrisma.appointmentStatusHistory.create).toHaveBeenCalledWith({
                data: {
                    appointmentId: 'appointment-1',
                    businessId: 'business-1',
                    oldStatus: AppointmentStatus.SCHEDULED,
                    newStatus: AppointmentStatus.CONFIRMED,
                    changedBy: 'user-1',
                    reason: 'Client confirmed',
                },
            });
        });

        it('should reject invalid status transition', async () => {
            const result = await statusManager.updateStatus(
                'appointment-1',
                AppointmentStatus.IN_PROGRESS,
                'business-1'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid status transition from SCHEDULED to IN_PROGRESS');
            expect(result.validTransitions).toEqual([
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.CANCELLED,
            ]);

            expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
            expect(mockPrisma.appointmentStatusHistory.create).not.toHaveBeenCalled();
        });

        it('should handle appointment not found', async () => {
            mockPrisma.appointment.findFirst.mockResolvedValue(null);

            const result = await statusManager.updateStatus(
                'nonexistent-appointment',
                AppointmentStatus.CONFIRMED,
                'business-1'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Appointment not found or access denied');
        });

        it('should skip validation when explicitly requested', async () => {
            const updatedAppointment = {
                ...mockAppointment,
                status: AppointmentStatus.IN_PROGRESS,
                startedAt: new Date(),
            };

            mockPrisma.appointment.update.mockResolvedValue(updatedAppointment);
            mockPrisma.appointmentStatusHistory.create.mockResolvedValue({} as any);

            const result = await statusManager.updateStatus(
                'appointment-1',
                AppointmentStatus.IN_PROGRESS,
                'business-1',
                { skipValidation: true }
            );

            expect(result.success).toBe(true);
            expect(result.appointment?.status).toBe(AppointmentStatus.IN_PROGRESS);
        });

        it('should set correct timestamps for different statuses', async () => {
            const testCases = [
                { status: AppointmentStatus.CONFIRMED, timestampField: 'confirmedAt' },
                { status: AppointmentStatus.IN_PROGRESS, timestampField: 'startedAt' },
                { status: AppointmentStatus.COMPLETED, timestampField: 'completedAt' },
                { status: AppointmentStatus.CANCELLED, timestampField: 'cancelledAt' },
                { status: AppointmentStatus.NO_SHOW, timestampField: 'cancelledAt' },
            ];

            for (const testCase of testCases) {
                mockPrisma.appointment.update.mockResolvedValue({
                    ...mockAppointment,
                    status: testCase.status,
                    [testCase.timestampField]: new Date(),
                });

                await statusManager.updateStatus(
                    'appointment-1',
                    testCase.status,
                    'business-1',
                    { skipValidation: true }
                );

                expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            status: testCase.status,
                            [testCase.timestampField]: expect.any(Date),
                        }),
                    })
                );
            }
        });

        it('should handle database errors gracefully', async () => {
            mockPrisma.$transaction.mockRejectedValue(new Error('Database error'));

            const result = await statusManager.updateStatus(
                'appointment-1',
                AppointmentStatus.CONFIRMED,
                'business-1'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to update appointment status');
        });
    });

    describe('getStatusHistory', () => {
        it('should return status history for appointment', async () => {
            const mockHistory = [
                {
                    id: 'history-1',
                    oldStatus: null,
                    newStatus: AppointmentStatus.SCHEDULED,
                    changedBy: null,
                    reason: null,
                    createdAt: new Date('2024-01-01T10:00:00Z'),
                },
                {
                    id: 'history-2',
                    oldStatus: AppointmentStatus.SCHEDULED,
                    newStatus: AppointmentStatus.CONFIRMED,
                    changedBy: 'user-1',
                    reason: 'Client confirmed',
                    createdAt: new Date('2024-01-01T11:00:00Z'),
                },
            ];

            mockPrisma.appointmentStatusHistory.findMany.mockResolvedValue(mockHistory);

            const result = await statusManager.getStatusHistory('appointment-1', 'business-1');

            expect(result).toEqual(mockHistory);
            expect(mockPrisma.appointmentStatusHistory.findMany).toHaveBeenCalledWith({
                where: {
                    appointmentId: 'appointment-1',
                    businessId: 'business-1',
                },
                orderBy: {
                    createdAt: 'desc',
                },
                select: {
                    id: true,
                    oldStatus: true,
                    newStatus: true,
                    changedBy: true,
                    reason: true,
                    createdAt: true,
                },
            });
        });
    });

    describe('validateBusinessContext', () => {
        it('should return true for valid business context', async () => {
            mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'appointment-1' });

            const result = await statusManager.validateBusinessContext('appointment-1', 'business-1');

            expect(result).toBe(true);
            expect(mockPrisma.appointment.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 'appointment-1',
                    businessId: 'business-1',
                },
                select: { id: true },
            });
        });

        it('should return false for invalid business context', async () => {
            mockPrisma.appointment.findFirst.mockResolvedValue(null);

            const result = await statusManager.validateBusinessContext('appointment-1', 'wrong-business');

            expect(result).toBe(false);
        });
    });

    describe('triggerStatusEvents', () => {
        it('should log status change event', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await statusManager.triggerStatusEvents({
                appointmentId: 'appointment-1',
                businessId: 'business-1',
                oldStatus: AppointmentStatus.SCHEDULED,
                newStatus: AppointmentStatus.CONFIRMED,
                changedBy: 'user-1',
                reason: 'Client confirmed',
                timestamp: new Date(),
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                'Status change event triggered:',
                expect.objectContaining({
                    appointmentId: 'appointment-1',
                    transition: 'SCHEDULED -> CONFIRMED',
                })
            );

            consoleSpy.mockRestore();
        });

        it('should trigger status-specific events', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            // Test confirmation events
            await statusManager.triggerStatusEvents({
                appointmentId: 'appointment-1',
                businessId: 'business-1',
                oldStatus: AppointmentStatus.SCHEDULED,
                newStatus: AppointmentStatus.CONFIRMED,
                timestamp: new Date(),
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                'Appointment appointment-1 confirmed - triggering confirmation events'
            );

            // Test completion events
            await statusManager.triggerStatusEvents({
                appointmentId: 'appointment-1',
                businessId: 'business-1',
                oldStatus: AppointmentStatus.IN_PROGRESS,
                newStatus: AppointmentStatus.COMPLETED,
                timestamp: new Date(),
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                'Appointment appointment-1 completed - triggering completion events'
            );

            consoleSpy.mockRestore();
        });

        it('should handle errors gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Mock a method to throw an error
            const originalMethod = statusManager['handleStatusSpecificEvents'];
            statusManager['handleStatusSpecificEvents'] = jest.fn().mockRejectedValue(new Error('Test error'));

            await statusManager.triggerStatusEvents({
                appointmentId: 'appointment-1',
                businessId: 'business-1',
                oldStatus: AppointmentStatus.SCHEDULED,
                newStatus: AppointmentStatus.CONFIRMED,
                timestamp: new Date(),
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to trigger status change events:',
                expect.any(Error)
            );

            // Restore original method
            statusManager['handleStatusSpecificEvents'] = originalMethod;
            consoleSpy.mockRestore();
        });
    });

    describe('bulkUpdateStatus', () => {
        beforeEach(() => {
            mockPrisma.$transaction.mockImplementation(async (callback) => {
                return await callback(mockPrisma);
            });
        });

        it('should update multiple appointments successfully', async () => {
            const mockAppointment = {
                id: 'appointment-1',
                status: AppointmentStatus.SCHEDULED,
                confirmedAt: null,
                startedAt: null,
                completedAt: null,
                cancelledAt: null,
            };

            mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment);
            mockPrisma.appointment.update.mockResolvedValue({
                ...mockAppointment,
                status: AppointmentStatus.CONFIRMED,
                confirmedAt: new Date(),
            });
            mockPrisma.appointmentStatusHistory.create.mockResolvedValue({} as any);

            const result = await statusManager.bulkUpdateStatus(
                ['appointment-1', 'appointment-2'],
                AppointmentStatus.CONFIRMED,
                'business-1',
                { changedBy: 'user-1' }
            );

            expect(result.successful).toHaveLength(2);
            expect(result.failed).toHaveLength(0);
        });

        it('should handle partial failures', async () => {
            mockPrisma.appointment.findFirst
                .mockResolvedValueOnce({
                    id: 'appointment-1',
                    status: AppointmentStatus.SCHEDULED,
                    confirmedAt: null,
                    startedAt: null,
                    completedAt: null,
                    cancelledAt: null,
                })
                .mockResolvedValueOnce(null); // Second appointment not found

            mockPrisma.appointment.update.mockResolvedValue({
                id: 'appointment-1',
                status: AppointmentStatus.CONFIRMED,
                confirmedAt: new Date(),
                startedAt: null,
                completedAt: null,
                cancelledAt: null,
            });
            mockPrisma.appointmentStatusHistory.create.mockResolvedValue({} as any);

            const result = await statusManager.bulkUpdateStatus(
                ['appointment-1', 'appointment-2'],
                AppointmentStatus.CONFIRMED,
                'business-1'
            );

            expect(result.successful).toHaveLength(1);
            expect(result.failed).toHaveLength(1);
            expect(result.failed[0].appointmentId).toBe('appointment-2');
        });
    });

    describe('validateStatusUpdateWithBusinessRules', () => {
        it('should validate successful status update', async () => {
            const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

            mockPrisma.appointment.findFirst.mockResolvedValue({
                id: 'appointment-1',
                status: AppointmentStatus.SCHEDULED,
                startTime: futureDate,
                endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
                business: {
                    cancellationPolicy: '24 hours notice required',
                },
            });

            const result = await statusManager.validateStatusUpdateWithBusinessRules(
                'appointment-1',
                AppointmentStatus.CONFIRMED,
                'business-1'
            );

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect invalid status transitions', async () => {
            const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

            mockPrisma.appointment.findFirst.mockResolvedValue({
                id: 'appointment-1',
                status: AppointmentStatus.COMPLETED,
                startTime: futureDate,
                endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
                business: {
                    cancellationPolicy: null,
                },
            });

            const result = await statusManager.validateStatusUpdateWithBusinessRules(
                'appointment-1',
                AppointmentStatus.CANCELLED,
                'business-1'
            );

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain(
                'Invalid status transition from COMPLETED to CANCELLED'
            );
        });

        it('should warn about late cancellations', async () => {
            const soonDate = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now

            mockPrisma.appointment.findFirst.mockResolvedValue({
                id: 'appointment-1',
                status: AppointmentStatus.CONFIRMED,
                startTime: soonDate,
                endTime: new Date(soonDate.getTime() + 60 * 60 * 1000),
                business: {
                    cancellationPolicy: '24 hours notice required',
                },
            });

            const result = await statusManager.validateStatusUpdateWithBusinessRules(
                'appointment-1',
                AppointmentStatus.CANCELLED,
                'business-1'
            );

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain(
                'Cancellation within 24 hours - cancellation policy may apply'
            );
        });
    });

    describe('getAppointmentsNeedingStatusUpdate', () => {
        it('should identify appointments needing status updates', async () => {
            const now = new Date();
            const pastDate = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
            const pastEndDate = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago

            mockPrisma.appointment.findMany.mockResolvedValue([
                {
                    id: 'appointment-1',
                    status: AppointmentStatus.SCHEDULED,
                    startTime: pastDate,
                    endTime: pastEndDate,
                },
                {
                    id: 'appointment-2',
                    status: AppointmentStatus.IN_PROGRESS,
                    startTime: pastDate,
                    endTime: pastEndDate,
                },
                {
                    id: 'appointment-3',
                    status: AppointmentStatus.CONFIRMED,
                    startTime: pastDate,
                    endTime: pastEndDate,
                },
            ]);

            const result = await statusManager.getAppointmentsNeedingStatusUpdate('business-1');

            expect(result.missedAppointments).toHaveLength(1);
            expect(result.needCompletion).toHaveLength(1);
            expect(result.needConfirmation).toHaveLength(1);
        });
    });
});