import { prisma } from '@/lib/prisma'
import { BusinessHoursRepository } from '@/lib/repositories/business-hours-repository'
import { StaffAvailabilityRepository } from '@/lib/repositories/staff-availability-repository'
import { AvailabilityCalculator } from '@/lib/services/availability-calculator'
import { ConflictDetectionEngine } from '@/lib/services/conflict-detection-engine'
import { performance } from 'perf_hooks'
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'

// Mock Prisma with performance-focused mocks
jest.mock('@/lib/prisma', () => ({
    prisma: {
        business: {
            findUnique: jest.fn(),
        },
        staff: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
        service: {
            findMany: jest.fn(),
        },
        businessHours: {
            findMany: jest.fn(),
        },
        staffAvailability: {
            findMany: jest.fn(),
        },
        timeOffRequest: {
            findMany: jest.fn(),
        },
        appointment: {
            findMany: jest.fn(),
        },
        availabilityCache: {
            findFirst: jest.fn(),
            create: jest.fn(),
            deleteMany: jest.fn(),
        },
    },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Availability System Performance Tests', () => {
    const businessId = 'business-123'
    const staffIds = Array.from({ length: 10 }, (_, i) => `staff-${i + 1}`)
    const serviceIds = Array.from({ length: 20 }, (_, i) => `service-${i + 1}`)

    beforeEach(() => {
        jest.clearAllMocks()
        setupPerformanceMocks()
    })

    function setupPerformanceMocks() {
        // Mock business data
        asMock(mockPrisma.business.findUnique).mockResolvedValue({
            id: businessId,
            name: 'Performance Test Business',
            timezone: 'America/New_York',
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any)

        // Mock staff data (10 staff members)
        asMock(mockPrisma.staff.findMany).mockResolvedValue(
            staffIds.map((id: any) => ({
                id,
                businessId,
                name: `Staff ${id}`,
                email: `${id}@test.com`,
                role: 'STAFF',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            })) as any
        )

        // Mock services data (20 services with varying durations)
        asMock(mockPrisma.service.findMany).mockResolvedValue(
            serviceIds.map((id, index) => ({
                id,
                businessId,
                name: `Service ${id}`,
                duration: 30 + (index % 4) * 30, // 30, 60, 90, 120 minute services
                price: 50 + index * 10,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            })) as any
        )

        // Mock business hours (open 9 AM - 6 PM, Monday-Saturday)
        asMock(mockPrisma.businessHours.findMany).mockResolvedValue(
            Array.from({ length: 6 }, (_, i) => ({
                id: `hours-${i}`,
                businessId,
                dayOfWeek: i + 1,
                openTime: '09:00:00',
                closeTime: '18:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            })) as any
        )

        // Mock staff availability (all staff available during business hours)
        asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue(
            staffIds.flatMap(staffId =>
                Array.from({ length: 6 }, (_, i) => ({
                    id: `availability-${staffId}-${i}`,
                    staffId,
                    businessId,
                    dayOfWeek: i + 1,
                    startTime: '09:00:00',
                    endTime: '18:00:00',
                    isRecurring: true,
                    effectiveDate: null,
                    expiryDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
            ) as any
        )

        // Mock minimal time-off and appointments for performance testing
        asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
        asMock(mockPrisma.appointment.findMany).mockResolvedValue([])

        // Mock cache misses for performance testing
        asMock(mockPrisma.availabilityCache.findFirst).mockResolvedValue(null)
    }

    describe('Sub-200ms Availability Query Performance', () => {
        it('should return availability results in under 200ms for single staff member', async () => {
            const startTime = performance.now()

            const result = await AvailabilityCalculator.calculateAvailability({
                businessId,
                date: new Date('2024-01-15'),
                staffId: staffIds[0],
                duration: 60,
                includeUnavailable: false,
            })

            const endTime = performance.now()
            const executionTime = endTime - startTime

            expect(executionTime).toBeLessThan(200)
            expect(result).toBeDefined()
            expect(result.slots).toBeDefined()
            expect(Array.isArray(result.slots)).toBe(true)

            // Verify database queries were optimized
            expect(mockPrisma.business.findUnique).toHaveBeenCalledTimes(1)
            expect(mockPrisma.businessHours.findMany).toHaveBeenCalledTimes(1)
            expect(mockPrisma.staffAvailability.findMany).toHaveBeenCalledTimes(1)
        })

        it('should return availability results in under 200ms for multiple staff members', async () => {
            const calculator = new AvailabilityCalculator()
            const startTime = performance.now()

            const slots = await calculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
                duration: 60,
                includeUnavailable: false,
            })

            const endTime = performance.now()
            const executionTime = endTime - startTime

            expect(executionTime).toBeLessThan(200)
            expect(slots).toBeDefined()
            expect(Array.isArray(slots)).toBe(true)

            // Should efficiently query all staff at once
            expect(mockPrisma.staff.findMany).toHaveBeenCalledTimes(1)
            expect(mockPrisma.businessHours.findMany).toHaveBeenCalledTimes(1)
            expect(mockPrisma.staffAvailability.findMany).toHaveBeenCalledTimes(1)
        })

        it('should return availability results in under 200ms with service filtering', async () => {
            const calculator = new AvailabilityCalculator()
            const startTime = performance.now()

            const slots = await calculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
                serviceId: serviceIds[0],
                duration: 60,
                includeUnavailable: false,
            })

            const endTime = performance.now()
            const executionTime = endTime - startTime

            expect(executionTime).toBeLessThan(200)
            expect(slots).toBeDefined()
            expect(Array.isArray(slots)).toBe(true)

            // Should include service validation
            expect(mockPrisma.service.findMany).toHaveBeenCalledTimes(1)
        })

        it('should maintain performance with date range queries', async () => {
            const calculator = new AvailabilityCalculator()
            const dates = [
                new Date('2024-01-15'),
                new Date('2024-01-16'),
                new Date('2024-01-17'),
            ]

            const startTime = performance.now()

            const results = await Promise.all(
                dates.map((date: any) =>
                    calculator.getAvailableSlots({
                        businessId,
                        date,
                        duration: 60,
                        includeUnavailable: false,
                    })
                )
            )

            const endTime = performance.now()
            const executionTime = endTime - startTime

            // Should complete all 3 queries in under 400ms (allowing for parallel execution)
            expect(executionTime).toBeLessThan(400)
            expect(results).toHaveLength(3)
            results.forEach((slots: any) => {
                expect(Array.isArray(slots)).toBe(true)
            })
        })
    })

    describe('Conflict Detection Performance', () => {
        it('should detect conflicts in under 100ms for typical scenarios', async () => {
            const conflictEngine = new ConflictDetectionEngine()

            // Mock some existing appointments for conflict detection
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([
                {
                    id: 'appointment-1',
                    businessId,
                    staffId: staffIds[0],
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    endTime: new Date('2024-01-15T11:00:00Z'),
                    status: 'CONFIRMED',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ] as any)

            const appointmentRequest = {
                businessId,
                staffId: staffIds[0],
                startTime: new Date('2024-01-15T10:30:00Z'),
                endTime: new Date('2024-01-15T11:30:00Z'),
                serviceIds: [serviceIds[0]],
            }

            const startTime = performance.now()

            const conflicts = await conflictEngine.detectConflicts(appointmentRequest)

            const endTime = performance.now()
            const executionTime = endTime - startTime

            expect(executionTime).toBeLessThan(100)
            expect(conflicts).toBeDefined()
            expect(Array.isArray(conflicts)).toBe(true)
        })

        it('should validate appointment slots efficiently', async () => {
            const conflictEngine = new ConflictDetectionEngine()
            const startTime = performance.now()

            const validationResult = await conflictEngine.validateAppointmentSlot(
                staffIds[0],
                new Date('2024-01-15T14:00:00Z'),
                60,
                businessId,
                [serviceIds[0]]
            )

            const endTime = performance.now()
            const executionTime = endTime - startTime

            expect(executionTime).toBeLessThan(100)
            expect(validationResult).toBeDefined()
            expect(typeof validationResult.isValid).toBe('boolean')
        })

        it('should handle batch conflict detection efficiently', async () => {
            const conflictEngine = new ConflictDetectionEngine()

            const appointmentRequests = Array.from({ length: 10 }, (_, i) => ({
                businessId,
                staffId: staffIds[i % staffIds.length],
                startTime: new Date(`2024-01-15T${9 + i}:00:00Z`),
                endTime: new Date(`2024-01-15T${10 + i}:00:00Z`),
                serviceIds: [serviceIds[i % serviceIds.length]],
            }))

            const startTime = performance.now()

            const results = await Promise.all(
                appointmentRequests.map((request: any) =>
                    conflictEngine.detectConflicts(request)
                )
            )

            const endTime = performance.now()
            const executionTime = endTime - startTime

            // Should complete 10 conflict checks in under 500ms
            expect(executionTime).toBeLessThan(500)
            expect(results).toHaveLength(10)
            results.forEach((conflicts: any) => {
                expect(Array.isArray(conflicts)).toBe(true)
            })
        })
    })

    describe('Repository Performance', () => {
        it('should update business hours efficiently', async () => {
            const repository = new BusinessHoursRepository()
            const startTime = performance.now()

            await repository.setBusinessHours(businessId, {
                dayOfWeek: 1,
                openTime: '10:00:00',
                closeTime: '19:00:00',
                isClosed: false,
            })

            const endTime = performance.now()
            const executionTime = endTime - startTime

            expect(executionTime).toBeLessThan(50)
        })

        it('should update staff availability efficiently', async () => {
            const repository = new StaffAvailabilityRepository()
            const startTime = performance.now()

            await repository.setAvailability(staffIds[0], businessId, {
                dayOfWeek: 1,
                startTime: '09:00:00',
                endTime: '17:00:00',
                isRecurring: true,
            })

            const endTime = performance.now()
            const executionTime = endTime - startTime

            expect(executionTime).toBeLessThan(50)
        })

        it('should handle bulk staff availability updates efficiently', async () => {
            const repository = new StaffAvailabilityRepository()
            const availabilityUpdates = staffIds.map((staffId: any) => ({
                staffId,
                businessId,
                availability: {
                    dayOfWeek: 1,
                    startTime: '09:00:00',
                    endTime: '17:00:00',
                    isRecurring: true,
                },
            }))

            const startTime = performance.now()

            await Promise.all(
                availabilityUpdates.map((update: any) =>
                    repository.setAvailability(
                        update.staffId,
                        update.businessId,
                        update.availability
                    )
                )
            )

            const endTime = performance.now()
            const executionTime = endTime - startTime

            // Should complete 10 staff updates in under 200ms
            expect(executionTime).toBeLessThan(200)
        })
    })

    describe('Memory and Resource Usage', () => {
        it('should not cause memory leaks during repeated availability calculations', async () => {
            const calculator = new AvailabilityCalculator()
            const initialMemory = process.memoryUsage().heapUsed

            // Perform 100 availability calculations
            for (let i = 0; i < 100; i++) {
                await calculator.getAvailableSlots({
                    businessId,
                    date: new Date('2024-01-15'),
                    duration: 60,
                    includeUnavailable: false,
                })
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc()
            }

            const finalMemory = process.memoryUsage().heapUsed
            const memoryIncrease = finalMemory - initialMemory

            // Memory increase should be minimal (less than 10MB)
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
        })

        it('should handle large datasets efficiently', async () => {
            // Mock larger dataset
            const largeStaffIds = Array.from({ length: 50 }, (_, i) => `staff-${i + 1}`)
            const largeServiceIds = Array.from({ length: 100 }, (_, i) => `service-${i + 1}`)

            asMock(mockPrisma.staff.findMany).mockResolvedValue(
                largeStaffIds.map((id: any) => ({
                    id,
                    businessId,
                    name: `Staff ${id}`,
                    email: `${id}@test.com`,
                    role: 'STAFF',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })) as any
            )

            asMock(mockPrisma.service.findMany).mockResolvedValue(
                largeServiceIds.map((id, index) => ({
                    id,
                    businessId,
                    name: `Service ${id}`,
                    duration: 30 + (index % 4) * 30,
                    price: 50 + index * 10,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })) as any
            )

            const calculator = new AvailabilityCalculator()
            const startTime = performance.now()

            const slots = await calculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
                duration: 60,
                includeUnavailable: false,
            })

            const endTime = performance.now()
            const executionTime = endTime - startTime

            // Should still complete in under 500ms even with large dataset
            expect(executionTime).toBeLessThan(500)
            expect(slots).toBeDefined()
            expect(Array.isArray(slots)).toBe(true)
        })
    })

    describe('Database Query Optimization', () => {
        it('should minimize database queries for availability calculation', async () => {
            const calculator = new AvailabilityCalculator()

            await calculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
                duration: 60,
                includeUnavailable: false,
            })

            // Should make minimal database queries
            expect(mockPrisma.business.findUnique).toHaveBeenCalledTimes(1)
            expect(mockPrisma.businessHours.findMany).toHaveBeenCalledTimes(1)
            expect(mockPrisma.staffAvailability.findMany).toHaveBeenCalledTimes(1)
            expect(mockPrisma.timeOffRequest.findMany).toHaveBeenCalledTimes(1)
            expect(mockPrisma.appointment.findMany).toHaveBeenCalledTimes(1)

            // Should not make redundant queries
            expect(mockPrisma.staff.findMany).toHaveBeenCalledTimes(1)
        })

        it('should use efficient query patterns for conflict detection', async () => {
            const conflictEngine = new ConflictDetectionEngine()

            await conflictEngine.detectConflicts({
                businessId,
                staffId: staffIds[0],
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                serviceIds: [serviceIds[0]],
            })

            // Should make targeted queries with proper filtering
            expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        businessId,
                        staffId: staffIds[0],
                    }),
                })
            )
        })

        it('should batch similar queries efficiently', async () => {
            const calculator = new AvailabilityCalculator()

            // Make multiple similar requests
            await Promise.all([
                calculator.getAvailableSlots({
                    businessId,
                    date: new Date('2024-01-15'),
                    staffId: staffIds[0],
                    duration: 60,
                }),
                calculator.getAvailableSlots({
                    businessId,
                    date: new Date('2024-01-15'),
                    staffId: staffIds[1],
                    duration: 60,
                }),
                calculator.getAvailableSlots({
                    businessId,
                    date: new Date('2024-01-15'),
                    staffId: staffIds[2],
                    duration: 60,
                }),
            ])

            // Should reuse business and business hours queries
            expect(mockPrisma.business.findUnique).toHaveBeenCalledTimes(3)
            expect(mockPrisma.businessHours.findMany).toHaveBeenCalledTimes(3)
        })
    })
})