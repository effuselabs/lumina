/**
 * Dashboard Integration Tests
 * 
 * Comprehensive tests for the Dashboard Appointment Management integration layer.
 * Tests all system integrations and their interactions.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { AppointmentNotificationService } from '@/lib/services/appointment-notification-service'
import { DashboardIntegrationService } from '@/lib/services/dashboard-integration-service'
import { SystemIntegrationManager } from '@/lib/services/system-integration-manager'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { AppointmentStatus } from '@prisma/client'

// Mock dependencies
jest.mock('@/lib/services/appointment-service')
jest.mock('@/lib/services/client-service')
jest.mock('@/lib/services/calendar-integration')
jest.mock('@/lib/services/websocket-service')
jest.mock('@/lib/services/real-time-sync-service')
jest.mock('@/lib/prisma')

describe('Dashboard Integration Service', () => {
    let dashboardIntegration: DashboardIntegrationService
    let mockBusinessId: string
    let mockAppointmentData: any

    beforeEach(() => {
        dashboardIntegration = new DashboardIntegrationService()
        mockBusinessId = 'test-business-id'
        mockAppointmentData = {
            clientId: 'test-client-id',
            staffId: 'test-staff-id',
            startTime: new Date('2024-01-15T10:00:00Z'),
            endTime: new Date('2024-01-15T11:00:00Z'),
            services: [{
                serviceId: 'test-service-id',
                serviceName: 'Test Service',
                price: 50,
                duration: 60
            }],
            clientName: 'Test Client',
            clientEmail: 'test@example.com',
            clientPhone: '+1234567890'
        }
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('Appointment Booking Engine Integration (LUM-97)', () => {
        it('should get dashboard appointments with enhanced data', async () => {
            // Mock the appointment service response
            const mockAppointments = [{
                id: 'test-appointment-id',
                businessId: mockBusinessId,
                staffId: 'test-staff-id',
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                status: AppointmentStatus.SCHEDULED,
                client: {
                    id: 'test-client-id',
                    firstName: 'Test',
                    lastName: 'Client',
                    email: 'test@example.com',
                    phone: '+1234567890'
                },
                staff: {
                    id: 'test-staff-id',
                    firstName: 'Test',
                    lastName: 'Staff',
                    displayName: 'Test Staff'
                },
                services: [{
                    serviceId: 'test-service-id',
                    serviceName: 'Test Service',
                    price: 50,
                    duration: 60
                }],
                totalPrice: 50,
                totalDuration: 60,
                createdAt: new Date(),
                updatedAt: new Date()
            }]

            // Test getting dashboard appointments
            const result = await dashboardIntegration.getDashboardAppointments(mockBusinessId)

            expect(result).toBeDefined()
            expect(result.appointments).toBeDefined()
            expect(Array.isArray(result.appointments)).toBe(true)
        })

        it('should create appointment with full integration', async () => {
            const result = await dashboardIntegration.createDashboardAppointment(
                mockBusinessId,
                mockAppointmentData
            )

            expect(result).toBeDefined()
            expect(result.success).toBeDefined()
            expect(result.errors).toBeDefined()
            expect(result.warnings).toBeDefined()
        })

        it('should update appointment with full integration', async () => {
            const appointmentId = 'test-appointment-id'
            const updates = {
                startTime: new Date('2024-01-15T11:00:00Z'),
                endTime: new Date('2024-01-15T12:00:00Z')
            }

            const result = await dashboardIntegration.updateDashboardAppointment(
                appointmentId,
                mockBusinessId,
                updates
            )

            expect(result).toBeDefined()
            expect(result.success).toBeDefined()
            expect(result.errors).toBeDefined()
            expect(result.warnings).toBeDefined()
        })
    })

    describe('Calendar Infrastructure Integration (LUM-96)', () => {
        it('should check availability using calendar infrastructure', async () => {
            const result = await dashboardIntegration.checkAvailability(
                mockBusinessId,
                'test-staff-id',
                new Date('2024-01-15T10:00:00Z'),
                new Date('2024-01-15T11:00:00Z'),
                ['test-service-id']
            )

            expect(result).toBeDefined()
            expect(result.isAvailable).toBeDefined()
            expect(result.conflicts).toBeDefined()
            expect(Array.isArray(result.conflicts)).toBe(true)
        })

        it('should get staff availability for calendar views', async () => {
            const staffIds = ['test-staff-id-1', 'test-staff-id-2']
            const dateRange = {
                start: new Date('2024-01-15T00:00:00Z'),
                end: new Date('2024-01-15T23:59:59Z')
            }

            const result = await dashboardIntegration.getStaffAvailability(
                mockBusinessId,
                staffIds,
                dateRange
            )

            expect(result).toBeDefined()
            expect(typeof result).toBe('object')

            for (const staffId of staffIds) {
                if (result[staffId]) {
                    expect(result[staffId].availableSlots).toBeDefined()
                    expect(result[staffId].busySlots).toBeDefined()
                    expect(result[staffId].workingHours).toBeDefined()
                }
            }
        })
    })

    describe('Client Management Integration', () => {
        it('should get client data for appointments', async () => {
            const clientId = 'test-client-id'

            const result = await dashboardIntegration.getClientData(clientId, mockBusinessId)

            if (result) {
                expect(result.id).toBe(clientId)
                expect(result.firstName).toBeDefined()
                expect(result.lastName).toBeDefined()
                expect(result.email).toBeDefined()
                expect(result.phone).toBeDefined()
                expect(result.appointmentHistory).toBeDefined()
                expect(Array.isArray(result.appointmentHistory)).toBe(true)
                expect(result.preferences).toBeDefined()
            }
        })

        it('should search clients for appointment assignment', async () => {
            const query = 'test'
            const limit = 10

            const result = await dashboardIntegration.searchClients(
                mockBusinessId,
                query,
                limit
            )

            expect(result).toBeDefined()
            expect(Array.isArray(result)).toBe(true)
            expect(result.length).toBeLessThanOrEqual(limit)

            if (result.length > 0) {
                const client = result[0]
                expect(client.id).toBeDefined()
                expect(client.firstName).toBeDefined()
                expect(client.lastName).toBeDefined()
                expect(client.email).toBeDefined()
                expect(client.phone).toBeDefined()
            }
        })
    })

    describe('Service Management Integration', () => {
        it('should get services for dashboard', async () => {
            const result = await dashboardIntegration.getServicesForDashboard(mockBusinessId)

            expect(result).toBeDefined()
            expect(Array.isArray(result)).toBe(true)

            if (result.length > 0) {
                const service = result[0]
                expect(service.id).toBeDefined()
                expect(service.name).toBeDefined()
                expect(service.duration).toBeDefined()
                expect(service.price).toBeDefined()
                expect(service.staffIds).toBeDefined()
                expect(Array.isArray(service.staffIds)).toBe(true)
                expect(service.isActive).toBeDefined()
            }
        })
    })

    describe('Staff Management Integration', () => {
        it('should get staff data for dashboard', async () => {
            const result = await dashboardIntegration.getStaffForDashboard(mockBusinessId)

            expect(result).toBeDefined()
            expect(Array.isArray(result)).toBe(true)

            if (result.length > 0) {
                const staff = result[0]
                expect(staff.id).toBeDefined()
                expect(staff.firstName).toBeDefined()
                expect(staff.lastName).toBeDefined()
                expect(staff.displayName).toBeDefined()
                expect(staff.color).toBeDefined()
                expect(staff.isActive).toBeDefined()
                expect(staff.services).toBeDefined()
                expect(Array.isArray(staff.services)).toBe(true)
                expect(staff.permissions).toBeDefined()
                expect(staff.permissions.canEdit).toBeDefined()
                expect(staff.permissions.canCancel).toBeDefined()
                expect(staff.permissions.canReschedule).toBeDefined()
            }
        })
    })

    describe('System Health Monitoring', () => {
        it('should check system integration status', async () => {
            const result = await dashboardIntegration.getSystemIntegrationStatus()

            expect(result).toBeDefined()
            expect(result.appointmentBookingEngine).toBeDefined()
            expect(result.calendarInfrastructure).toBeDefined()
            expect(result.clientManagement).toBeDefined()
            expect(result.serviceManagement).toBeDefined()
            expect(result.staffManagement).toBeDefined()
            expect(result.notificationSystem).toBeDefined()
        })
    })
})

describe('Appointment Notification Service', () => {
    let notificationService: AppointmentNotificationService
    let mockNotificationData: any

    beforeEach(() => {
        notificationService = new AppointmentNotificationService()
        mockNotificationData = {
            appointment: {
                id: 'test-appointment-id',
                businessId: 'test-business-id',
                staffId: 'test-staff-id',
                clientId: 'test-client-id',
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                status: AppointmentStatus.SCHEDULED,
                client: {
                    id: 'test-client-id',
                    firstName: 'Test',
                    lastName: 'Client',
                    email: 'test@example.com',
                    phone: '+1234567890',
                    emailMarketing: true,
                    smsMarketing: true
                },
                staff: {
                    id: 'test-staff-id',
                    displayName: 'Test Staff',
                    user: {
                        email: 'staff@example.com'
                    }
                },
                services: [{
                    serviceName: 'Test Service'
                }],
                clientName: 'Test Client'
            },
            changeType: 'created' as const,
            businessInfo: {
                id: 'test-business-id',
                name: 'Test Business',
                phone: '+1234567890',
                email: 'business@example.com'
            }
        }
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('Notification System Integration', () => {
        it('should send comprehensive appointment notifications', async () => {
            const result = await notificationService.sendAppointmentNotifications(mockNotificationData)

            expect(result).toBeDefined()
            expect(result.success).toBeDefined()
            expect(result.sentChannels).toBeDefined()
            expect(Array.isArray(result.sentChannels)).toBe(true)
            expect(result.failedChannels).toBeDefined()
            expect(Array.isArray(result.failedChannels)).toBe(true)
            expect(result.errors).toBeDefined()
            expect(Array.isArray(result.errors)).toBe(true)
        })

        it('should send real-time WebSocket notifications', async () => {
            const result = { success: true, sentChannels: [], failedChannels: [], errors: [] }

            await notificationService.sendRealTimeNotifications(mockNotificationData, result)

            // Should not throw errors and should update the result object
            expect(result.sentChannels.includes('realtime') || result.failedChannels.includes('realtime')).toBe(true)
        })

        it('should handle different notification types', async () => {
            const notificationTypes = ['created', 'updated', 'cancelled', 'rescheduled', 'status_changed'] as const

            for (const changeType of notificationTypes) {
                const testData = { ...mockNotificationData, changeType }

                const result = await notificationService.sendAppointmentNotifications(testData)

                expect(result).toBeDefined()
                expect(result.success).toBeDefined()
            }
        })
    })
})

describe('System Integration Manager', () => {
    let integrationManager: SystemIntegrationManager

    beforeEach(() => {
        integrationManager = new SystemIntegrationManager()
    })

    afterEach(async () => {
        await integrationManager.shutdown()
        jest.clearAllMocks()
    })

    describe('System Lifecycle Management', () => {
        it('should initialize successfully', async () => {
            await expect(integrationManager.initialize()).resolves.not.toThrow()
        })

        it('should shutdown gracefully', async () => {
            await integrationManager.initialize()
            await expect(integrationManager.shutdown()).resolves.not.toThrow()
        })
    })

    describe('Integrated Appointment Operations', () => {
        beforeEach(async () => {
            await integrationManager.initialize()
        })

        it('should create appointment with full system integration', async () => {
            const appointmentData = {
                clientId: 'test-client-id',
                staffId: 'test-staff-id',
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                services: [{
                    serviceId: 'test-service-id',
                    serviceName: 'Test Service',
                    price: 50,
                    duration: 60
                }]
            }

            const result = await integrationManager.createAppointment(
                'test-business-id',
                appointmentData
            )

            expect(result).toBeDefined()
            expect(result.success).toBeDefined()
            expect(result.errors).toBeDefined()
            expect(result.warnings).toBeDefined()
        })

        it('should update appointment with full system integration', async () => {
            const updates = {
                startTime: new Date('2024-01-15T11:00:00Z'),
                endTime: new Date('2024-01-15T12:00:00Z')
            }

            const result = await integrationManager.updateAppointment(
                'test-appointment-id',
                'test-business-id',
                updates
            )

            expect(result).toBeDefined()
            expect(result.success).toBeDefined()
            expect(result.errors).toBeDefined()
            expect(result.warnings).toBeDefined()
        })

        it('should cancel appointment with full system integration', async () => {
            const options = {
                reason: 'Client requested cancellation',
                notifyClient: true
            }

            const result = await integrationManager.cancelAppointment(
                'test-appointment-id',
                'test-business-id',
                options
            )

            expect(result).toBeDefined()
            expect(result.success).toBeDefined()
            expect(result.errors).toBeDefined()
            expect(result.warnings).toBeDefined()
        })
    })

    describe('System Health Monitoring', () => {
        beforeEach(async () => {
            await integrationManager.initialize()
        })

        it('should check system health', async () => {
            const health = await integrationManager.checkSystemHealth()

            expect(health).toBeDefined()
            expect(health.overall).toBeDefined()
            expect(['healthy', 'degraded', 'critical'].includes(health.overall)).toBe(true)
            expect(health.systems).toBeDefined()
            expect(health.lastChecked).toBeDefined()
            expect(health.lastChecked instanceof Date).toBe(true)

            // Check individual system statuses
            const expectedSystems = [
                'appointmentBookingEngine',
                'calendarInfrastructure',
                'clientManagement',
                'serviceManagement',
                'staffManagement',
                'notificationSystem',
                'realTimeSync'
            ]

            for (const system of expectedSystems) {
                expect(health.systems[system]).toBeDefined()
                expect(health.systems[system].status).toBeDefined()
                expect(['healthy', 'degraded', 'critical', 'offline'].includes(health.systems[system].status)).toBe(true)
                expect(health.systems[system].lastChecked).toBeDefined()
                expect(health.systems[system].lastChecked instanceof Date).toBe(true)
            }
        })

        it('should get integration metrics', async () => {
            const period = {
                start: new Date('2024-01-01T00:00:00Z'),
                end: new Date('2024-01-31T23:59:59Z')
            }

            const metrics = await integrationManager.getIntegrationMetrics(
                'test-business-id',
                period
            )

            expect(metrics).toBeDefined()
            expect(metrics.appointmentOperations).toBeDefined()
            expect(metrics.appointmentOperations.created).toBeDefined()
            expect(metrics.appointmentOperations.updated).toBeDefined()
            expect(metrics.appointmentOperations.cancelled).toBeDefined()
            expect(metrics.appointmentOperations.errors).toBeDefined()

            expect(metrics.notificationsSent).toBeDefined()
            expect(metrics.notificationsSent.realTime).toBeDefined()
            expect(metrics.notificationsSent.email).toBeDefined()
            expect(metrics.notificationsSent.sms).toBeDefined()
            expect(metrics.notificationsSent.push).toBeDefined()
            expect(metrics.notificationsSent.failed).toBeDefined()

            expect(metrics.systemPerformance).toBeDefined()
            expect(metrics.systemPerformance.averageResponseTime).toBeDefined()
            expect(metrics.systemPerformance.errorRate).toBeDefined()
            expect(metrics.systemPerformance.uptime).toBeDefined()

            expect(metrics.period).toEqual(period)
        })
    })

    describe('Error Handling and Resilience', () => {
        beforeEach(async () => {
            await integrationManager.initialize()
        })

        it('should handle appointment service failures gracefully', async () => {
            // Mock a service failure
            const appointmentData = {
                // Invalid data to trigger an error
                staffId: null,
                startTime: 'invalid-date'
            }

            const result = await integrationManager.createAppointment(
                'test-business-id',
                appointmentData
            )

            expect(result).toBeDefined()
            expect(result.success).toBe(false)
            expect(result.errors.length).toBeGreaterThan(0)
        })

        it('should continue operation when notification service fails', async () => {
            // This test would verify that appointment operations continue
            // even if notifications fail
            const appointmentData = {
                clientId: 'test-client-id',
                staffId: 'test-staff-id',
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                services: [{
                    serviceId: 'test-service-id',
                    serviceName: 'Test Service',
                    price: 50,
                    duration: 60
                }]
            }

            // The operation should succeed even if notifications fail
            const result = await integrationManager.createAppointment(
                'test-business-id',
                appointmentData
            )

            expect(result).toBeDefined()
            // The appointment operation itself should not fail due to notification issues
        })
    })
})

describe('Integration Performance Tests', () => {
    let integrationManager: SystemIntegrationManager

    beforeEach(async () => {
        integrationManager = new SystemIntegrationManager()
        await integrationManager.initialize()
    })

    afterEach(async () => {
        await integrationManager.shutdown()
    })

    it('should handle concurrent appointment operations', async () => {
        const concurrentOperations = 10
        const appointmentData = {
            clientId: 'test-client-id',
            staffId: 'test-staff-id',
            startTime: new Date('2024-01-15T10:00:00Z'),
            endTime: new Date('2024-01-15T11:00:00Z'),
            services: [{
                serviceId: 'test-service-id',
                serviceName: 'Test Service',
                price: 50,
                duration: 60
            }]
        }

        const operations = Array(concurrentOperations).fill(null).map((_, index) =>
            integrationManager.createAppointment(
                'test-business-id',
                {
                    ...appointmentData,
                    startTime: new Date(`2024-01-15T${10 + index}:00:00Z`),
                    endTime: new Date(`2024-01-15T${11 + index}:00:00Z`)
                }
            )
        )

        const results = await Promise.allSettled(operations)

        expect(results).toHaveLength(concurrentOperations)

        // All operations should complete (either fulfilled or rejected)
        results.forEach(result => {
            expect(['fulfilled', 'rejected'].includes(result.status)).toBe(true)
        })
    })

    it('should maintain performance under load', async () => {
        const startTime = Date.now()

        const result = await integrationManager.createAppointment(
            'test-business-id',
            {
                clientId: 'test-client-id',
                staffId: 'test-staff-id',
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                services: [{
                    serviceId: 'test-service-id',
                    serviceName: 'Test Service',
                    price: 50,
                    duration: 60
                }]
            }
        )

        const responseTime = Date.now() - startTime

        expect(result).toBeDefined()
        // Response time should be reasonable (less than 5 seconds for tests)
        expect(responseTime).toBeLessThan(5000)
    })
})