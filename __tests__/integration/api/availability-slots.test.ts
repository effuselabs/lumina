import { prisma } from '@/lib/prisma'
import { Business, Service, Staff } from '@prisma/client'
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'
import { createTestStaff, createTestService } from '@/__tests__/utils/test-data-factories'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/availability/slots/route'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        business: {
            findUnique: jest.fn(),
        },
        staff: {
            findFirst: jest.fn(),
        },
        service: {
            findFirst: jest.fn(),
        },
    },
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
    auth: jest.fn(),
}))

// Mock availability calculator
jest.mock('@/lib/services/availability-calculator', () => ({
    AvailabilityCalculator: {
        getAvailableSlots: jest.fn(),
    },
}))

// Mock timezone services
jest.mock('@/lib/services/timezone-handler', () => ({
    TimeZoneHandler: {
        validateTimeZone: jest.fn(),
        getTimeZoneInfo: jest.fn(),
    },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { auth } = require('@/lib/auth')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AvailabilityCalculator } = require('@/lib/services/availability-calculator')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TimeZoneHandler } = require('@/lib/services/timezone-handler')

describe('/api/availability/slots Integration Tests', () => {
    const businessId = 'business-123'
    const staffId = 'staff-123'
    const serviceId = 'service-123'
    const mockSession = {
        user: {
            id: 'user-123',
            businessId,
            role: 'OWNER',
        },
    }

    beforeEach(() => {
        jest.clearAllMocks()
        auth.mockResolvedValue(mockSession)
        TimeZoneHandler.validateTimeZone.mockReturnValue(true)
        TimeZoneHandler.getTimeZoneInfo.mockReturnValue({
            offset: '-05:00',
            isDST: false,
        })
    })

    describe('GET /api/availability/slots', () => {
        it('should simulate availability slots API integration', async () => {
            const mockBusiness: Partial<Business> = {
                id: businessId,
                timezone: 'America/New_York',
            }

            const mockSlots = [
                {
                    startTime: new Date('2024-01-15T09:00:00Z'),
                    endTime: new Date('2024-01-15T10:00:00Z'),
                    staffId,
                    staffName: 'John Doe',
                    isAvailable: true,
                    duration: 60,
                    serviceId: null,
                    conflicts: [],
                },
                {
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    endTime: new Date('2024-01-15T11:00:00Z'),
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

            // Simulate API call logic
            const queryParams = {
                date: '2024-01-15',
                businessId,
            }

            // Verify business lookup
            expect(mockPrisma.business.findUnique).toHaveBeenCalledWith({
                where: { id: businessId },
                select: { timezone: true },
            })

            // Verify availability calculation
            expect(AvailabilityCalculator.getAvailableSlots).toHaveBeenCalledWith({
                businessId,
                date: new Date(queryParams.date),
                serviceId: undefined,
                staffId: undefined,
                duration: undefined,
                includeUnavailable: false,
            })

            // Simulate response data
            const responseData = {
                date: queryParams.date,
                businessId,
                businessTimezone: mockBusiness.timezone,
                totalSlots: mockSlots.length,
                availableSlots: mockSlots.filter(s => s.isAvailable).length,
                unavailableSlots: mockSlots.filter(s => !s.isAvailable).length,
                slots: mockSlots,
            }

            expect(responseData.totalSlots).toBe(2)
            expect(responseData.availableSlots).toBe(2)
            expect(responseData.slots).toHaveLength(2)
            expect(responseData.slots[0].staffId).toBe(staffId)
            expect(responseData.slots[0].isAvailable).toBe(true)
        })

        it('should filter slots by staff member', async () => {
            const mockStaff = createTestStaff({
                id: staffId,
                businessId,
                displayName: 'John Doe',
            })

            const mockBusiness: Partial<Business> = {
                id: businessId,
                timezone: 'America/New_York',
            }

            const mockSlots = [
                {
                    startTime: new Date('2024-01-15T09:00:00Z'),
                    endTime: new Date('2024-01-15T10:00:00Z'),
                    staffId,
                    staffName: 'John Doe',
                    isAvailable: true,
                    duration: 60,
                    serviceId: null,
                    conflicts: [],
                },
            ]

            asMock(mockPrisma.business.findUnique).mockResolvedValue(mockBusiness as Business)
            asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff as unknown as Staff)
            AvailabilityCalculator.getAvailableSlots.mockResolvedValue(mockSlots)

            const request = new NextRequest(`http://localhost:3000/api/availability/slots?date=2024-01-15&staffId=${staffId}`)
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.filters.staffId).toBe(staffId)
            expect(mockPrisma.staff.findFirst).toHaveBeenCalledWith({
                where: { id: staffId, businessId },
            })
        })

        it('should filter slots by service', async () => {
            const mockService = createTestService({
                id: serviceId,
                businessId,
                displayName: 'Haircut',
                duration: 60,
            })

            const mockBusiness: Partial<Business> = {
                id: businessId,
                timezone: 'America/New_York',
            }

            const mockSlots = [
                {
                    startTime: new Date('2024-01-15T09:00:00Z'),
                    endTime: new Date('2024-01-15T10:00:00Z'),
                    staffId,
                    staffName: 'John Doe',
                    isAvailable: true,
                    duration: 60,
                    serviceId,
                    conflicts: [],
                },
            ]

            asMock(mockPrisma.business.findUnique).mockResolvedValue(mockBusiness as Business)
            asMock(mockPrisma.service.findFirst).mockResolvedValue(mockService as Service)
            AvailabilityCalculator.getAvailableSlots.mockResolvedValue(mockSlots)

            const request = new NextRequest(`http://localhost:3000/api/availability/slots?date=2024-01-15&serviceId=${serviceId}`)
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.filters.serviceId).toBe(serviceId)
            expect(mockPrisma.service.findFirst).toHaveBeenCalledWith({
                where: { id: serviceId, businessId },
            })
        })

        it('should validate timezone parameter', async () => {
            TimeZoneHandler.validateTimeZone.mockReturnValue(false)

            const request = new NextRequest('http://localhost:3000/api/availability/slots?date=2024-01-15&timezone=Invalid/Timezone')
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toContain('Invalid timezone')
        })

        it('should return 401 when user is not authenticated', async () => {
            auth.mockResolvedValue(null)

            const request = new NextRequest('http://localhost:3000/api/availability/slots?date=2024-01-15')
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data.error).toBe('Business context required')
        })

        it('should return 400 when date parameter is missing', async () => {
            const request = new NextRequest('http://localhost:3000/api/availability/slots')
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Date parameter is required')
        })

        it('should return 400 when date format is invalid', async () => {
            const request = new NextRequest('http://localhost:3000/api/availability/slots?date=invalid-date')
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Invalid query parameters')
        })

        it('should return 404 when staff not found or not authorized', async () => {
            const mockBusiness: Partial<Business> = {
                id: businessId,
                timezone: 'America/New_York',
            }

            asMock(mockPrisma.business.findUnique).mockResolvedValue(mockBusiness as Business)
            asMock(mockPrisma.staff.findFirst).mockResolvedValue(null)

            const request = new NextRequest(`http://localhost:3000/api/availability/slots?date=2024-01-15&staffId=${staffId}`)
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(404)
            expect(data.error).toBe('Staff member not found or not authorized')
        })

        it('should return 404 when service not found or not authorized', async () => {
            const mockBusiness: Partial<Business> = {
                id: businessId,
                timezone: 'America/New_York',
            }

            asMock(mockPrisma.business.findUnique).mockResolvedValue(mockBusiness as Business)
            asMock(mockPrisma.service.findFirst).mockResolvedValue(null)

            const request = new NextRequest(`http://localhost:3000/api/availability/slots?date=2024-01-15&serviceId=${serviceId}`)
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(404)
            expect(data.error).toBe('Service not found or not authorized')
        })

        it('should enforce business context isolation', async () => {
            const otherBusinessStaffId = 'other-staff-456'
            const mockBusiness: Partial<Business> = {
                id: businessId,
                timezone: 'America/New_York',
            }

            asMock(mockPrisma.business.findUnique).mockResolvedValue(mockBusiness as Business)
            asMock(mockPrisma.staff.findFirst).mockResolvedValue(null) // Staff not found in user's business

            const request = new NextRequest(`http://localhost:3000/api/availability/slots?date=2024-01-15&staffId=${otherBusinessStaffId}`)
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(404)
            expect(data.error).toBe('Staff member not found or not authorized')
            expect(mockPrisma.staff.findFirst).toHaveBeenCalledWith({
                where: { id: otherBusinessStaffId, businessId }, // Only searches in user's business
            })
        })

        it('should handle duration parameter validation', async () => {
            const request = new NextRequest('http://localhost:3000/api/availability/slots?date=2024-01-15&duration=500') // Too long
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Invalid query parameters')
        })

        it('should include unavailable slots when requested', async () => {
            const mockBusiness: Partial<Business> = {
                id: businessId,
                timezone: 'America/New_York',
            }

            const mockSlots = [
                {
                    startTime: new Date('2024-01-15T09:00:00Z'),
                    endTime: new Date('2024-01-15T10:00:00Z'),
                    staffId,
                    staffName: 'John Doe',
                    isAvailable: true,
                    duration: 60,
                    serviceId: null,
                    conflicts: [],
                },
                {
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    endTime: new Date('2024-01-15T11:00:00Z'),
                    staffId,
                    staffName: 'John Doe',
                    isAvailable: false,
                    duration: 60,
                    serviceId: null,
                    conflicts: ['APPOINTMENT_CONFLICT'],
                },
            ]

            asMock(mockPrisma.business.findUnique).mockResolvedValue(mockBusiness as Business)
            AvailabilityCalculator.getAvailableSlots.mockResolvedValue(mockSlots)

            const request = new NextRequest('http://localhost:3000/api/availability/slots?date=2024-01-15&includeUnavailable=true')
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.totalSlots).toBe(2)
            expect(data.availableSlots).toBe(1)
            expect(data.unavailableSlots).toBe(1)
            expect(data.filters.includeUnavailable).toBe(true)
        })

        it('should handle database errors gracefully', async () => {
            asMock(mockPrisma.business.findUnique).mockRejectedValue(new Error('Database connection failed'))

            const request = new NextRequest('http://localhost:3000/api/availability/slots?date=2024-01-15')
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBe('Failed to fetch availability slots')
            expect(data.details).toContain('Database connection failed')
        })

        it('should handle availability calculator errors gracefully', async () => {
            const mockBusiness: Partial<Business> = {
                id: businessId,
                timezone: 'America/New_York',
            }

            asMock(mockPrisma.business.findUnique).mockResolvedValue(mockBusiness as Business)
            AvailabilityCalculator.getAvailableSlots.mockRejectedValue(new Error('Calculation failed'))

            const request = new NextRequest('http://localhost:3000/api/availability/slots?date=2024-01-15')
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBe('Failed to fetch availability slots')
            expect(data.details).toContain('Calculation failed')
        })
    })

    describe('Multi-tenant data isolation', () => {
        it('should only access staff from authenticated business', async () => {
            const mockBusiness: Partial<Business> = {
                id: businessId,
                timezone: 'America/New_York',
            }

            asMock(mockPrisma.business.findUnique).mockResolvedValue(mockBusiness as Business)
            asMock(mockPrisma.staff.findFirst).mockResolvedValue(null) // Not found in user's business

            const request = new NextRequest(`http://localhost:3000/api/availability/slots?date=2024-01-15&staffId=other-staff-123`)
            const response = await GET(request)

            expect(response.status).toBe(404)
            expect(mockPrisma.staff.findFirst).toHaveBeenCalledWith({
                where: { id: 'other-staff-123', businessId }, // Only searches in user's business
            })
        })

        it('should only access services from authenticated business', async () => {
            const mockBusiness: Partial<Business> = {
                id: businessId,
                timezone: 'America/New_York',
            }

            asMock(mockPrisma.business.findUnique).mockResolvedValue(mockBusiness as Business)
            asMock(mockPrisma.service.findFirst).mockResolvedValue(null) // Not found in user's business

            const request = new NextRequest(`http://localhost:3000/api/availability/slots?date=2024-01-15&serviceId=other-service-123`)
            const response = await GET(request)

            expect(response.status).toBe(404)
            expect(mockPrisma.service.findFirst).toHaveBeenCalledWith({
                where: { id: 'other-service-123', businessId }, // Only searches in user's business
            })
        })
    })

    describe('Real-time availability updates', () => {
        it('should reflect real-time availability changes', async () => {
            const mockBusiness: Partial<Business> = {
                id: businessId,
                timezone: 'America/New_York',
            }

            // First call returns available slot
            const initialSlots = [
                {
                    startTime: new Date('2024-01-15T09:00:00Z'),
                    endTime: new Date('2024-01-15T10:00:00Z'),
                    staffId,
                    staffName: 'John Doe',
                    isAvailable: true,
                    duration: 60,
                    serviceId: null,
                    conflicts: [],
                },
            ]

            // Second call returns unavailable slot (simulating real-time booking)
            const updatedSlots = [
                {
                    startTime: new Date('2024-01-15T09:00:00Z'),
                    endTime: new Date('2024-01-15T10:00:00Z'),
                    staffId,
                    staffName: 'John Doe',
                    isAvailable: false,
                    duration: 60,
                    serviceId: null,
                    conflicts: ['APPOINTMENT_CONFLICT'],
                },
            ]

            asMock(mockPrisma.business.findUnique).mockResolvedValue(mockBusiness as Business)
            AvailabilityCalculator.getAvailableSlots
                .mockResolvedValueOnce(initialSlots)
                .mockResolvedValueOnce(updatedSlots)

            // First request
            const request1 = new NextRequest('http://localhost:3000/api/availability/slots?date=2024-01-15&includeUnavailable=true')
            const response1 = await GET(request1)
            const data1 = await response1.json()

            expect(response1.status).toBe(200)
            expect(data1.availableSlots).toBe(1)
            expect(data1.unavailableSlots).toBe(0)

            // Second request (simulating real-time update)
            const request2 = new NextRequest('http://localhost:3000/api/availability/slots?date=2024-01-15&includeUnavailable=true')
            const response2 = await GET(request2)
            const data2 = await response2.json()

            expect(response2.status).toBe(200)
            expect(data2.availableSlots).toBe(0)
            expect(data2.unavailableSlots).toBe(1)
        })
    })
})