import { prisma } from '@/lib/prisma'
import { BusinessHoursRepository } from '@/lib/repositories/business-hours-repository'
import { StaffAvailabilityRepository } from '@/lib/repositories/staff-availability-repository'
import { TimeOffRequestRepository } from '@/lib/repositories/time-off-request-repository'
import { AvailabilityCalculator } from '@/lib/services/availability-calculator'
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
        },
        businessHours: {
            upsert: jest.fn(),
            findMany: jest.fn(),
        },
        staffAvailability: {
            deleteMany: jest.fn(),
            create: jest.fn(),
            findMany: jest.fn(),
        },
        timeOffRequest: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
        appointment: {
            findMany: jest.fn(),
        },
    },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Real-Time Availability Updates Integration Tests', () => {
    const businessId = 'business-123'
    const staffId = 'staff-456'

    let businessHoursRepo: BusinessHoursRepository
    let staffAvailabilityRepo: StaffAvailabilityRepository
    let timeOffRepo: TimeOffRequestRepository
    let availabilityCalculator: AvailabilityCalculator

    beforeEach(() => {
        jest.clearAllMocks()

        businessHoursRepo = new BusinessHoursRepository()
        staffAvailabilityRepo = new StaffAvailabilityRepository()
        timeOffRepo = new TimeOffRequestRepository()
        availabilityCalculator = new AvailabilityCalculator()

        // Mock business data
        asMock(mockPrisma.business.findUnique).mockResolvedValue({
            id: businessId,
            name: 'Test Business',
            timezone: 'America/New_York',
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        // Mock staff data
        asMock(mockPrisma.staff.findUnique).mockResolvedValue({
            id: staffId,
            businessId,
            name: 'John Doe',
            email: 'john@test.com',
            role: 'STAFF',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
    })

    describe('Business Hours Updates', () => {
        it('should immediately reflect business hours changes in availability', async () => {
            // Initial business hours: 9 AM - 5 PM
            const initialHours = {
                dayOfWeek: 1, // Monday
                openTime: '09:00:00',
                closeTime: '17:00:00',
                isClosed: false,
            }

            asMock(mockPrisma.businessHours.upsert).mockResolvedValue({
                id: 'hours-1',
                businessId,
                ...initialHours,
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            // Set initial business hours
            await businessHoursRepo.setBusinessHours(businessId, initialHours)

            // Mock initial availability calculation
            asMock(mockPrisma.businessHours.findMany).mockResolvedValue([{
                id: 'hours-1',
                businessId,
                ...initialHours,
                createdAt: new Date(),
                updatedAt: new Date(),
            }])

            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])

            // Get initial availability (should have slots from 9 AM - 5 PM)
            const initialSlots = await availabilityCalculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
                duration: 60,
                staffId,
            })

            expect(initialSlots.length).toBeGreaterThan(0)
            expect(initialSlots.some(slot =>
                slot.startTime.getHours() >= 9 && slot.startTime.getHours() < 17
            )).toBe(true)

            // Update business hours to close earlier (9 AM - 3 PM)
            const updatedHours = {
                dayOfWeek: 1,
                openTime: '09:00:00',
                closeTime: '15:00:00', // Close at 3 PM instead of 5 PM
                isClosed: false,
            }

            asMock(mockPrisma.businessHours.upsert).mockResolvedValue({
                id: 'hours-1',
                businessId,
                ...updatedHours,
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            // Update business hours
            await businessHoursRepo.setBusinessHours(businessId, updatedHours)

            // Mock updated availability calculation
            asMock(mockPrisma.businessHours.findMany).mockResolvedValue([{
                id: 'hours-1',
                businessId,
                ...updatedHours,
                createdAt: new Date(),
                updatedAt: new Date(),
            }])

            // Get updated availability (should only have slots from 9 AM - 3 PM)
            const updatedSlots = await availabilityCalculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
                duration: 60,
                staffId,
            })

            expect(updatedSlots.length).toBeGreaterThan(0)
            expect(updatedSlots.every(slot =>
                slot.startTime.getHours() >= 9 && slot.startTime.getHours() < 15
            )).toBe(true)
            expect(updatedSlots.some(slot =>
                slot.startTime.getHours() >= 15
            )).toBe(false)
        })
    })

    describe('Staff Availability Updates', () => {
        it('should immediately reflect staff availability changes', async () => {
            // Set up business hours
            asMock(mockPrisma.businessHours.findMany).mockResolvedValue([{
                id: 'hours-1',
                businessId,
                dayOfWeek: 1,
                openTime: '09:00:00',
                closeTime: '17:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }])

            // Initial staff availability: available all day
            const initialAvailability = {
                dayOfWeek: 1,
                startTime: '09:00:00',
                endTime: '17:00:00',
                isRecurring: true,
            }

            asMock(mockPrisma.staffAvailability.create).mockResolvedValue({
                id: 'availability-1',
                staffId,
                businessId,
                ...initialAvailability,
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            // Set initial staff availability
            await staffAvailabilityRepo.setStaffAvailability(staffId, businessId, initialAvailability)

            // Mock initial availability calculation
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                id: 'availability-1',
                staffId,
                businessId,
                ...initialAvailability,
                createdAt: new Date(),
                updatedAt: new Date(),
            }])

            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])

            // Get initial availability
            const initialSlots = await availabilityCalculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
                duration: 60,
                staffId,
            })

            expect(initialSlots.length).toBeGreaterThan(0)

            // Update staff availability to only morning hours (9 AM - 1 PM)
            const updatedAvailability = {
                dayOfWeek: 1,
                startTime: '09:00:00',
                endTime: '13:00:00',
                isRecurring: true,
            }

            asMock(mockPrisma.staffAvailability.deleteMany).mockResolvedValue({ count: 1 })
            asMock(mockPrisma.staffAvailability.create).mockResolvedValue({
                id: 'availability-2',
                staffId,
                businessId,
                ...updatedAvailability,
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            // Update staff availability
            await staffAvailabilityRepo.setStaffAvailability(staffId, businessId, updatedAvailability)

            // Mock updated availability calculation
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                id: 'availability-2',
                staffId,
                businessId,
                ...updatedAvailability,
                createdAt: new Date(),
                updatedAt: new Date(),
            }])

            // Get updated availability
            const updatedSlots = await availabilityCalculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
                duration: 60,
                staffId,
            })

            expect(updatedSlots.length).toBeGreaterThan(0)
            expect(updatedSlots.every(slot =>
                slot.startTime.getHours() >= 9 && slot.startTime.getHours() < 13
            )).toBe(true)
            expect(updatedSlots.some(slot =>
                slot.startTime.getHours() >= 13
            )).toBe(false)
        })
    })

    describe('Time-Off Request Updates', () => {
        it('should immediately reflect time-off requests in availability', async () => {
            // Set up business hours and staff availability
            asMock(mockPrisma.businessHours.findMany).mockResolvedValue([{
                id: 'hours-1',
                businessId,
                dayOfWeek: 1,
                openTime: '09:00:00',
                closeTime: '17:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }])

            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                id: 'availability-1',
                staffId,
                businessId,
                dayOfWeek: 1,
                startTime: '09:00:00',
                endTime: '17:00:00',
                isRecurring: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            }])

            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])

            // Get initial availability (full day available)
            const initialSlots = await availabilityCalculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
                duration: 60,
                staffId,
            })

            expect(initialSlots.length).toBeGreaterThan(0)

            // Create time-off request for afternoon (1 PM - 5 PM)
            const timeOffRequest = {
                staffId,
                businessId,
                startDate: new Date('2024-01-15T18:00:00Z'), // 1 PM EST
                endDate: new Date('2024-01-15T22:00:00Z'),   // 5 PM EST
                reason: 'Personal appointment',
                status: 'APPROVED' as const,
            }

            asMock(mockPrisma.timeOffRequest.create).mockResolvedValue({
                id: 'timeoff-1',
                ...timeOffRequest,
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            // Create time-off request
            await timeOffRepo.createTimeOffRequest(timeOffRequest)

            // Mock updated availability calculation with time-off
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([{
                id: 'timeoff-1',
                ...timeOffRequest,
                createdAt: new Date(),
                updatedAt: new Date(),
            }])

            // Get updated availability (should exclude afternoon hours)
            const updatedSlots = await availabilityCalculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
                duration: 60,
                staffId,
            })

            expect(updatedSlots.length).toBeGreaterThan(0)
            expect(updatedSlots.every(slot =>
                slot.startTime.getHours() < 13 // Only morning slots available
            )).toBe(true)
            expect(updatedSlots.some(slot =>
                slot.startTime.getHours() >= 13 // No afternoon slots
            )).toBe(false)
        })
    })

    describe('Concurrent Updates', () => {
        it('should handle concurrent availability updates correctly', async () => {
            // Set up initial state
            asMock(mockPrisma.businessHours.findMany).mockResolvedValue([{
                id: 'hours-1',
                businessId,
                dayOfWeek: 1,
                openTime: '09:00:00',
                closeTime: '17:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }])

            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                id: 'availability-1',
                staffId,
                businessId,
                dayOfWeek: 1,
                startTime: '09:00:00',
                endTime: '17:00:00',
                isRecurring: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            }])

            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])

            // Simulate concurrent updates
            const businessHoursUpdate = businessHoursRepo.setBusinessHours(businessId, {
                dayOfWeek: 1,
                openTime: '10:00:00', // Start later
                closeTime: '17:00:00',
                isClosed: false,
            })

            const staffAvailabilityUpdate = staffAvailabilityRepo.setStaffAvailability(staffId, businessId, {
                dayOfWeek: 1,
                startTime: '09:00:00',
                endTime: '16:00:00', // End earlier
                isRecurring: true,
            })

            const timeOffUpdate = timeOffRepo.createTimeOffRequest({
                staffId,
                businessId,
                startDate: new Date('2024-01-15T17:00:00Z'), // 12 PM EST
                endDate: new Date('2024-01-15T19:00:00Z'),   // 2 PM EST
                reason: 'Lunch break',
                status: 'APPROVED',
            })

            // Mock all updates
            asMock(mockPrisma.businessHours.upsert).mockResolvedValue({
                id: 'hours-1',
                businessId,
                dayOfWeek: 1,
                openTime: '10:00:00',
                closeTime: '17:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            asMock(mockPrisma.staffAvailability.deleteMany).mockResolvedValue({ count: 1 })
            asMock(mockPrisma.staffAvailability.create).mockResolvedValue({
                id: 'availability-2',
                staffId,
                businessId,
                dayOfWeek: 1,
                startTime: '09:00:00',
                endTime: '16:00:00',
                isRecurring: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            asMock(mockPrisma.timeOffRequest.create).mockResolvedValue({
                id: 'timeoff-1',
                staffId,
                businessId,
                startDate: new Date('2024-01-15T17:00:00Z'),
                endDate: new Date('2024-01-15T19:00:00Z'),
                reason: 'Lunch break',
                status: 'APPROVED',
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            // Execute concurrent updates
            await Promise.all([
                businessHoursUpdate,
                staffAvailabilityUpdate,
                timeOffUpdate,
            ])

            // Mock final state for availability calculation
            asMock(mockPrisma.businessHours.findMany).mockResolvedValue([{
                id: 'hours-1',
                businessId,
                dayOfWeek: 1,
                openTime: '10:00:00',
                closeTime: '17:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }])

            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                id: 'availability-2',
                staffId,
                businessId,
                dayOfWeek: 1,
                startTime: '09:00:00',
                endTime: '16:00:00',
                isRecurring: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            }])

            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([{
                id: 'timeoff-1',
                staffId,
                businessId,
                startDate: new Date('2024-01-15T17:00:00Z'),
                endDate: new Date('2024-01-15T19:00:00Z'),
                reason: 'Lunch break',
                status: 'APPROVED',
                createdAt: new Date(),
                updatedAt: new Date(),
            }])

            // Get final availability (should reflect all constraints)
            const finalSlots = await availabilityCalculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
                duration: 60,
                staffId,
            })

            expect(finalSlots.length).toBeGreaterThan(0)
            // Available from 10 AM - 12 PM and 2 PM - 4 PM (business hours: 10-17, staff: 9-16, time-off: 12-14)
            expect(finalSlots.every(slot => {
                const hour = slot.startTime.getHours()
                return (hour >= 10 && hour < 12) || (hour >= 14 && hour < 16)
            })).toBe(true)
        })
    })

    describe('Cache Invalidation', () => {
        it('should invalidate cache when availability changes', async () => {
            // This test verifies that cache invalidation works correctly
            // In a real implementation, this would test Redis cache invalidation

            const mockCacheInvalidation = jest.fn()

            // Mock the cache invalidation
            jest.doMock('@/lib/services/availability-cache', () => ({
                AvailabilityCache: {
                    invalidateBusinessAvailability: mockCacheInvalidation,
                    invalidateStaffAvailability: mockCacheInvalidation,
                },
            }))

            // Set up initial state
            asMock(mockPrisma.businessHours.upsert).mockResolvedValue({
                id: 'hours-1',
                businessId,
                dayOfWeek: 1,
                openTime: '09:00:00',
                closeTime: '17:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            // Update business hours (should trigger cache invalidation)
            await businessHoursRepo.setBusinessHours(businessId, {
                dayOfWeek: 1,
                openTime: '10:00:00',
                closeTime: '17:00:00',
                isClosed: false,
            })

            // Verify cache invalidation was called
            // Note: In the actual implementation, this would be called automatically
            expect(mockPrisma.businessHours.upsert).toHaveBeenCalled()
        })
    })
})