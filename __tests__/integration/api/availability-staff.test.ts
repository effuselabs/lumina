import { POST } from '@/app/api/availability/staff/route'
import { prisma } from '@/lib/prisma'
import { Staff, StaffAvailability } from '@prisma/client'
import { NextRequest } from 'next/server'
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        staff: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
        staffAvailability: {
            findMany: jest.fn(),
            create: jest.fn(),
            deleteMany: jest.fn(),
        },
        staffAvailabilityOverride: {
            findMany: jest.fn(),
        },
    },
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
    getServerSession: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getServerSession } = require('@/lib/auth')

describe('/api/availability/staff Integration Tests', () => {
    const businessId = 'business-123'
    const staffId = 'staff-123'
    const mockSession = {
        user: {
            id: 'user-123',
            businessId,
            role: 'OWNER',
        },
    }

    beforeEach(() => {
        jest.clearAllMocks()
        getServerSession.mockResolvedValue(mockSession)
    })

    describe.skip('GET /api/availability/staff', () => {
        it('should return staff availability for business', async () => {
            const mockStaff: Staff[] = [
                {
                    id: staffId,
                    businessId,
                    displayName: 'John Doe',
                    
                    role: 'STAFF',
                    isActive: true,
                    workingHours: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]

            const mockAvailability: StaffAvailability[] = [
                {
                    id: 'avail-1',
                    staffId,
                    businessId,
                    dayOfWeek: 1, // Monday
                    startTime: '09:00:00',
                    endTime: '17:00:00',
                    isRecurring: true,
                    effectiveDate: null,
                    expiryDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]

            asMock(mockPrisma.staff.findMany).mockResolvedValue(mockStaff)
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue(mockAvailability)
            asMock(mockPrisma.staffAvailabilityOverride.findMany).mockResolvedValue([])

            const request = new NextRequest('http://localhost:3000/api/availability/staff')
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data).toHaveLength(1)
            expect(data.data[0].staff.id).toBe(staffId)
            expect(mockPrisma.staff.findMany).toHaveBeenCalledWith({
                where: { businessId, isActive: true },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            })
        })

        it('should enforce business context isolation', async () => {
            const otherBusinessId = 'other-business-456'
            const mockStaff: Staff[] = [
                {
                    id: 'other-staff-456',
                    businessId: otherBusinessId, // Different business
                    displayName: 'Jane Doe',
                    
                    role: 'STAFF',
                    isActive: true,
                    workingHours: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]

            asMock(mockPrisma.staff.findMany).mockResolvedValue(mockStaff)

            const request = new NextRequest('http://localhost:3000/api/availability/staff')
            await GET(request)

            // Should only query for the authenticated user's business
            expect(mockPrisma.staff.findMany).toHaveBeenCalledWith({
                where: { businessId, isActive: true }, // User's business, not the other business
                select: expect.any(Object),
            })
        })

        it('should return 401 when user is not authenticated', async () => {
            getServerSession.mockResolvedValue(null)

            const request = new NextRequest('http://localhost:3000/api/availability/staff')
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data.success).toBe(false)
            expect(data.error).toBe('Unauthorized')
        })

        it('should handle date range filtering', async () => {
            const startDate = '2024-01-15'
            const endDate = '2024-01-21'

            const mockStaff: Staff[] = [
                {
                    id: staffId,
                    businessId,
                    displayName: 'John Doe',
                    
                    role: 'STAFF',
                    isActive: true,
                    workingHours: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]

            asMock(mockPrisma.staff.findMany).mockResolvedValue(mockStaff)
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([])
            asMock(mockPrisma.staffAvailabilityOverride.findMany).mockResolvedValue([])

            const request = new NextRequest(
                `http://localhost:3000/api/availability/staff?startDate=${startDate}&endDate=${endDate}`
            )
            const response = await GET(request)

            expect(response.status).toBe(200)
            expect(mockPrisma.staffAvailabilityOverride.findMany).toHaveBeenCalledWith({
                where: {
                    staffId,
                    date: {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                    },
                },
            })
        })
    })

    describe('POST /api/availability/staff', () => {
        it('should create staff availability for authenticated business', async () => {
            const requestData = {
                staffId,
                availability: [
                    {
                        dayOfWeek: 1,
                        startTime: '09:00:00',
                        endTime: '17:00:00',
                        isRecurring: true,
                    },
                    {
                        dayOfWeek: 2,
                        startTime: '09:00:00',
                        endTime: '17:00:00',
                        isRecurring: true,
                    },
                ],
            }

            const mockStaff = {
                id: staffId,
                businessId,
                displayName: 'John Doe',
            }

            const mockCreatedAvailability: StaffAvailability[] = requestData.availability.map((avail, index) => ({
                id: `avail-${index + 1}`,
                staffId,
                businessId,
                ...avail,
                effectiveDate: null,
                expiryDate: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }))

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as unknown as Staff)
            asMock(mockPrisma.staffAvailability.deleteMany).mockResolvedValue({ count: 0 })
            mockPrisma.staffAvailability.create
                .mockResolvedValueOnce(mockCreatedAvailability[0])
                .mockResolvedValueOnce(mockCreatedAvailability[1])

            const request = new NextRequest('http://localhost:3000/api/availability/staff', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data).toHaveLength(2)
            expect(mockPrisma.staff.findUnique).toHaveBeenCalledWith({
                where: { id: staffId },
                select: { id: true, businessId: true, name: true },
            })
            expect(mockPrisma.staffAvailability.create).toHaveBeenCalledTimes(2)
        })

        it('should validate staff belongs to authenticated business', async () => {
            const otherBusinessId = 'other-business-456'
            const requestData = {
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

            const mockStaff = {
                id: staffId,
                businessId: otherBusinessId, // Different business
                displayName: 'John Doe',
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as unknown as Staff)

            const request = new NextRequest('http://localhost:3000/api/availability/staff', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(403)
            expect(data.success).toBe(false)
            expect(data.error).toContain('not authorized')
        })

        it('should return 404 when staff not found', async () => {
            const requestData = {
                staffId: 'nonexistent-staff',
                availability: [
                    {
                        dayOfWeek: 1,
                        startTime: '09:00:00',
                        endTime: '17:00:00',
                        isRecurring: true,
                    },
                ],
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(null)

            const request = new NextRequest('http://localhost:3000/api/availability/staff', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(404)
            expect(data.success).toBe(false)
            expect(data.error).toContain('Staff member not found')
        })

        it('should validate availability data', async () => {
            const invalidRequestData = {
                staffId,
                availability: [
                    {
                        dayOfWeek: 8, // Invalid day of week
                        startTime: '25:00:00', // Invalid time
                        endTime: '17:00:00',
                        isRecurring: true,
                    },
                ],
            }

            const request = new NextRequest('http://localhost:3000/api/availability/staff', {
                method: 'POST',
                body: JSON.stringify(invalidRequestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
            expect(data.error).toContain('validation')
        })

        it('should return 401 when user is not authenticated', async () => {
            getServerSession.mockResolvedValue(null)

            const requestData = {
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

            const request = new NextRequest('http://localhost:3000/api/availability/staff', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data.success).toBe(false)
            expect(data.error).toBe('Unauthorized')
        })

        it('should replace existing recurring availability', async () => {
            const requestData = {
                staffId,
                availability: [
                    {
                        dayOfWeek: 1,
                        startTime: '10:00:00', // Updated time
                        endTime: '18:00:00', // Updated time
                        isRecurring: true,
                    },
                ],
            }

            const mockStaff = {
                id: staffId,
                businessId,
                displayName: 'John Doe',
            }

            const mockCreatedAvailability: StaffAvailability = {
                id: 'avail-1',
                staffId,
                businessId,
                ...requestData.availability[0],
                effectiveDate: null,
                expiryDate: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as unknown as Staff)
            asMock(mockPrisma.staffAvailability.deleteMany).mockResolvedValue({ count: 2 }) // Deleted existing
            asMock(mockPrisma.staffAvailability.create).mockResolvedValue(mockCreatedAvailability)

            const request = new NextRequest('http://localhost:3000/api/availability/staff', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(mockPrisma.staffAvailability.deleteMany).toHaveBeenCalledWith({
                where: {
                    staffId,
                    isRecurring: true,
                },
            })
        })
    })

    describe('Multi-tenant data isolation', () => {
        it('should never return staff from other businesses', async () => {
            const otherBusinessId = 'other-business-456'
            const mixedStaff: Staff[] = [
                {
                    id: staffId,
                    businessId, // User's business
                    displayName: 'John Doe',
                    
                    role: 'STAFF',
                    isActive: true,
                    workingHours: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 'other-staff-456',
                    businessId: otherBusinessId, // Other business - should not be returned
                    displayName: 'Jane Doe',
                    
                    role: 'STAFF',
                    isActive: true,
                    workingHours: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]

            asMock(mockPrisma.staff.findMany).mockResolvedValue(mixedStaff)
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([])
            asMock(mockPrisma.staffAvailabilityOverride.findMany).mockResolvedValue([])

            const request = new NextRequest('http://localhost:3000/api/availability/staff')
            await GET(request)

            // Verify the query was scoped to user's business only
            expect(mockPrisma.staff.findMany).toHaveBeenCalledWith({
                where: { businessId, isActive: true }, // Only user's business
                select: expect.any(Object),
            })
        })

        it('should prevent cross-business availability updates', async () => {
            const otherBusinessStaffId = 'other-staff-456'
            const requestData = {
                staffId: otherBusinessStaffId,
                availability: [
                    {
                        dayOfWeek: 1,
                        startTime: '09:00:00',
                        endTime: '17:00:00',
                        isRecurring: true,
                    },
                ],
            }

            const mockStaff = {
                id: otherBusinessStaffId,
                businessId: 'other-business-456', // Different business
                displayName: 'Jane Doe',
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as unknown as Staff)

            const request = new NextRequest('http://localhost:3000/api/availability/staff', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(403)
            expect(data.success).toBe(false)
            expect(data.error).toContain('not authorized')
        })
    })

    describe('Real-time availability updates', () => {
        it('should immediately reflect availability changes', async () => {
            const requestData = {
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

            const mockStaff = {
                id: staffId,
                businessId,
                displayName: 'John Doe',
            }

            const mockCreatedAvailability: StaffAvailability = {
                id: 'avail-1',
                staffId,
                businessId,
                ...requestData.availability[0],
                effectiveDate: null,
                expiryDate: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as unknown as Staff)
            asMock(mockPrisma.staffAvailability.deleteMany).mockResolvedValue({ count: 0 })
            asMock(mockPrisma.staffAvailability.create).mockResolvedValue(mockCreatedAvailability)

            const postRequest = new NextRequest('http://localhost:3000/api/availability/staff', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const postResponse = await POST(postRequest)
            expect(postResponse.status).toBe(200)

            // Immediately query to verify the change is reflected
            asMock(mockPrisma.staff.findMany).mockResolvedValue([mockStaff as Staff])
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([mockCreatedAvailability])
            asMock(mockPrisma.staffAvailabilityOverride.findMany).mockResolvedValue([])

            const getRequest = new NextRequest('http://localhost:3000/api/availability/staff')
            const getResponse = await GET(getRequest)
            const getData = await getResponse.json()

            expect(getResponse.status).toBe(200)
            expect(getData.data[0].availability).toHaveLength(1)
            expect(getData.data[0].availability[0].startTime).toBe('09:00:00')
        })
    })

    describe('Error handling and edge cases', () => {
        it('should handle database transaction failures', async () => {
            const requestData = {
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

            const mockStaff = {
                id: staffId,
                businessId,
                displayName: 'John Doe',
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as unknown as Staff)
            asMock(mockPrisma.staffAvailability.deleteMany).mockResolvedValue({ count: 0 })
            asMock(mockPrisma.staffAvailability.create).mockRejectedValue(new Error('Transaction failed'))

            const request = new NextRequest('http://localhost:3000/api/availability/staff', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.success).toBe(false)
            expect(data.error).toContain('Failed to update staff availability')
        })

        it('should handle empty availability array', async () => {
            const requestData = {
                staffId,
                availability: [], // Empty array
            }

            const mockStaff = {
                id: staffId,
                businessId,
                displayName: 'John Doe',
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as unknown as Staff)
            asMock(mockPrisma.staffAvailability.deleteMany).mockResolvedValue({ count: 2 }) // Clear existing

            const request = new NextRequest('http://localhost:3000/api/availability/staff', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data).toHaveLength(0)
            expect(mockPrisma.staffAvailability.deleteMany).toHaveBeenCalled()
            expect(mockPrisma.staffAvailability.create).not.toHaveBeenCalled()
        })
    })
})