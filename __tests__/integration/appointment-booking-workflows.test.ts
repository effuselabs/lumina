/**
 * End-to-End Appointment Booking Workflow Integration Tests
 * 
 * Comprehensive integration tests for complete appointment booking workflows,
 * including calendar infrastructure integration with LUM-96, multi-service
 * booking scenarios, and concurrent appointment operations.
 * 
 * Requirements: All requirements - comprehensive validation
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { DELETE as cancelAppointment, GET as getAppointmentById, PUT as updateAppointment } from '@/app/api/appointments/[id]/route'
import { POST as addServices } from '@/app/api/appointments/[id]/services/route'
import { PUT as updateStatus } from '@/app/api/appointments/[id]/status/route'
import { POST as checkConflicts } from '@/app/api/appointments/conflicts/route'
import { POST as createAppointment, GET as getAppointments } from '@/app/api/appointments/route'
import { POST as validateAppointment } from '@/app/api/appointments/validate/route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { AppointmentService } from '@/lib/services/appointment-service'
import { AppointmentStatusManager } from '@/lib/services/appointment-status-manager'
import { CalendarIntegration } from '@/lib/services/calendar-integration'
import { MultiServiceCoordinator } from '@/lib/services/multi-service-coordinator'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { AppointmentStatus } from '@prisma/client'
import { NextRequest } from 'next/server'
import { performance } from 'perf_hooks'
import { asMock, addMockMethod } from '@/__tests__/utils/prisma-mock-helpers'
import { 
    createTestAppointment, 
    createTestClient, 
    createTestStaff, 
    createTestService,
    createTestBusinessUser,
    createTestSession
} from '@/__tests__/utils/test-data-factories'

// Mock dependencies
jest.mock('@/auth')
jest.mock('@/lib/prisma', () => ({
    prisma: {
        businessUser: { findFirst: jest.fn() },
        staff: { findFirst: jest.fn(), findMany: jest.fn() },
        client: { findFirst: jest.fn() },
        service: { findMany: jest.fn() },
        appointment: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        },
        appointmentService: {
            createMany: jest.fn(),
            deleteMany: jest.fn()
        }
    }
}))

// Mock calendar infrastructure services
jest.mock('@/lib/services/calendar-integration')
jest.mock('@/lib/services/multi-service-coordinator')
jest.mock('@/lib/services/appointment-service')
jest.mock('@/lib/services/appointment-status-manager')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockCalendarIntegration = CalendarIntegration as jest.MockedClass<typeof CalendarIntegration>
const mockMultiServiceCoordinator = MultiServiceCoordinator as jest.MockedClass<typeof MultiServiceCoordinator>
const mockAppointmentService = AppointmentService as jest.MockedClass<typeof AppointmentService>
const mockAppointmentStatusManager = AppointmentStatusManager as jest.MockedClass<typeof AppointmentStatusManager>

// Test data setup using factories
const testData = {
    session: createTestSession({
        user: { id: 'user-123', email: 'test@example.com' }
    }),
    businessUser: createTestBusinessUser({
        id: 'bu-123',
        businessId: 'business-123',
        userId: 'user-123',
        role: 'MANAGER'
    }),
    staff: [
        createTestStaff({
            id: 'staff-123',
            businessId: 'business-123',
            displayName: 'John Doe',
            isActive: true
        }),
        createTestStaff({
            id: 'staff-456',
            businessId: 'business-123',
            displayName: 'Jane Smith',
            isActive: true
        })
    ],
    client: createTestClient({
        id: 'client-123',
        businessId: 'business-123',
        firstName: 'Test',
        lastName: 'Client',
        email: 'client@test.com',
        phone: '+1234567890'
    }),
    services: [
        createTestService({
            id: 'service-123',
            businessId: 'business-123',
            name: 'Haircut',
            price: 50,
            duration: 60,
            isActive: true
        }),
        createTestService({
            id: 'service-456',
            businessId: 'business-123',
            name: 'Styling',
            price: 30,
            duration: 30,
            isActive: true
        }),
        createTestService({
            id: 'service-789',
            businessId: 'business-123',
            name: 'Color Treatment',
            price: 120,
            duration: 120,
            isActive: true
        })
    ]
}

describe('End-to-End Appointment Booking Workflows', () => {
    let calendarIntegrationInstance: jest.Mocked<CalendarIntegration>
    let multiServiceCoordinatorInstance: jest.Mocked<MultiServiceCoordinator>
    let appointmentServiceInstance: jest.Mocked<AppointmentService>
    let statusManagerInstance: jest.Mocked<AppointmentStatusManager>

    beforeEach(() => {
        jest.clearAllMocks()

        // Setup mock instances with proper typing
        calendarIntegrationInstance = {} as any
        addMockMethod(calendarIntegrationInstance, 'checkAvailability')
        addMockMethod(calendarIntegrationInstance, 'detectConflicts')
        addMockMethod(calendarIntegrationInstance, 'validateServiceDuration')
        addMockMethod(calendarIntegrationInstance, 'invalidateAvailabilityCache')

        multiServiceCoordinatorInstance = {} as any
        addMockMethod(multiServiceCoordinatorInstance, 'validateMultiServiceBooking')
        addMockMethod(multiServiceCoordinatorInstance, 'calculateTotalDuration')
        addMockMethod(multiServiceCoordinatorInstance, 'calculateTotalPrice')
        addMockMethod(multiServiceCoordinatorInstance, 'optimizeServiceOrder')

        appointmentServiceInstance = {} as any
        addMockMethod(appointmentServiceInstance, 'createAppointment')
        addMockMethod(appointmentServiceInstance, 'getAppointments')
        addMockMethod(appointmentServiceInstance, 'getAppointmentById')
        addMockMethod(appointmentServiceInstance, 'updateAppointment')
        addMockMethod(appointmentServiceInstance, 'cancelAppointment')

        statusManagerInstance = {} as any
        addMockMethod(statusManagerInstance, 'updateStatus')
        addMockMethod(statusManagerInstance, 'getValidTransitions')
        addMockMethod(statusManagerInstance, 'validateStatusTransition')

        // Mock constructors to return instances
        mockCalendarIntegration.mockImplementation(() => calendarIntegrationInstance)
        mockMultiServiceCoordinator.mockImplementation(() => multiServiceCoordinatorInstance)
        mockAppointmentService.mockImplementation(() => appointmentServiceInstance)
        mockAppointmentStatusManager.mockImplementation(() => statusManagerInstance)

        // Setup default mocks
        mockAuth.mockResolvedValue(testData.session as any)
        asMock(mockPrisma.businessUser.findFirst).mockResolvedValue(testData.businessUser)
        asMock(mockPrisma.staff.findFirst).mockResolvedValue(testData.staff[0])
        asMock(mockPrisma.staff.findMany).mockResolvedValue(testData.staff)
        asMock(mockPrisma.client.findFirst).mockResolvedValue(testData.client)
        asMock(mockPrisma.service.findMany).mockResolvedValue(testData.services)
    })

    afterEach(() => {
        jest.resetAllMocks()
    })

    describe('Complete Single-Service Appointment Workflow', () => {
        it('should complete full appointment lifecycle: create → confirm → start → complete', async () => {
            const workflowStartTime = performance.now()

            // Step 1: Create appointment
            const appointmentData = {
                businessId: 'business-123',
                staffId: 'staff-123',
                clientId: 'client-123',
                startTime: '2024-12-01T10:00:00Z',
                endTime: '2024-12-01T11:00:00Z',
                services: [{
                    serviceId: 'service-123',
                    serviceName: 'Haircut',
                    price: 50,
                    duration: 60,
                    serviceOrder: 1,
                    startOffset: 0
                }]
            }

            const mockCreatedAppointment = createTestAppointment({
                id: 'appointment-123',
                businessId: appointmentData.businessId,
                staffId: appointmentData.staffId,
                clientId: appointmentData.clientId,
                startTime: new Date(appointmentData.startTime),
                endTime: new Date(appointmentData.endTime),
                status: AppointmentStatus.SCHEDULED,
                totalDuration: 60,
                totalPrice: 50,
                services: appointmentData.services.map(s => ({
                    id: `service-${s.serviceId}`,
                    appointmentId: 'appointment-123',
                    serviceId: s.serviceId,
                    serviceName: s.serviceName,
                    price: s.price,
                    duration: s.duration,
                    serviceOrder: s.serviceOrder,
                    startOffset: s.startOffset,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })),
                client: testData.client,
                staff: testData.staff[0]
            })

            // Mock calendar integration for creation
            (calendarIntegrationInstance as any).checkAvailability.mockResolvedValue({
                isAvailable: true,
                reason: 'Time slot available',
                alternatives: []
            })

            (calendarIntegrationInstance as any).detectConflicts.mockResolvedValue({
                hasConflicts: false,
                conflicts: [],
                warnings: []
            })

            (appointmentServiceInstance as any).createAppointment.mockResolvedValue({
                success: true,
                appointment: mockCreatedAppointment,
                errors: [],
                warnings: []
            })

            const createRequest = new NextRequest('http://localhost/api/appointments', {
                method: 'POST',
                body: JSON.stringify(appointmentData)
            })

            const createResponse = await createAppointment(createRequest)
            const createData = await createResponse.json()

            expect(createResponse.status).toBe(201)
            expect(createData.appointment.id).toBe('appointment-123')
            expect(createData.appointment.status).toBe(AppointmentStatus.SCHEDULED)

            // Step 2: Confirm appointment
            statusManagerInstance.updateStatus.mockResolvedValue({
                success: true,
                validTransitions: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELLED]
            })

            appointmentServiceInstance.getAppointmentById
                .mockResolvedValueOnce(mockCreatedAppointment)
                .mockResolvedValueOnce({
                    ...mockCreatedAppointment,
                    status: AppointmentStatus.CONFIRMED
                })

            const confirmRequest = new NextRequest('http://localhost/api/appointments/appointment-123/status?businessId=business-123', {
                method: 'PUT',
                body: JSON.stringify({
                    status: AppointmentStatus.CONFIRMED,
                    reason: 'Client confirmed',
                    changedBy: 'user-123'
                })
            })

            const confirmResponse = await updateStatus(confirmRequest, { params: { id: 'appointment-123' } })
            const confirmData = await confirmResponse.json()

            expect(confirmResponse.status).toBe(200)
            expect(confirmData.newStatus).toBe(AppointmentStatus.CONFIRMED)

            // Step 3: Start appointment (IN_PROGRESS)
            statusManagerInstance.updateStatus.mockResolvedValue({
                success: true,
                validTransitions: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]
            })

            appointmentServiceInstance.getAppointmentById
                .mockResolvedValueOnce({ ...mockCreatedAppointment, status: AppointmentStatus.CONFIRMED })
                .mockResolvedValueOnce({
                    ...mockCreatedAppointment,
                    status: AppointmentStatus.IN_PROGRESS,
                    startedAt: new Date()
                })

            const startRequest = new NextRequest('http://localhost/api/appointments/appointment-123/status?businessId=business-123', {
                method: 'PUT',
                body: JSON.stringify({
                    status: AppointmentStatus.IN_PROGRESS,
                    reason: 'Service started',
                    changedBy: 'user-123'
                })
            })

            const startResponse = await updateStatus(startRequest, { params: { id: 'appointment-123' } })
            const startData = await startResponse.json()

            expect(startResponse.status).toBe(200)
            expect(startData.newStatus).toBe(AppointmentStatus.IN_PROGRESS)

            // Step 4: Complete appointment
            statusManagerInstance.updateStatus.mockResolvedValue({
                success: true,
                validTransitions: []
            })

            appointmentServiceInstance.getAppointmentById
                .mockResolvedValueOnce({
                    ...mockCreatedAppointment,
                    status: AppointmentStatus.IN_PROGRESS,
                    startedAt: new Date()
                })
                .mockResolvedValueOnce({
                    ...mockCreatedAppointment,
                    status: AppointmentStatus.COMPLETED,
                    startedAt: new Date(),
                    completedAt: new Date()
                })

            const completeRequest = new NextRequest('http://localhost/api/appointments/appointment-123/status?businessId=business-123', {
                method: 'PUT',
                body: JSON.stringify({
                    status: AppointmentStatus.COMPLETED,
                    reason: 'Service completed',
                    changedBy: 'user-123'
                })
            })

            const completeResponse = await updateStatus(completeRequest, { params: { id: 'appointment-123' } })
            const completeData = await completeResponse.json()

            expect(completeResponse.status).toBe(200)
            expect(completeData.newStatus).toBe(AppointmentStatus.COMPLETED)

            const workflowEndTime = performance.now()
            const totalWorkflowTime = workflowEndTime - workflowStartTime

            // Verify workflow completed within performance threshold
            expect(totalWorkflowTime).toBeLessThan(2000) // 2 seconds for complete workflow

            console.log(`Complete Single-Service Workflow: ${totalWorkflowTime.toFixed(2)}ms`)
        })

        it('should handle appointment cancellation workflow with proper cleanup', async () => {
            const mockAppointment = createTestAppointment({
                id: 'appointment-456',
                businessId: 'business-123',
                status: AppointmentStatus.CONFIRMED
            })

            appointmentServiceInstance.getAppointmentById.mockResolvedValue(mockAppointment)
            appointmentServiceInstance.cancelAppointment.mockResolvedValue({
                success: true,
                appointment: { ...mockAppointment, status: AppointmentStatus.CANCELLED },
                errors: [],
                warnings: []
            })

            (calendarIntegrationInstance as any).invalidateAvailabilityCache.mockResolvedValue()

            const cancelRequest = new NextRequest('http://localhost/api/appointments/appointment-456?businessId=business-123', {
                method: 'DELETE',
                body: JSON.stringify({
                    reason: 'Client requested cancellation',
                    refundAmount: 25,
                    notifyClient: true
                })
            })

            const response = await cancelAppointment(cancelRequest, { params: { id: 'appointment-456' } })
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.appointment.status).toBe(AppointmentStatus.CANCELLED)
            expect(appointmentServiceInstance.cancelAppointment).toHaveBeenCalledWith(
                'appointment-456',
                'business-123',
                expect.objectContaining({
                    reason: 'Client requested cancellation',
                    refundAmount: 25,
                    notifyClient: true,
                    changedBy: 'user-123'
                })
            )
        })
    })

    describe('Multi-Service Appointment Workflows', () => {
        it('should complete complex multi-service appointment booking with staff coordination', async () => {
            const multiServiceData = {
                businessId: 'business-123',
                staffId: 'staff-123',
                clientId: 'client-123',
                startTime: '2024-12-01T10:00:00Z',
                endTime: '2024-12-01T13:00:00Z',
                services: [
                    {
                        serviceId: 'service-123',
                        serviceName: 'Haircut',
                        price: 50,
                        duration: 60,
                        serviceOrder: 1,
                        startOffset: 0,
                        assignedStaffId: 'staff-123'
                    },
                    {
                        serviceId: 'service-456',
                        serviceName: 'Styling',
                        price: 30,
                        duration: 30,
                        serviceOrder: 2,
                        startOffset: 60,
                        assignedStaffId: 'staff-123'
                    },
                    {
                        serviceId: 'service-789',
                        serviceName: 'Color Treatment',
                        price: 120,
                        duration: 120,
                        serviceOrder: 3,
                        startOffset: 90,
                        assignedStaffId: 'staff-456'
                    }
                ]
            }

            // Mock multi-service validation
            (multiServiceCoordinatorInstance as any).validateMultiServiceBooking.mockResolvedValue({
                isValid: true,
                errors: [],
                warnings: ['Long appointment duration'],
                optimizedServices: multiServiceData.services,
                totalDuration: 210
            })

            (multiServiceCoordinatorInstance as any).calculateTotalDuration.mockResolvedValue(210)
            (multiServiceCoordinatorInstance as any).calculateTotalPrice.mockResolvedValue(200)

            // Mock calendar integration
            (calendarIntegrationInstance as any).checkAvailability.mockResolvedValue({
                isAvailable: true,
                reason: 'All staff available for required duration',
                alternatives: []
            })

            (calendarIntegrationInstance as any).detectConflicts.mockResolvedValue({
                hasConflicts: false,
                conflicts: [],
                warnings: []
            })

            const mockMultiServiceAppointment = {
                id: 'appointment-multi-123',
                ...multiServiceData,
                status: AppointmentStatus.SCHEDULED,
                totalDuration: 210,
                totalPrice: 200,
                createdAt: new Date(),
                updatedAt: new Date()
            }

            appointmentServiceInstance.createAppointment.mockResolvedValue({
                success: true,
                appointment: mockMultiServiceAppointment,
                errors: [],
                warnings: ['Long appointment duration']
            })

            const createRequest = new NextRequest('http://localhost/api/appointments', {
                method: 'POST',
                body: JSON.stringify(multiServiceData)
            })

            const response = await createAppointment(createRequest)
            const data = await response.json()

            expect(response.status).toBe(201)
            expect(data.appointment.services).toHaveLength(3)
            expect(data.appointment.totalDuration).toBe(210)
            expect(data.appointment.totalPrice).toBe(200)
            expect(data.warnings).toContain('Long appointment duration')

            // Verify multi-service coordination was called
            expect(multiServiceCoordinatorInstance.validateMultiServiceBooking).toHaveBeenCalledWith(
                multiServiceData.services,
                expect.any(Object),
                'staff-123'
            )
        })

        it('should handle adding services to existing appointment', async () => {
            const existingAppointment = {
                id: 'appointment-789',
                businessId: 'business-123',
                services: [{
                    id: 'as-123',
                    serviceId: 'service-123',
                    serviceName: 'Haircut',
                    price: { toNumber: () => 50 },
                    duration: 60,
                    serviceOrder: 1
                }],
                totalDuration: 60,
                totalPrice: 50
            }

            const additionalServices = {
                services: [{
                    serviceId: 'service-456',
                    serviceName: 'Styling',
                    price: 30,
                    duration: 30,
                    serviceOrder: 2,
                    startOffset: 60
                }]
            }

            appointmentServiceInstance.getAppointmentById.mockResolvedValue(existingAppointment)
            appointmentServiceInstance.updateAppointment.mockResolvedValue({
                success: true,
                appointment: {
                    ...existingAppointment,
                    services: [...existingAppointment.services, additionalServices.services[0]],
                    totalDuration: 90,
                    totalPrice: 80
                },
                errors: [],
                warnings: []
            })

            const addServicesRequest = new NextRequest('http://localhost/api/appointments/appointment-789/services?businessId=business-123', {
                method: 'POST',
                body: JSON.stringify(additionalServices)
            })

            const response = await addServices(addServicesRequest, { params: { id: 'appointment-789' } })
            const data = await response.json()

            expect(response.status).toBe(201)
            expect(data.message).toBe('Services added successfully')
            expect(data.addedServices).toEqual(additionalServices.services)
        })
    })

    describe('Calendar Infrastructure Integration Workflows', () => {
        it('should integrate with LUM-96 availability calculation throughout booking process', async () => {
            const appointmentData = {
                businessId: 'business-123',
                staffId: 'staff-123',
                clientId: 'client-123',
                startTime: '2024-12-01T14:00:00Z',
                endTime: '2024-12-01T15:00:00Z',
                services: [{ serviceId: 'service-123' }]
            }

            // Step 1: Validate appointment before creation
            (calendarIntegrationInstance as any).checkAvailability.mockResolvedValue({
                isAvailable: true,
                reason: 'Staff available during requested time',
                alternatives: []
            })

            (calendarIntegrationInstance as any).detectConflicts.mockResolvedValue({
                hasConflicts: false,
                conflicts: [],
                warnings: []
            })

            (calendarIntegrationInstance as any).validateServiceDuration.mockResolvedValue({
                isValid: true,
                reason: 'Service duration matches time slot'
            })

            (multiServiceCoordinatorInstance as any).validateMultiServiceBooking.mockResolvedValue({
                isValid: true,
                errors: [],
                warnings: [],
                optimizedServices: appointmentData.services,
                totalDuration: 60
            })

            const validateRequest = new NextRequest('http://localhost/api/appointments/validate', {
                method: 'POST',
                body: JSON.stringify(appointmentData)
            })

            const validateResponse = await validateAppointment(validateRequest)
            const validateData = await validateResponse.json()

            expect(validateResponse.status).toBe(200)
            expect(validateData.isValid).toBe(true)
            expect(validateData.validations.availabilityValidation.passed).toBe(true)
            expect(validateData.validations.conflictValidation.passed).toBe(true)
            expect(validateData.validations.durationValidation.passed).toBe(true)

            // Step 2: Create appointment with LUM-96 integration
            appointmentServiceInstance.createAppointment.mockResolvedValue({
                success: true,
                appointment: {
                    id: 'appointment-lum96-123',
                    ...appointmentData,
                    status: AppointmentStatus.SCHEDULED
                },
                errors: [],
                warnings: []
            })

            const createRequest = new NextRequest('http://localhost/api/appointments', {
                method: 'POST',
                body: JSON.stringify(appointmentData)
            })

            const createResponse = await createAppointment(createRequest)
            expect(createResponse.status).toBe(201)

            // Verify LUM-96 integration calls
            expect(calendarIntegrationInstance.checkAvailability).toHaveBeenCalledWith(
                'staff-123',
                expect.any(Object),
                ['service-123']
            )
            expect(calendarIntegrationInstance.detectConflicts).toHaveBeenCalled()
            expect(calendarIntegrationInstance.validateServiceDuration).toHaveBeenCalled()
        })

        it('should handle LUM-96 conflict detection and provide alternatives', async () => {
            const conflictingAppointmentData = {
                businessId: 'business-123',
                staffId: 'staff-123',
                startTime: '2024-12-01T10:00:00Z',
                endTime: '2024-12-01T11:00:00Z',
                serviceIds: ['service-123']
            }

            // Mock conflict detection
            (calendarIntegrationInstance as any).detectConflicts.mockResolvedValue({
                hasConflicts: true,
                conflicts: [{
                    type: 'SCHEDULING_CONFLICT',
                    severity: 'HIGH',
                    message: 'Overlapping appointment found',
                    details: {
                        appointmentId: 'existing-appointment-123',
                        startTime: new Date('2024-12-01T10:30:00Z'),
                        endTime: new Date('2024-12-01T11:30:00Z'),
                        clientName: 'Existing Client',
                        staffName: 'John Doe',
                        serviceName: 'Existing Service'
                    }
                }],
                warnings: []
            })

            (calendarIntegrationInstance as any).checkAvailability.mockResolvedValue({
                isAvailable: false,
                reason: 'Time slot conflicts with existing appointment',
                alternatives: [
                    {
                        startTime: new Date('2024-12-01T11:30:00Z'),
                        endTime: new Date('2024-12-01T12:30:00Z'),
                        staffId: 'staff-123',
                        reason: 'Next available slot'
                    },
                    {
                        startTime: new Date('2024-12-01T10:00:00Z'),
                        endTime: new Date('2024-12-01T11:00:00Z'),
                        staffId: 'staff-456',
                        reason: 'Alternative staff member'
                    }
                ]
            })

            const conflictRequest = new NextRequest('http://localhost/api/appointments/conflicts', {
                method: 'POST',
                body: JSON.stringify(conflictingAppointmentData)
            })

            const response = await checkConflicts(conflictRequest)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.hasConflicts).toBe(true)
            expect(data.conflicts.hasConflicts).toBe(true)
            expect(data.conflicts.conflicts).toHaveLength(1)
            expect(data.availability.alternatives).toHaveLength(2)
            expect(data.availability.alternatives[0].reason).toBe('Next available slot')
        })

        it('should coordinate cache invalidation with LUM-96 after appointment changes', async () => {
            const appointmentId = 'appointment-cache-123'
            const updateData = {
                businessId: 'business-123',
                startTime: '2024-12-01T15:00:00Z',
                endTime: '2024-12-01T16:00:00Z'
            }

            const existingAppointment = {
                id: appointmentId,
                businessId: 'business-123',
                staffId: 'staff-123',
                startTime: new Date('2024-12-01T14:00:00Z'),
                endTime: new Date('2024-12-01T15:00:00Z')
            }

            appointmentServiceInstance.getAppointmentById.mockResolvedValue(existingAppointment)
            appointmentServiceInstance.updateAppointment.mockResolvedValue({
                success: true,
                appointment: { ...existingAppointment, ...updateData },
                errors: [],
                warnings: []
            })

            (calendarIntegrationInstance as any).invalidateAvailabilityCache.mockResolvedValue()

            const updateRequest = new NextRequest(`http://localhost/api/appointments/${appointmentId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            })

            const response = await updateAppointment(updateRequest, { params: { id: appointmentId } })
            expect(response.status).toBe(200)

            // Verify cache invalidation was triggered
            expect(calendarIntegrationInstance.invalidateAvailabilityCache).toHaveBeenCalledWith(
                'staff-123',
                expect.any(Object)
            )
        })
    })

    describe('Concurrent Appointment Operations', () => {
        it('should handle concurrent appointment creation without conflicts', async () => {
            const concurrentRequests = 10
            const baseTime = new Date('2024-12-01T10:00:00Z')

            const appointmentRequests = Array.from({ length: concurrentRequests }, (_, i) => {
                const startTime = new Date(baseTime.getTime() + i * 60 * 60 * 1000) // 1 hour apart
                const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1 hour duration

                return {
                    businessId: 'business-123',
                    staffId: i % 2 === 0 ? 'staff-123' : 'staff-456', // Alternate staff
                    clientId: 'client-123',
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    services: [{
                        serviceId: 'service-123',
                        serviceName: 'Haircut',
                        price: 50,
                        duration: 60,
                        serviceOrder: 1,
                        startOffset: 0
                    }]
                }
            })

            // Mock successful creation for all requests
            (calendarIntegrationInstance as any).checkAvailability.mockResolvedValue({
                isAvailable: true,
                reason: 'Time slots available',
                alternatives: []
            })

            (calendarIntegrationInstance as any).detectConflicts.mockResolvedValue({
                hasConflicts: false,
                conflicts: [],
                warnings: []
            })

            appointmentRequests.forEach((_: any, i: number) => {
                appointmentServiceInstance.createAppointment.mockResolvedValueOnce({
                    success: true,
                    appointment: {
                        id: `concurrent-appointment-${i}`,
                        ...appointmentRequests[i],
                        status: AppointmentStatus.SCHEDULED,
                        totalDuration: 60,
                        totalPrice: 50,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                    errors: [],
                    warnings: []
                })
            })

            const startTime = performance.now()

            const responses = await Promise.all(
                appointmentRequests.map((appointmentData: any) => {
                    const request = new NextRequest('http://localhost/api/appointments', {
                        method: 'POST',
                        body: JSON.stringify(appointmentData)
                    })
                    return createAppointment(request)
                })
            )

            const endTime = performance.now()
            const totalTime = endTime - startTime

            // All requests should succeed
            responses.forEach((response: any) => {
                expect(response.status).toBe(201)
            })

            // Should complete within reasonable time
            expect(totalTime).toBeLessThan(3000) // 3 seconds for 10 concurrent requests

            console.log(`Concurrent Creation Test: ${concurrentRequests} requests in ${totalTime.toFixed(2)}ms`)
        })

        it('should handle concurrent status updates with proper synchronization', async () => {
            const appointmentId = 'appointment-concurrent-status'
            const concurrentStatusUpdates = 5

            const existingAppointment = {
                id: appointmentId,
                businessId: 'business-123',
                status: AppointmentStatus.SCHEDULED
            }

            appointmentServiceInstance.getAppointmentById.mockResolvedValue(existingAppointment)

            // Mock status manager to handle concurrent updates
            let updateCount = 0
            statusManagerInstance.updateStatus.mockImplementation(async () => {
                updateCount++
                if (updateCount === 1) {
                    return { success: true, validTransitions: [] }
                } else {
                    return {
                        success: false,
                        error: 'Concurrent modification detected',
                        validTransitions: []
                    }
                }
            })

            const statusUpdateRequests = Array.from({ length: concurrentStatusUpdates }, () => ({
                status: AppointmentStatus.CONFIRMED,
                reason: 'Concurrent update test',
                changedBy: 'user-123'
            }))

            const responses = await Promise.all(
                statusUpdateRequests.map(updateData => {
                    const request = new NextRequest(`http://localhost/api/appointments/${appointmentId}/status?businessId=business-123`, {
                        method: 'PUT',
                        body: JSON.stringify(updateData)
                    })
                    return updateStatus(request, { params: { id: appointmentId } })
                })
            )

            // Only one update should succeed, others should fail gracefully
            const successfulUpdates = responses.filter(response => response.status === 200)
            const failedUpdates = responses.filter(response => response.status !== 200)

            expect(successfulUpdates).toHaveLength(1)
            expect(failedUpdates).toHaveLength(concurrentStatusUpdates - 1)
        })
    })

    describe('Performance Validation', () => {
        it('should maintain sub-500ms response times for appointment operations', async () => {
            const operations = [
                {
                    name: 'Create Appointment',
                    threshold: 500,
                    operation: async () => {
                        appointmentServiceInstance.createAppointment.mockResolvedValue({
                            success: true,
                            appointment: { id: 'perf-test-123' },
                            errors: [],
                            warnings: []
                        })

                        const request = new NextRequest('http://localhost/api/appointments', {
                            method: 'POST',
                            body: JSON.stringify({
                                businessId: 'business-123',
                                staffId: 'staff-123',
                                clientId: 'client-123',
                                startTime: '2024-12-01T10:00:00Z',
                                endTime: '2024-12-01T11:00:00Z',
                                services: [{ serviceId: 'service-123' }]
                            })
                        })

                        return createAppointment(request)
                    }
                },
                {
                    name: 'Get Appointments',
                    threshold: 300,
                    operation: async () => {
                        appointmentServiceInstance.getAppointments.mockResolvedValue({
                            appointments: [],
                            total: 0,
                            hasMore: false
                        })

                        const request = new NextRequest('http://localhost/api/appointments?businessId=business-123&limit=20')
                        return getAppointments(request)
                    }
                },
                {
                    name: 'Get Appointment by ID',
                    threshold: 200,
                    operation: async () => {
                        appointmentServiceInstance.getAppointmentById.mockResolvedValue({
                            id: 'perf-test-123',
                            businessId: 'business-123'
                        })

                        const request = new NextRequest('http://localhost/api/appointments/perf-test-123?businessId=business-123')
                        return getAppointmentById(request, { params: { id: 'perf-test-123' } })
                    }
                }
            ]

            for (const { name, threshold, operation } of operations) {
                const startTime = performance.now()
                const response = await operation()
                const endTime = performance.now()
                const duration = endTime - startTime

                expect(response.status).toBeLessThan(400) // Should be successful
                expect(duration).toBeLessThan(threshold)

                console.log(`${name}: ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`)
            }
        })

        it('should handle load testing scenarios efficiently', async () => {
            const loadTestRequests = 50
            const maxConcurrentRequests = 10

            // Setup mocks for load testing
            (calendarIntegrationInstance as any).checkAvailability.mockResolvedValue({
                isAvailable: true,
                reason: 'Available',
                alternatives: []
            })

            appointmentServiceInstance.getAppointments.mockResolvedValue({
                appointments: Array.from({ length: 20 }, (_, i) => ({
                    id: `load-test-${i}`,
                    businessId: 'business-123'
                })),
                total: 20,
                hasMore: false
            })

            const requests = Array.from({ length: loadTestRequests }, (_, i) => ({
                url: `http://localhost/api/appointments?businessId=business-123&limit=20&offset=${i * 20}`,
                method: 'GET'
            }))

            // Process requests in batches to simulate realistic load
            const batches = []
            for (let i = 0; i < requests.length; i += maxConcurrentRequests) {
                batches.push(requests.slice(i, i + maxConcurrentRequests))
            }

            const startTime = performance.now()
            let totalSuccessful = 0

            for (const batch of batches) {
                const batchPromises = batch.map(({ url }) => {
                    const request = new NextRequest(url)
                    return getAppointments(request)
                })

                const batchResponses = await Promise.all(batchPromises)
                const successfulInBatch = batchResponses.filter(response => response.status === 200).length
                totalSuccessful += successfulInBatch
            }

            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalSuccessful).toBe(loadTestRequests)
            expect(totalTime).toBeLessThan(5000) // Should complete within 5 seconds

            const averageResponseTime = totalTime / loadTestRequests
            expect(averageResponseTime).toBeLessThan(100) // Average should be under 100ms

            console.log(`Load Test: ${loadTestRequests} requests in ${totalTime.toFixed(2)}ms (avg: ${averageResponseTime.toFixed(2)}ms)`)
        })
    })
})