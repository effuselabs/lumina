import { AlertingSystem, AlertSeverity } from '@/lib/monitoring/alerting-system';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        systemAlert: {
            create: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
        },
    },
}));

describe('AlertingSystem', () => {
    let alertingSystem: AlertingSystem;

    beforeEach(() => {
        alertingSystem = AlertingSystem.getInstance();
        jest.clearAllMocks();

        // Reset cooldown times
        (alertingSystem as any).lastAlertTimes.clear();
    });

    describe('checkAlert', () => {
        it('should trigger slow response time alert', async () => {
            await alertingSystem.checkAlert('response_time', 600, 'business-1');

            expect(prisma.systemAlert.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: 'slow-response-time',
                    severity: 'WARNING',
                    data: expect.objectContaining({
                        metric: 'response_time',
                        value: 600,
                        threshold: 500,
                        businessId: 'business-1',
                    }),
                }),
            });
        });

        it('should trigger high error rate alert', async () => {
            await alertingSystem.checkAlert('error_rate', 10, 'business-1');

            expect(prisma.systemAlert.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: 'high-error-rate',
                    severity: 'CRITICAL',
                    data: expect.objectContaining({
                        metric: 'error_rate',
                        value: 10,
                        threshold: 5,
                    }),
                }),
            });
        });

        it('should not trigger alert if value is below threshold', async () => {
            await alertingSystem.checkAlert('response_time', 300, 'business-1');

            expect(prisma.systemAlert.create).not.toHaveBeenCalled();
        });

        it('should respect cooldown period', async () => {
            // First alert should trigger
            await alertingSystem.checkAlert('response_time', 600, 'business-1');
            expect(prisma.systemAlert.create).toHaveBeenCalledTimes(1);

            // Second alert within cooldown should not trigger
            await alertingSystem.checkAlert('response_time', 700, 'business-1');
            expect(prisma.systemAlert.create).toHaveBeenCalledTimes(1);
        });

        it('should include metadata in alert data', async () => {
            const metadata = { appointmentId: 'test-id', operation: 'create' };

            await alertingSystem.checkAlert('response_time', 600, 'business-1', metadata);

            expect(prisma.systemAlert.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    data: expect.objectContaining(metadata),
                }),
            });
        });

        it('should handle database connection failure alerts', async () => {
            await alertingSystem.checkAlert('db_connection_errors', 1, 'business-1');

            expect(prisma.systemAlert.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: 'database-connection-failure',
                    severity: 'CRITICAL',
                }),
            });
        });

        it('should handle booking failure spike alerts', async () => {
            await alertingSystem.checkAlert('booking_failures', 15, 'business-1');

            expect(prisma.systemAlert.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: 'appointment-booking-failure-spike',
                    severity: 'WARNING',
                }),
            });
        });
    });

    describe('getActiveAlerts', () => {
        it('should return active alerts from database', async () => {
            const mockAlerts = [
                {
                    id: 'alert-1',
                    type: 'slow-response-time',
                    severity: 'WARNING',
                    data: { value: 600, threshold: 500 },
                    timestamp: new Date(),
                },
                {
                    id: 'alert-2',
                    type: 'high-error-rate',
                    severity: 'CRITICAL',
                    data: { value: 10, threshold: 5 },
                    timestamp: new Date(),
                },
            ];

            (prisma.systemAlert.findMany as jest.Mock).mockResolvedValue(mockAlerts);

            const alerts = await alertingSystem.getActiveAlerts();

            expect(alerts).toHaveLength(2);
            expect(alerts[0]).toEqual({
                id: 'alert-1',
                type: 'slow-response-time',
                severity: AlertSeverity.WARNING,
                message: 'Response time of 600.00ms exceeds threshold of 500ms',
                data: { value: 600, threshold: 500 },
                timestamp: mockAlerts[0].timestamp,
            });

            expect(prisma.systemAlert.findMany).toHaveBeenCalledWith({
                where: { resolved: false },
                orderBy: { timestamp: 'desc' },
                take: 50,
            });
        });

        it('should respect limit parameter', async () => {
            (prisma.systemAlert.findMany as jest.Mock).mockResolvedValue([]);

            await alertingSystem.getActiveAlerts(10);

            expect(prisma.systemAlert.findMany).toHaveBeenCalledWith({
                where: { resolved: false },
                orderBy: { timestamp: 'desc' },
                take: 10,
            });
        });
    });

    describe('resolveAlert', () => {
        it('should resolve an alert', async () => {
            const alertId = 'alert-1';
            const resolvedBy = 'user-1';

            await alertingSystem.resolveAlert(alertId, resolvedBy);

            expect(prisma.systemAlert.update).toHaveBeenCalledWith({
                where: { id: alertId },
                data: {
                    resolved: true,
                    resolvedAt: expect.any(Date),
                    resolvedBy,
                },
            });
        });

        it('should resolve alert without resolvedBy parameter', async () => {
            const alertId = 'alert-1';

            await alertingSystem.resolveAlert(alertId);

            expect(prisma.systemAlert.update).toHaveBeenCalledWith({
                where: { id: alertId },
                data: {
                    resolved: true,
                    resolvedAt: expect.any(Date),
                    resolvedBy: undefined,
                },
            });
        });
    });

    describe('alert rules management', () => {
        it('should add custom alert rule', () => {
            const customRule = {
                id: 'custom-rule',
                name: 'Custom Alert',
                condition: {
                    metric: 'custom_metric',
                    operator: 'gt' as const,
                    threshold: 100,
                },
                severity: AlertSeverity.WARNING,
                enabled: true,
                cooldownMinutes: 5,
            };

            alertingSystem.addAlertRule(customRule);

            const rules = alertingSystem.getAlertRules();
            expect(rules).toContainEqual(customRule);
        });

        it('should update existing alert rule', () => {
            const rules = alertingSystem.getAlertRules();
            const existingRule = rules.find((rule: any) => rule.id === 'slow-response-time');

            expect(existingRule).toBeDefined();

            alertingSystem.updateAlertRule('slow-response-time', {
                threshold: 1000,
                enabled: false,
            });

            const updatedRules = alertingSystem.getAlertRules();
            const updatedRule = updatedRules.find((rule: any) => rule.id === 'slow-response-time');

            expect(updatedRule?.condition.threshold).toBe(1000);
            expect(updatedRule?.enabled).toBe(false);
        });

        it('should get all alert rules', () => {
            const rules = alertingSystem.getAlertRules();

            expect(rules).toHaveLength(4); // Default rules
            expect(rules.map((rule: any) => rule.id)).toEqual([
                'slow-response-time',
                'high-error-rate',
                'database-connection-failure',
                'appointment-booking-failure-spike',
            ]);
        });
    });

    describe('alert condition evaluation', () => {
        it('should evaluate greater than condition correctly', async () => {
            await alertingSystem.checkAlert('response_time', 600);
            expect(prisma.systemAlert.create).toHaveBeenCalled();

            jest.clearAllMocks();
            await alertingSystem.checkAlert('response_time', 400);
            expect(prisma.systemAlert.create).not.toHaveBeenCalled();
        });

        it('should evaluate different operators correctly', () => {
            const testCases = [
                { operator: 'gt', value: 10, threshold: 5, expected: true },
                { operator: 'gt', value: 3, threshold: 5, expected: false },
                { operator: 'gte', value: 5, threshold: 5, expected: true },
                { operator: 'gte', value: 4, threshold: 5, expected: false },
                { operator: 'lt', value: 3, threshold: 5, expected: true },
                { operator: 'lt', value: 7, threshold: 5, expected: false },
                { operator: 'lte', value: 5, threshold: 5, expected: true },
                { operator: 'lte', value: 6, threshold: 5, expected: false },
                { operator: 'eq', value: 5, threshold: 5, expected: true },
                { operator: 'eq', value: 4, threshold: 5, expected: false },
            ];

            testCases.forEach(({ operator, value, threshold, expected }) => {
                const shouldTrigger = (alertingSystem as any).shouldTriggerAlert({
                    id: 'test-rule',
                    condition: { metric: 'test', operator, threshold },
                    cooldownMinutes: 0,
                }, value);

                expect(shouldTrigger).toBe(expected);
            });
        });
    });

    describe('error handling', () => {
        it('should handle database errors gracefully when persisting alerts', async () => {
            (prisma.systemAlert.create as jest.Mock).mockRejectedValue(
                new Error('Database error')
            );

            // Should not throw error
            await expect(
                alertingSystem.checkAlert('response_time', 600)
            ).resolves.not.toThrow();
        });

        it('should handle database errors gracefully when fetching alerts', async () => {
            (prisma.systemAlert.findMany as jest.Mock).mockRejectedValue(
                new Error('Database error')
            );

            // Should throw error since this is a read operation
            await expect(alertingSystem.getActiveAlerts()).rejects.toThrow('Database error');
        });
    });
});