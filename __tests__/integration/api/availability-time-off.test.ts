import { GET, POST } from '@/app/api/availability/time-off/route'
import { prisma } from '@/lib/prisma'
import { Staff, TimeOffRequest, TimeOffStatus } from '@prisma/client'
import { NextRequest } from 'next/server'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        staff: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        timeOffRequest: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        appointment: {
            findMany: jest.fn(),
        },
    },
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
    getServerSession: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const { getServerSession } = require('@/lib/auth')

describe('/api/availability/time-off Integration Tests', () => {
    const businessId = 'business-123'
    const staffId = 'staff-123'
    const approverId = 'approver-123'
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

    describe('GET /api/availability/time-off', () => {
        it('should return time-off requests for business', async () => {
            const mockTimeOffRequests = [
                {
                    id: 'request-1',
                    staffId,
                    businessId,
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-17'),
                    reason: 'Vacation',
                    status: TimeOffStatus.PENDING,
                    approvedBy: null,
                    approvedAt: null,
                    denialReason: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    staff: {
                        id: staffId,
                        name: 'John Doe',
                        email: 'john@example.com',
                    },
                    approver: null,
                },
            ]

            mockPrisma.timeOffRequest.findMany.mockResolvedValue(mockTimeOffRequests as any)

            const request = new NextRequest('http://localhost:3000/api/availability/time-off')
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data).toHaveLength(1)
            expect(data.data[0].id).toBe('request-1')
            expect(mockPrisma.timeOffRequest.findMany).toHaveBeenCalledWith({
                where: { businessId },
                orderBy: { createdAt: 'desc' },
                include: {
                    staff: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    approver: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            })
        })

        it('should filter by status when provided', async () => {
            const mockTimeOffRequests = [
                {
                    id: 'request-1',
                    staffId,
                    businessId,
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-17'),
                    reason: 'Vacation',
                    status: TimeOffStatus.APPROVED,
                    approvedBy: approverId,
                    approvedAt: new Date(),
                    denialReason: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    staff: {
                        id: staffId,
                        name: 'John Doe',
                        email: 'john@example.com',
                    },
                    approver: {
                        id: approverId,
                        name: 'Manager',
                        email: 'manager@example.com',
                    },
                },
            ]

            mockPrisma.timeOffRequest.findMany.mockResolvedValue(mockTimeOffRequests as any)

            const request = new NextRequest('http://localhost:3000/api/availability/time-off?status=approved')
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(mockPrisma.timeOffRequest.findMany).toHaveBeenCalledWith({
                where: {
                    businessId,
                    status: TimeOffStatus.APPROVED,
                },
                orderBy: { createdAt: 'desc' },
                include: expect.any(Object),
            })
        })

        it('should filter by staff when provided', async () => {
            const mockTimeOffRequests = [
                {
                    id: 'request-1',
                    staffId,
                    businessId,
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-17'),
                    reason: 'Vacation',
                    status: TimeOffStatus.PENDING,
                    approvedBy: null,
                    approvedAt: null,
                    denialReason: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    staff: {
                        id: staffId,
                        name: 'John Doe',
                        email: 'john@example.com',
                    },
                    approver: null,
                },
            ]

            mockPrisma.timeOffRequest.findMany.mockResolvedValue(mockTimeOffRequests as any)

            const request = new NextRequest(`http://localhost:3000/api/availability/time-off?staffId=${staffId}`)
            const response = await GET(request)

            expect(response.status).toBe(200)
            expect(mockPrisma.timeOffRequest.findMany).toHaveBeenCalledWith({
                where: {
                    businessId,
                    staffId,
                },
                orderBy: { createdAt: 'desc' },
                include: expect.any(Object),
            })
        })

        it('should enforce business context isolation', async () => {
            const otherBusinessId = 'other-business-456'
            const mockTimeOffRequests = [
                {
                    id: 'request-1',
                    staffId: 'other-staff-456',
                    businessId: otherBusinessId, // Different business
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-17'),
                    reason: 'Vacation',
                    status: TimeOffStatus.PENDING,
                    approvedBy: null,
                    approvedAt: null,
                    denialReason: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]

            mockPrisma.timeOffRequest.findMany.mockResolvedValue(mockTimeOffRequests as any)

            const request = new NextRequest('http://localhost:3000/api/availability/time-off')
            const response = await GET(request)

            // Should only query for the authenticated user's business
            expect(mockPrisma.timeOffRequest.findMany).toHaveBeenCalledWith({
                where: { businessId }, // User's business, not the other business
                orderBy: { createdAt: 'desc' },
                include: expect.any(Object),
            })
        })

        it('should return 401 when user is not authenticated', async () => {
            getServerSession.mockResolvedValue(null)

            const request = new NextRequest('http://localhost:3000/api/availability/time-off')
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data.success).toBe(false)
            expect(data.error).toBe('Unauthorized')
        })
    })

    describe('POST /api/availability/time-off', () => {
        it('should create time-off request for authenticated business staff', async () => {
            const requestData = {
                staffId,
                startDate: '2024-01-15',
                endDate: '2024-01-17',
                reason: 'Vacation',
            }

            const mockStaff = {
                id: staffId,
                businessId,
                name: 'John Doe',
            }

            const mockCreatedRequest: TimeOffRequest = {
                id: 'request-1',
                staffId,
                businessId,
                startDate: new Date(requestData.startDate),
                endDate: new Date(requestData.endDate),
                reason: requestData.reason,
                status: TimeOffStatus.PENDING,
                approvedBy: null,
                approvedAt: null,
                denialReason: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.staff.findUnique.mockResolvedValue(mockStaff as Staff)
            mockPrisma.appointment.findMany.mockResolvedValue([]) // No conflicts
            mockPrisma.timeOffRequest.findMany.mockResolvedValue([]) // No conflicts
            mockPrisma.timeOffRequest.create.mockResolvedValue(mockCreatedRequest)

            const request = new NextRequest('http://localhost:3000/api/availability/time-off', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(201)
            expect(data.success).toBe(true)
            expect(data.data.id).toBe('request-1')
            expect(data.data.status).toBe(TimeOffStatus.PENDING)
            expect(mockPrisma.staff.findUnique).toHaveBeenCalledWith({
                where: { id: staffId },
                select: { id: true, businessId: true, name: true },
            })
            expect(mockPrisma.timeOffRequest.create).toHaveBeenCalledWith({
                data: {
                    staffId,
                    businessId,
                    startDate: new Date(requestData.startDate),
                    endDate: new Date(requestData.endDate),
                    reason: requestData.reason,
                    status: TimeOffStatus.PENDING,
                },
            })
        })

        it('should validate staff belongs to authenticated business', async () => {
            const otherBusinessId = 'other-business-456'
            const requestData = {
                staffId,
                startDate: '2024-01-15',
                endDate: '2024-01-17',
                reason: 'Vacation',
            }

            const mockStaff = {
                id: staffId,
                businessId: otherBusinessId, // Different business
                name: 'John Doe',
            }

            mockPrisma.staff.findUnique.mockResolvedValue(mockStaff as Staff)

            const request = new NextRequest('http://localhost:3000/api/availability/time-off', {
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

        it('should detect conflicts with existing appointments', async () => {
            const requestData = {
                staffId,
                startDate: '2024-01-15',
                endDate: '2024-01-17',
                reason: 'Vacation',
            }

            const mockStaff = {
                id: staffId,
                businessId,
                name: 'John Doe',
            }

            const mockConflictingAppointments = [
                {
                    id: 'appointment-1',
                    staffId,
                    startTime: new Date('2024-01-16T10:00:00Z'),
                    endTime: new Date('2024-01-16T11:00:00Z'),
                    client: { name: 'Client Name' },
                    service: { name: 'Service Name' },
                },
            ]

            mockPrisma.staff.findUnique.mockResolvedValue(mockStaff as Staff)
            mockPrisma.appointment.findMany.mockResolvedValue(mockConflictingAppointments)
            mockPrisma.timeOffRequest.findMany.mockResolvedValue([])

            const request = new NextRequest('http://localhost:3000/api/availability/time-off', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(409)
            expect(data.success).toBe(false)
            expect(data.error).toContain('conflicts')
            expect(data.conflicts).toHaveLength(1)
            expect(data.conflicts[0].type).toBe('APPOINTMENT')
        })

        it('should validate request data', async () => {
            const invalidRequestData = {
                staffId,
                startDate: '2024-01-17', // End before start
                endDate: '2024-01-15',
                reason: 'Invalid dates',
            }

            const request = new NextRequest('http://localhost:3000/api/availability/time-off', {
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

        it('should return 404 when staff not found', async () => {
            const requestData = {
                staffId: 'nonexistent-staff',
                startDate: '2024-01-15',
                endDate: '2024-01-17',
                reason: 'Vacation',
            }

            mockPrisma.staff.findUnique.mockResolvedValue(null)

            const request = new NextRequest('http://localhost:3000/api/availability/time-off', {
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

        it('should return 401 when user is not authenticated', async () => {
            getServerSession.mockResolvedValue(null)

            const requestData = {
                staffId,
                startDate: '2024-01-15',
                endDate: '2024-01-17',
                reason: 'Vacation',
            }

            const request = new NextRequest('http://localhost:3000/api/availability/time-off', {
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
    })

    describe('Multi-tenant data isolation', () => {
        it('should never return time-off requests from other businesses', async () => {
            const otherBusinessId = 'other-business-456'
            const mixedTimeOffRequests = [
                {
                    id: 'request-1',
                    staffId,
                    businessId, // User's business
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-17'),
                    reason: 'Vacation',
                    status: TimeOffStatus.PENDING,
                    staff: { id: staffId, name: 'John Doe', email: 'john@example.com' },
                },
                {
                    id: 'request-2',
                    staffId: 'other-staff-456',
                    businessId: otherBusinessId, // Other business - should not be returned
                    startDate: new Date('2024-01-20'),
                    endDate: new Date('2024-01-22'),
                    reason: 'Personal',
                    status: TimeOffStatus.APPROVED,
                    staff: { id: 'other-staff-456', name: 'Jane Doe', email: 'jane@example.com' },
                },
            ]

            mockPrisma.timeOffRequest.findMany.mockResolvedValue(mixedTimeOffRequests as any)

            const request = new NextRequest('http://localhost:3000/api/availability/time-off')
            const response = await GET(request)

            // Verify the query was scoped to user's business only
            expect(mockPrisma.timeOffRequest.findMany).toHaveBeenCalledWith({
                where: { businessId }, // Only user's business
                orderBy: { createdAt: 'desc' },
                include: expect.any(Object),
            })
        })

        it('should prevent cross-business time-off requests', async () => {
            const otherBusinessStaffId = 'other-staff-456'
            const requestData = {
                staffId: otherBusinessStaffId,
                startDate: '2024-01-15',
                endDate: '2024-01-17',
                reason: 'Vacation',
            }

            const mockStaff = {
                id: otherBusinessStaffId,
                businessId: 'other-business-456', // Different business
                name: 'Jane Doe',
            }

            mockPrisma.staff.findUnique.mockResolvedValue(mockStaff as Staff)

            const request = new NextRequest('http://localhost:3000/api/availability/time-off', {
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
        it('should immediately reflect time-off requests in availability', async () => {
            const requestData = {
                staffId,
                startDate: '2024-01-15',
                endDate: '2024-01-17',
                reason: 'Vacation',
            }

            const mockStaff = {
                id: staffId,
                businessId,
                name: 'John Doe',
            }

            const mockCreatedRequest: TimeOffRequest = {
                id: 'request-1',
                staffId,
                businessId,
                startDate: new Date(requestData.startDate),
                endDate: new Date(requestData.endDate),
                reason: requestData.reason,
                status: TimeOffStatus.PENDING,
                approvedBy: null,
                approvedAt: null,
                denialReason: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.staff.findUnique.mockResolvedValue(mockStaff as Staff)
            mockPrisma.appointment.findMany.mockResolvedValue([])
            mockPrisma.timeOffRequest.findMany.mockResolvedValue([])
            mockPrisma.timeOffRequest.create.mockResolvedValue(mockCreatedRequest)

            const postRequest = new NextRequest('http://localhost:3000/api/availability/time-off', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const postResponse = await POST(postRequest)
            expect(postResponse.status).toBe(201)

            // Immediately query to verify the request is reflected
            mockPrisma.timeOffRequest.findMany.mockResolvedValue([
                {
                    ...mockCreatedRequest,
                    staff: { id: staffId, name: 'John Doe', email: 'john@example.com' },
                    approver: null,
                },
            ] as any)

            const getRequest = new NextRequest('http://localhost:3000/api/availability/time-off')
            const getResponse = await GET(getRequest)
            const getData = await getResponse.json()

            expect(getResponse.status).toBe(200)
            expect(getData.data).toHaveLength(1)
            expect(getData.data[0].id).toBe('request-1')
            expect(getData.data[0].status).toBe(TimeOffStatus.PENDING)
        })
    })

    describe('Error handling and edge cases', () => {
        it('should handle database transaction failures', async () => {
            const requestData = {
                staffId,
                startDate: '2024-01-15',
                endDate: '2024-01-17',
                reason: 'Vacation',
            }

            const mockStaff = {
                id: staffId,
                businessId,
                name: 'John Doe',
            }

            mockPrisma.staff.findUnique.mockResolvedValue(mockStaff as Staff)
            mockPrisma.appointment.findMany.mockResolvedValue([])
            mockPrisma.timeOffRequest.findMany.mockResolvedValue([])
            mockPrisma.timeOffRequest.create.mockRejectedValue(new Error('Transaction failed'))

            const request = new NextRequest('http://localhost:3000/api/availability/time-off', {
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
            expect(data.error).toContain('Failed to create time-off request')
        })

        it('should handle malformed JSON gracefully', async () => {
            const request = new NextRequest('http://localhost:3000/api/availability/time-off', {
                method: 'POST',
                body: 'invalid json',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
            expect(data.error).toContain('Invalid JSON')
        })

        it('should handle same-day time-off requests', async () => {
            const requestData = {
                staffId,
                startDate: '2024-01-15',
                endDate: '2024-01-15', // Same day
                reason: 'Sick day',
            }

            const mockStaff = {
                id: staffId,
                businessId,
                name: 'John Doe',
            }

            const mockCreatedRequest: TimeOffRequest = {
                id: 'request-1',
                staffId,
                businessId,
                startDate: new Date(requestData.startDate),
                endDate: new Date(requestData.endDate),
                reason: requestData.reason,
                status: TimeOffStatus.PENDING,
                approvedBy: null,
                approvedAt: null,
                denialReason: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.staff.findUnique.mockResolvedValue(mockStaff as Staff)
            mockPrisma.appointment.findMany.mockResolvedValue([])
            mockPrisma.timeOffRequest.findMany.mockResolvedValue([])
            mockPrisma.timeOffRequest.create.mockResolvedValue(mockCreatedRequest)

            const request = new NextRequest('http://localhost:3000/api/availability/time-off', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(201)
            expect(data.success).toBe(true)
            expect(data.data.startDate).toBe(data.data.endDate)
        })
    })
})