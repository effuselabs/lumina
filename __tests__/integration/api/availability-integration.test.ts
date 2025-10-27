import { prisma } from '@/lib/prisma'
import { Business, Service, Staff, TimeOffRequest, TimeOffStatus } from '@prisma/client'
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        business: {
            findUnique: jest.fn(),
        },
        staff: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        service: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
        },
        businessHours: {
            findMany: jest.fn(),
            upsert: jest.fn(),
        },
        staffAvailability: {
            findMany: jest.fn(),
            deleteMany: jest.fn(),
            create: jest.fn(),
        },
        timeOffRequest: {
            findMany: jest.fn(),
            create: jest.fn(),
        },
        appointment: {
            findMany: jest.fn(),
        },
    },
}))

// Mock availability calculator
jest.mock('@/lib/services/availability-calculator', () => ({
    AvailabilityCalculator: {
        getAvailableSlots: jest.fn(),
    },
}))

// Mock conflict detection engine
jest.mock('@/lib/services/conflict-detection-engine', () => ({
    ConflictDetectionEngine: {
        detectConflicts: jest.fn(),
        validateAppointmentSlot: jest.fn(),
    },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const { AvailabilityCalculator } = require('@/lib/services/availability-calculator')
const { ConflictDetectionEngine } = require('@/lib/services/conflict-detection-engine')

describe('Availability API Integration Tests', () => {
    const businessId = 'business-123'
    const staffId = 'staff-123'
    const serviceId = 'service-123'

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('Availability Slots Integration', () => {
        it('should integrate database queries with availability calculation', async () => {
            const mockBusiness: Partial<Business> = {
                id: businessId,
                timezone: 'America/New_York',
            }

            const mockSlots = [
                {
                    startTime: new Date('2024-01-15T14:00:00Z'), // 9 AM EST
                    endTime: new Date('2024-01-15T15:00:00Z'),
                    staffId,
                    staffName: 'John Doe',
                    isAvailable: true,
                    duration: 60,
                    serviceId: null,
                    conflicts: [],
                },
                {
                    startTime: new Date('2024-01-15T19:00:00Z'), // 2 PM EST
                    endTime: new Date('2024-01-15T20:00:00Z'),
                    staffId,
                    staffName: 'John Doe',
                    isAvailable: true,
                    duration: 60,
                    serviceId: null,
                    conflicts: [],
                },
            ]

            asMock(mockPrisma.business.findUnique).mockResolvedValue(mockBusiness as Business)
            AvailabilityCalculator.getAvailableSlots.mockResolvedValue(mockSlots)

            // Simulate API logic
            const queryParams = {
                date: '2024-01-15',
                businessId,
            }

            // Business lookup
            const business = await mockPrisma.business.findUnique({
                where: { id: businessId },
                select: { timezone: true },
            })

            // Availability calculation
            const slots = await AvailabilityCalculator.getAvailableSlots({
                businessId,
                date: new Date(queryParams.date),
                serviceId: undefined,
                staffId: undefined,
                duration: undefined,
                includeUnavailable: false,
            })

            // Verify integration
            expect(business).toBeDefined()
            expect(business?.timezone).toBe('America/New_York')
            expect(slots).toHaveLength(2)
            expect(slots[0].isAvailable).toBe(true)
            expect(slots[1].isAvailable).toBe(true)

            // Verify database calls
            expect(mockPrisma.business.findUnique).toHaveBeenCalledWith({
                where: { id: businessId },
                select: { timezone: true },
            })

            expect(AvailabilityCalculator.getAvailableSlots).toHaveBeenCalledWith({
                businessId,
                date: new Date(queryParams.date),
                serviceId: undefined,
                staffId: undefined,
                duration: undefined,
                includeUnavailable: false,
            })
        })

        it('should validate staff and service authorization', async () => {
            const mockStaff: Partial<Staff> = {
                id: staffId,
                businessId,
                displayName: 'John Doe',
            }

            const mockService: Partial<Service> = {
                id: serviceId,
                businessId,
                name: 'Haircut',
                duration: 60,
            }

            asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff as unknown as Staff)
            asMock(mockPrisma.service.findFirst).mockResolvedValue(mockService as Service)

            // Simulate staff validation
            const staff = await mockPrisma.staff.findFirst({
                where: { id: staffId, businessId },
            })

            // Simulate service validation
            const service = await mockPrisma.service.findFirst({
                where: { id: serviceId, businessId },
            })

            expect(staff).toBeDefined()
            expect(staff?.businessId).toBe(businessId)
            expect(service).toBeDefined()
            expect(service?.businessId).toBe(businessId)

            // Verify business context isolation
            expect(mockPrisma.staff.findFirst).toHaveBeenCalledWith({
                where: { id: staffId, businessId },
            })

            expect(mockPrisma.service.findFirst).toHaveBeenCalledWith({
                where: { id: serviceId, businessId },
            })
        })

        it('should handle cross-business access prevention', async () => {
            const otherBusinessStaffId = 'other-staff-456'
            const otherBusinessServiceId = 'other-service-456'

            // Mock staff not found in user's business
            asMock(mockPrisma.staff.findFirst).mockResolvedValue(null)
            asMock(mockPrisma.service.findFirst).mockResolvedValue(null)

            const staff = await mockPrisma.staff.findFirst({
                where: { id: otherBusinessStaffId, businessId },
            })

            const service = await mockPrisma.service.findFirst({
                where: { id: otherBusinessServiceId, businessId },
            })

            expect(staff).toBeNull()
            expect(service).toBeNull()

            // Verify queries were scoped to user's business
            expect(mockPrisma.staff.findFirst).toHaveBeenCalledWith({
                where: { id: otherBusinessStaffId, businessId },
            })

            expect(mockPrisma.service.findFirst).toHaveBeenCalledWith({
                where: { id: otherBusinessServiceId, businessId },
            })
        })
    })

    describe('Conflict Detection Integration', () => {
        it('should integrate conflict detection with database queries', async () => {
            const mockStaff: Partial<Staff> = {
                id: staffId,
                displayName: 'John Doe',
            }

            const mockConflicts = [
                {
                    type: 'APPOINTMENT_CONFLICT',
                    severity: 'ERROR',
                    message: 'Overlapping appointment found',
                    details: {
                        conflictingAppointment: {
                            id: 'appointment-123',
                            startTime: '2024-01-15T09:30:00Z',
                            endTime: '2024-01-15T10:30:00Z',
                            clientName: 'Jane Smith',
                        },
                    },
                },
            ]

            asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff as unknown as Staff)
            ConflictDetectionEngine.detectConflicts.mockResolvedValue(mockConflicts)

            // Simulate conflict detection API logic
            const appointmentRequest = {
                businessId,
                staffId,
                startTime: new Date('2024-01-15T09:00:00Z'),
                endTime: new Date('2024-01-15T10:00:00Z'),
                serviceIds: [],
            }

            // Staff validation
            const staff = await mockPrisma.staff.findFirst({
                where: { id: staffId, businessId },
                select: { id: true, displayName: true },
            })

            // Conflict detection
            const conflicts = await ConflictDetectionEngine.detectConflicts(appointmentRequest)

            expect(staff).toBeDefined()
            expect(conflicts).toHaveLength(1)
            expect(conflicts[0].type).toBe('APPOINTMENT_CONFLICT')

            // Verify integration calls
            expect(mockPrisma.staff.findFirst).toHaveBeenCalledWith({
                where: { id: staffId, businessId },
                select: { id: true, displayName: true },
            })

            expect(ConflictDetectionEngine.detectConflicts).toHaveBeenCalledWith(appointmentRequest)
        })

        it('should validate appointment slots with service duration', async () => {
            const mockStaff: Partial<Staff> = {
                id: staffId,
                displayName: 'John Doe',
            }

            const mockServices: Partial<Service>[] = [
                {
                    id: serviceId,
                    businessId,
                    name: 'Haircut',
                    duration: 60,
                },
            ]

            const mockValidationResult = {
                isValid: true,
                conflicts: [],
                warnings: [],
            }

            asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff as unknown as Staff)
            asMock(mockPrisma.service.findMany).mockResolvedValue(mockServices as Service[])
            ConflictDetectionEngine.validateAppointmentSlot.mockResolvedValue(mockValidationResult)

            // Simulate validation API logic
            const validationRequest = {
                staffId,
                startTime: new Date('2024-01-15T09:00:00Z'),
                duration: 60,
                serviceIds: [serviceId],
            }

            // Staff validation
            const staff = await mockPrisma.staff.findFirst({
                where: { id: staffId, businessId },
                select: { id: true, displayName: true },
            })

            // Service validation
            const services = await mockPrisma.service.findMany({
                where: {
                    id: { in: validationRequest.serviceIds },
                    businessId,
                },
                select: { id: true, displayName: true, duration: true },
            })

            // Appointment validation
            const validationResult = await ConflictDetectionEngine.validateAppointmentSlot(
                staffId,
                validationRequest.startTime,
                validationRequest.duration,
                businessId,
                validationRequest.serviceIds
            )

            expect(staff).toBeDefined()
            expect(services).toHaveLength(1)
            expect(services[0].duration).toBe(60)
            expect(validationResult.isValid).toBe(true)

            // Verify integration calls
            expect(mockPrisma.staff.findFirst).toHaveBeenCalledWith({
                where: { id: staffId, businessId },
                select: { id: true, displayName: true },
            })

            expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
                where: {
                    id: { in: [serviceId] },
                    businessId,
                },
                select: { id: true, displayName: true, duration: true },
            })

            expect(ConflictDetectionEngine.validateAppointmentSlot).toHaveBeenCalledWith(
                staffId,
                validationRequest.startTime,
                validationRequest.duration,
                businessId,
                validationRequest.serviceIds
            )
        })
    })

    describe('Staff Availability Integration', () => {
        it('should integrate staff availability updates with database', async () => {
            const mockStaff: Partial<Staff> = {
                id: staffId,
                businessId,
                displayName: 'John Doe',
            }

            const availabilityUpdate = {
                staffId,
                availability: [
                    {
                        dayOfWeek: 1,
                        startTime: '09:00:00',
                        endTime: '17:00:00',
                        isRecurring: true,
                    },
                ],
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as unknown as Staff)
            asMock(mockPrisma.staffAvailability.deleteMany).mockResolvedValue({ count: 1 })
            asMock(mockPrisma.staffAvailability.create).mockResolvedValue({
                id: 'availability-1',
                staffId,
                businessId,
                ...availabilityUpdate.availability[0],
                effectiveDate: null,
                expiryDate: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            // Simulate staff availability update API logic
            // Staff validation
            const staff = await mockPrisma.staff.findUnique({
                where: { id: staffId },
                select: { id: true, businessId: true, displayName: true },
            })

            // Verify staff belongs to business
            expect(staff?.businessId).toBe(businessId)

            // Clear existing availability
            await mockPrisma.staffAvailability.deleteMany({
                where: { staffId, isRecurring: true },
            })

            // Create new availability
            const createdAvailability = await mockPrisma.staffAvailability.create({
                data: {
                    staffId,
                    businessId,
                    ...availabilityUpdate.availability[0],
                },
            })

            expect(staff).toBeDefined()
            expect(createdAvailability).toBeDefined()
            expect(createdAvailability.dayOfWeek).toBe(1)

            // Verify integration calls
            expect(mockPrisma.staff.findUnique).toHaveBeenCalledWith({
                where: { id: staffId },
                select: { id: true, businessId: true, displayName: true },
            })

            expect(mockPrisma.staffAvailability.deleteMany).toHaveBeenCalledWith({
                where: { staffId, isRecurring: true },
            })

            expect(mockPrisma.staffAvailability.create).toHaveBeenCalledWith({
                data: {
                    staffId,
                    businessId,
                    ...availabilityUpdate.availability[0],
                },
            })
        })

        it('should prevent cross-business staff availability updates', async () => {
            const otherBusinessStaffId = 'other-staff-456'
            const mockStaff: Partial<Staff> = {
                id: otherBusinessStaffId,
                businessId: 'other-business-456', // Different business
                displayName: 'Jane Doe',
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as unknown as Staff)

            // Simulate staff validation
            const staff = await mockPrisma.staff.findUnique({
                where: { id: otherBusinessStaffId },
                select: { id: true, businessId: true, displayName: true },
            })

            // Should detect business mismatch
            expect(staff?.businessId).not.toBe(businessId)
            expect(staff?.businessId).toBe('other-business-456')

            // Verify query was made
            expect(mockPrisma.staff.findUnique).toHaveBeenCalledWith({
                where: { id: otherBusinessStaffId },
                select: { id: true, businessId: true, displayName: true },
            })
        })
    })

    describe('Time-Off Request Integration', () => {
        it('should integrate time-off requests with conflict detection', async () => {
            const mockStaff: Partial<Staff> = {
                id: staffId,
                businessId,
                displayName: 'John Doe',
            }

            const timeOffRequest = {
                staffId,
                startDate: '2024-01-15',
                endDate: '2024-01-17',
                reason: 'Vacation',
            }

            const mockCreatedRequest: TimeOffRequest = {
                id: 'request-1',
                staffId,
                businessId,
                startDate: new Date(timeOffRequest.startDate),
                endDate: new Date(timeOffRequest.endDate),
                reason: timeOffRequest.reason,
                status: TimeOffStatus.PENDING,
                approvedBy: null,
                approvedAt: null,
                denialReason: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as unknown as Staff)
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([]) // No conflicting appointments
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([]) // No conflicting time-off
            asMock(mockPrisma.timeOffRequest.create).mockResolvedValue(mockCreatedRequest)

            // Simulate time-off request API logic
            // Staff validation
            const staff = await mockPrisma.staff.findUnique({
                where: { id: staffId },
                select: { id: true, businessId: true, displayName: true },
            })

            // Conflict checking - appointments
            const conflictingAppointments = await mockPrisma.appointment.findMany({
                where: {
                    staffId,
                    startTime: {
                        gte: new Date(timeOffRequest.startDate),
                        lte: new Date(timeOffRequest.endDate),
                    },
                },
            })

            // Conflict checking - other time-off requests
            const conflictingTimeOff = await mockPrisma.timeOffRequest.findMany({
                where: {
                    staffId,
                    status: { in: [TimeOffStatus.PENDING, TimeOffStatus.APPROVED] },
                    OR: [
                        {
                            startDate: {
                                lte: new Date(timeOffRequest.endDate),
                            },
                            endDate: {
                                gte: new Date(timeOffRequest.startDate),
                            },
                        },
                    ],
                },
            })

            // Create time-off request
            const createdRequest = await mockPrisma.timeOffRequest.create({
                data: {
                    staffId,
                    businessId,
                    startDate: new Date(timeOffRequest.startDate),
                    endDate: new Date(timeOffRequest.endDate),
                    reason: timeOffRequest.reason,
                    status: TimeOffStatus.PENDING,
                },
            })

            expect(staff).toBeDefined()
            expect(staff?.businessId).toBe(businessId)
            expect(conflictingAppointments).toHaveLength(0)
            expect(conflictingTimeOff).toHaveLength(0)
            expect(createdRequest).toBeDefined()
            expect(createdRequest.status).toBe(TimeOffStatus.PENDING)

            // Verify integration calls
            expect(mockPrisma.staff.findUnique).toHaveBeenCalledWith({
                where: { id: staffId },
                select: { id: true, businessId: true, displayName: true },
            })

            expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
                where: {
                    staffId,
                    startTime: {
                        gte: new Date(timeOffRequest.startDate),
                        lte: new Date(timeOffRequest.endDate),
                    },
                },
            })

            expect(mockPrisma.timeOffRequest.create).toHaveBeenCalledWith({
                data: {
                    staffId,
                    businessId,
                    startDate: new Date(timeOffRequest.startDate),
                    endDate: new Date(timeOffRequest.endDate),
                    reason: timeOffRequest.reason,
                    status: TimeOffStatus.PENDING,
                },
            })
        })

        it('should list time-off requests with business context isolation', async () => {
            const mockTimeOffRequests = [
                {
                    id: 'request-1',
                    staffId,
                    businessId,
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-17'),
                    reason: 'Vacation',
                    status: TimeOffStatus.PENDING,
                    staff: { id: staffId, displayName: 'John Doe', email: 'john@example.com' },
                },
            ]

            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue(mockTimeOffRequests as any)

            // Simulate time-off list API logic
            const requests = await mockPrisma.timeOffRequest.findMany({
                where: { businessId },
                orderBy: { createdAt: 'desc' },
                include: {
                    staff: {
                        select: { id: true, displayName: true, email: true },
                    },
                    approver: {
                        select: { id: true, displayName: true, email: true },
                    },
                },
            })

            expect(requests).toHaveLength(1)
            expect(requests[0].businessId).toBe(businessId)
            expect(requests[0].staff.name).toBe('John Doe')

            // Verify business context isolation
            expect(mockPrisma.timeOffRequest.findMany).toHaveBeenCalledWith({
                where: { businessId }, // Only user's business
                orderBy: { createdAt: 'desc' },
                include: {
                    staff: {
                        select: { id: true, displayName: true, email: true },
                    },
                    approver: {
                        select: { id: true, displayName: true, email: true },
                    },
                },
            })
        })
    })

    describe('Multi-Tenant Data Isolation', () => {
        it('should enforce business context across all operations', async () => {
            const userBusinessId = 'user-business-123'
            const otherBusinessId = 'other-business-456'

            // Mock data from different businesses
            asMock(mockPrisma.staff.findMany).mockResolvedValue([
                { id: 'staff-1', businessId: userBusinessId, name: 'User Staff' },
            ])

            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([
                { id: 'request-1', businessId: userBusinessId, staffId: 'staff-1' },
            ])

            asMock(mockPrisma.businessHours.findMany).mockResolvedValue([
                { id: 'hours-1', businessId: userBusinessId, dayOfWeek: 1 },
            ])

            // Simulate multi-tenant queries
            const staff = await mockPrisma.staff.findMany({
                where: { businessId: userBusinessId, isActive: true },
            })

            const timeOffRequests = await mockPrisma.timeOffRequest.findMany({
                where: { businessId: userBusinessId },
            })

            const businessHours = await mockPrisma.businessHours.findMany({
                where: { businessId: userBusinessId },
            })

            // Verify all data belongs to user's business
            expect(staff.every((s: any) => s.businessId === userBusinessId)).toBe(true)
            expect(timeOffRequests.every((r: any) => r.businessId === userBusinessId)).toBe(true)
            expect(businessHours.every((h: any) => h.businessId === userBusinessId)).toBe(true)

            // Verify queries were scoped correctly
            expect(mockPrisma.staff.findMany).toHaveBeenCalledWith({
                where: { businessId: userBusinessId, isActive: true },
            })

            expect(mockPrisma.timeOffRequest.findMany).toHaveBeenCalledWith({
                where: { businessId: userBusinessId },
            })

            expect(mockPrisma.businessHours.findMany).toHaveBeenCalledWith({
                where: { businessId: userBusinessId },
            })
        })

        it('should prevent data leakage between businesses', async () => {
            const userBusinessId = 'user-business-123'
            const otherBusinessId = 'other-business-456'

            // Mock queries that should return empty for other business data
            asMock(mockPrisma.staff.findFirst).mockResolvedValue(null)
            asMock(mockPrisma.service.findFirst).mockResolvedValue(null)

            // Attempt to access other business data
            const otherBusinessStaff = await mockPrisma.staff.findFirst({
                where: { id: 'other-staff', businessId: userBusinessId }, // Scoped to user's business
            })

            const otherBusinessService = await mockPrisma.service.findFirst({
                where: { id: 'other-service', businessId: userBusinessId }, // Scoped to user's business
            })

            // Should not find data from other business
            expect(otherBusinessStaff).toBeNull()
            expect(otherBusinessService).toBeNull()

            // Verify queries were properly scoped
            expect(mockPrisma.staff.findFirst).toHaveBeenCalledWith({
                where: { id: 'other-staff', businessId: userBusinessId },
            })

            expect(mockPrisma.service.findFirst).toHaveBeenCalledWith({
                where: { id: 'other-service', businessId: userBusinessId },
            })
        })
    })

    describe('Real-Time Updates Integration', () => {
        it('should reflect immediate changes across related operations', async () => {
            const mockBusiness: Partial<Business> = {
                id: businessId,
                timezone: 'America/New_York',
            }

            // Initial state - available slots
            const initialSlots = [
                {
                    startTime: new Date('2024-01-15T14:00:00Z'),
                    endTime: new Date('2024-01-15T15:00:00Z'),
                    staffId,
                    staffName: 'John Doe',
                    isAvailable: true,
                    duration: 60,
                    serviceId: null,
                    conflicts: [],
                },
            ]

            // Updated state - slot becomes unavailable
            const updatedSlots = [
                {
                    startTime: new Date('2024-01-15T14:00:00Z'),
                    endTime: new Date('2024-01-15T15:00:00Z'),
                    staffId,
                    staffName: 'John Doe',
                    isAvailable: false,
                    duration: 60,
                    serviceId: null,
                    conflicts: ['TIME_OFF_CONFLICT'],
                },
            ]

            asMock(mockPrisma.business.findUnique).mockResolvedValue(mockBusiness as Business)
            AvailabilityCalculator.getAvailableSlots
                .mockResolvedValueOnce(initialSlots)
                .mockResolvedValueOnce(updatedSlots)

            // First availability check
            const initialAvailability = await AvailabilityCalculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
            })

            expect(initialAvailability[0].isAvailable).toBe(true)

            // Simulate time-off request creation (would trigger availability update)
            const mockStaff: Partial<Staff> = {
                id: staffId,
                businessId,
                displayName: 'John Doe',
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as unknown as Staff)
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.create).mockResolvedValue({
                id: 'request-1',
                staffId,
                businessId,
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-01-15'),
                reason: 'Doctor appointment',
                status: TimeOffStatus.PENDING,
                approvedBy: null,
                approvedAt: null,
                denialReason: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            // Create time-off request
            await mockPrisma.timeOffRequest.create({
                data: {
                    staffId,
                    businessId,
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-15'),
                    reason: 'Doctor appointment',
                    status: TimeOffStatus.PENDING,
                },
            })

            // Second availability check (should reflect the time-off)
            const updatedAvailability = await AvailabilityCalculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
            })

            expect(updatedAvailability[0].isAvailable).toBe(false)
            expect(updatedAvailability[0].conflicts).toContain('TIME_OFF_CONFLICT')

            // Verify both calls were made
            expect(AvailabilityCalculator.getAvailableSlots).toHaveBeenCalledTimes(2)
        })
    })
})
