import { GET } from '@/app/api/availability/conflicts/route'
import { prisma } from '@/lib/prisma'
import { Service, Staff } from '@prisma/client'
import { NextRequest } from 'next/server'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        staff: {
            findFirst: jest.fn(),
        },
        service: {
            findMany: jest.fn(),
        },
    },
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
    auth: jest.fn(),
}))

// Mock conflict detection engine
jest.mock('@/lib/services/conflict-detection-engine', () => ({
    ConflictDetectionEngine: {
        detectConflicts: jest.fn(),
    },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const { auth } = require('@/lib/auth')
const { ConflictDetectionEngine } = require('@/lib/services/conflict-detection-engine')

describe('/api/availability/conflicts Integration Tests', () => {
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
    })

    describe('GET /api/availability/conflicts', () => {
        it('should detect conflicts for appointment request', async () => {
            const mockStaff: Partial<Staff> = {
                id: staffId,
                name: 'John Doe',
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
                    suggestedResolutions: [
                        {
                            type: 'ALTERNATIVE_TIME',
                            description: 'Book at a different time',
                            alternativeSlots: [
                                {
                                    startTime: new Date('2024-01-15T11:00:00Z'),
                                    endTime: new Date('2024-01-15T12:00:00Z'),
                                    staffId,
                                    staffName: 'John Doe',
                                },
                            ],
                        },
                    ],
                },
            ]

            mockPrisma.staff.findFirst.mockResolvedValue(mockStaff as Staff)
            ConflictDetectionEngine.detectConflicts.mockResolvedValue(mockConflicts)

            const request = new NextRequest(
                `http://localhost:3000/api/availability/conflicts?staffId=${staffId}&startTime=2024-01-15T09:00:00Z&endTime=2024-01-15T10:00:00Z`
            )
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.hasConflicts).toBe(true)
            expect(data.conflictCount).toBe(1)
            expect(data.conflicts).toHaveLength(1)
            expect(data.conflicts[0].type).toBe('APPOINTMENT_CONFLICT')
            expect(data.conflicts[0].severity).toBe('ERROR')
            expect(data.request.staffId).toBe(staffId)
            expect(data.request.staffName).toBe('John Doe')
        })

        it('should return no conflicts when slot is available', async () => {
            const mockStaff: Partial<Staff> = {
                id: staffId,
                name: 'John Doe',
            }

            mockPrisma.staff.findFirst.mockResolvedValue(mockStaff as Staff)
            ConflictDetectionEngine.detectConflicts.mockResolvedValue([])

            const request = new NextRequest(
                `http://localhost:3000/api/availability/conflicts?staffId=${staffId}&startTime=2024-01-15T09:00:00Z&endTime=2024-01-15T10:00:00Z`
            )
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.hasConflicts).toBe(false)
            expect(data.conflictCount).toBe(0)
            expect(data.conflicts).toHaveLength(0)
        })

        it('should validate service IDs when provided', async () => {
            const mockStaff: Partial<Staff> = {
                id: staffId,
                name: 'John Doe',
            }

            const mockServices: Partial<Service>[] = [
                {
                    id: serviceId,
                    businessId,
                    name: 'Haircut',
                    duration: 60,
                },
            ]

            mockPrisma.staff.findFirst.mockResolvedValue(mockStaff as Staff)
            mockPrisma.service.findMany.mockResolvedValue(mockServices as Service[])
            ConflictDetectionEngine.detectConflicts.mockResolvedValue([])

            const request = new NextRequest(
                `http://localhost:3000/api/availability/conflicts?staffId=${staffId}&startTime=2024-01-15T09:00:00Z&endTime=2024-01-15T10:00:00Z&serviceIds=${serviceId}`
            )
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
                where: {
                    id: { in: [serviceId] },
                    businessId,
                },
            })
        })

        it('should handle multiple service IDs', async () => {
            const serviceId2 = 'service-456'
            const mockStaff: Partial<Staff> = {
                id: staffId,
                name: 'John Doe',
            }

            const mockServices: Partial<Service>[] = [
                {
                    id: serviceId,
                    businessId,
                    name: 'Haircut',
                    duration: 60,
                },
                {
                    id: serviceId2,
                    businessId,
                    name: 'Shampoo',
                    duration: 30,
                },
            ]

            mockPrisma.staff.findFirst.mockResolvedValue(mockStaff as Staff)
            mockPrisma.service.findMany.mockResolvedValue(mockServices as Service[])
            ConflictDetectionEngine.detectConflicts.mockResolvedValue([])

            const request = new NextRequest(
                `http://localhost:3000/api/availability/conflicts?staffId=${staffId}&startTime=2024-01-15T09:00:00Z&endTime=2024-01-15T10:00:00Z&serviceIds=${serviceId},${serviceId2}`
            )
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
                where: {
                    id: { in: [serviceId, serviceId2] },
                    businessId,
                },
            })
        })

        it('should exclude specific appointment from conflict check', async () => {
            const excludeAppointmentId = 'appointment-to-exclude'
            const mockStaff: Partial<Staff> = {
                id: staffId,
                name: 'John Doe',
            }

            mockPrisma.staff.findFirst.mockResolvedValue(mockStaff as Staff)
            ConflictDetectionEngine.detectConflicts.mockResolvedValue([])

            const request = new NextRequest(
                `http://localhost:3000/api/availability/conflicts?staffId=${staffId}&startTime=2024-01-15T09:00:00Z&endTime=2024-01-15T10:00:00Z&excludeAppointmentId=${excludeAppointmentId}`
            )
            const response = await GET(request)

            expect(response.status).toBe(200)
            expect(ConflictDetectionEngine.detectConflicts).toHaveBeenCalledWith({
                businessId,
                staffId,
                startTime: new Date('2024-01-15T09:00:00Z'),
                endTime: new Date('2024-01-15T10:00:00Z'),
                serviceIds: [],
                excludeAppointmentId,
            })
        })

        it('should return 401 when user is not authenticated', async () => {
            auth.mockResolvedValue(null)

            const request = new NextRequest(
                `http://localhost:3000/api/availability/conflicts?staffId=${staffId}&startTime=2024-01-15T09:00:00Z&endTime=2024-01-15T10:00:00Z`
            )
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data.error).toBe('Business context required')
        })

        it('should return 400 when required parameters are missing', async () => {
            const request = new NextRequest('http://localhost:3000/api/availability/conflicts')
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('staffId, startTime, and endTime parameters are required')
        })

        it('should return 400 when parameters are invalid', async () => {
            const request = new NextRequest(
                `http://localhost:3000/api/availability/conflicts?staffId=invalid-uuid&startTime=invalid-date&endTime=2024-01-15T10:00:00Z`
            )
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Invalid query parameters')
        })

        it('should return 404 when staff not found or not authorized', async () => {
            mockPrisma.staff.findFirst.mockResolvedValue(null)

            const request = new NextRequest(
                `http://localhost:3000/api/availability/conflicts?staffId=${staffId}&startTime=2024-01-15T09:00:00Z&endTime=2024-01-15T10:00:00Z`
            )
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(404)
            expect(data.error).toBe('Staff member not found or not authorized')
        })

        it('should return 404 when service not found or not authorized', async () => {
            const mockStaff: Partial<Staff> = {
                id: staffId,
                name: 'John Doe',
            }

            mockPrisma.staff.findFirst.mockResolvedValue(mockStaff as Staff)
            mockPrisma.service.findMany.mockResolvedValue([]) // No services found

            const request = new NextRequest(
                `http://localhost:3000/api/availability/conflicts?staffId=${staffId}&startTime=2024-01-15T09:00:00Z&endTime=2024-01-15T10:00:00Z&serviceIds=${serviceId}`
            )
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(404)
            expect(data.error).toBe('One or more services not found or not authorized')
        })

        it('should enforce business context isolation for staff', async () => {
            const otherBusinessStaffId = 'other-staff-456'
            mockPrisma.staff.findFirst.mockResolvedValue(null) // Not found in user's business

            const request = new NextRequest(
                `http://localhost:3000/api/availability/conflicts?staffId=${otherBusinessStaffId}&startTime=2024-01-15T09:00:00Z&endTime=2024-01-15T10:00:00Z`
            )
            const response = await GET(request)

            expect(response.status).toBe(404)
            expect(mockPrisma.staff.findFirst).toHaveBeenCalledWith({
                where: { id: otherBusinessStaffId, businessId },
                select: { id: true, name: true },
            })
        })

        it('should enforce business context isolation for services', async () => {
            const otherBusinessServiceId = 'other-service-456'
            const mockStaff: Partial<Staff> = {
                id: staffId,
                name: 'John Doe',
            }

            mockPrisma.staff.findFirst.mockResolvedValue(mockStaff as Staff)
            mockPrisma.service.findMany.mockResolvedValue([]) // Not found in user's business

            const request = new NextRequest(
                `http://localhost:3000/api/availability/conflicts?staffId=${staffId}&startTime=2024-01-15T09:00:00Z&endTime=2024-01-15T10:00:00Z&serviceIds=${otherBusinessServiceId}`
            )
            const response = await GET(request)

            expect(response.status).toBe(404)
            expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
                where: {
                    id: { in: [otherBusinessServiceId] },
                    businessId, // Only searches in user's business
                },
            })
        })

        it('should handle conflict detection engine errors gracefully', async () => {
            const mockStaff: Partial<Staff> = {
                id: staffId,
                name: 'John Doe',
            }

            mockPrisma.staff.findFirst.mockResolvedValue(mockStaff as Staff)
            ConflictDetectionEngine.detectConflicts.mockRejectedValue(new Error('Conflict detection failed'))

            const request = new NextRequest(
                `http://localhost:3000/api/availability/conflicts?staffId=${staffId}&startTime=2024-01-15T09:00:00Z&endTime=2024-01-15T10:00:00Z`
            )
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBe('Failed to check conflicts')
            expect(data.details).toContain('Conflict detection failed')
        })

        it('should provide detailed conflict information with resolutions', async () => {
            const mockStaff: Partial<Staff> = {
                id: staffId,
                name: 'John Doe',
            }

            const mockConflicts = [
                {
                    type: 'BUSINESS_HOURS_CONFLICT',
                    severity: 'ERROR',
                    message: 'Appointment is outside business hours',
                    details: {
                        businessHours: {
                            openTime: '09:00',
                            closeTime: '17:00',
                        },
                        requestedTime: {
                            startTime: '2024-01-15T18:00:00Z',
                            endTime: '2024-01-15T19:00:00Z',
                        },
                    },
                    suggestedResolutions: [
                        {
                            type: 'ALTERNATIVE_TIME',
                            description: 'Book during business hours',
                            alternativeSlots: [
                                {
                                    startTime: new Date('2024-01-15T16:00:00Z'),
                                    endTime: new Date('2024-01-15T17:00:00Z'),
                                    staffId,
                                    staffName: 'John Doe',
                                },
                            ],
                        },
                        {
                            type: 'ALTERNATIVE_STAFF',
                            description: 'Book with different staff member',
                            alternativeStaff: [
                                {
                                    staffId: 'staff-456',
                                    staffName: 'Jane Smith',
                                    availableSlots: [
                                        {
                                            startTime: new Date('2024-01-15T18:00:00Z'),
                                            endTime: new Date('2024-01-15T19:00:00Z'),
                                            staffId: 'staff-456',
                                            staffName: 'Jane Smith',
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ]

            mockPrisma.staff.findFirst.mockResolvedValue(mockStaff as Staff)
            ConflictDetectionEngine.detectConflicts.mockResolvedValue(mockConflicts)

            const request = new NextRequest(
                `http://localhost:3000/api/availability/conflicts?staffId=${staffId}&startTime=2024-01-15T18:00:00Z&endTime=2024-01-15T19:00:00Z`
            )
            const response = await GET(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.hasConflicts).toBe(true)
            expect(data.conflicts[0].type).toBe('BUSINESS_HOURS_CONFLICT')
            expect(data.conflicts[0].suggestedResolutions).toHaveLength(2)
            expect(data.conflicts[0].suggestedResolutions[0].type).toBe('ALTERNATIVE_TIME')
            expect(data.conflicts[0].suggestedResolutions[1].type).toBe('ALTERNATIVE_STAFF')
        })
    })

    describe('Real-time conflict detection', () => {
        it('should detect conflicts that appear between requests', async () => {
            const mockStaff: Partial<Staff> = {
                id: staffId,
                name: 'John Doe',
            }

            mockPrisma.staff.findFirst.mockResolvedValue(mockStaff as Staff)

            // First request: no conflicts
            ConflictDetectionEngine.detectConflicts.mockResolvedValueOnce([])

            const request1 = new NextRequest(
                `http://localhost:3000/api/availability/conflicts?staffId=${staffId}&startTime=2024-01-15T09:00:00Z&endTime=2024-01-15T10:00:00Z`
            )
            const response1 = await GET(request1)
            const data1 = await response1.json()

            expect(response1.status).toBe(200)
            expect(data1.hasConflicts).toBe(false)

            // Second request: conflict appears (simulating real-time booking)
            const newConflict = [
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

            ConflictDetectionEngine.detectConflicts.mockResolvedValueOnce(newConflict)

            const request2 = new NextRequest(
                `http://localhost:3000/api/availability/conflicts?staffId=${staffId}&startTime=2024-01-15T09:00:00Z&endTime=2024-01-15T10:00:00Z`
            )
            const response2 = await GET(request2)
            const data2 = await response2.json()

            expect(response2.status).toBe(200)
            expect(data2.hasConflicts).toBe(true)
            expect(data2.conflictCount).toBe(1)
        })
    })
})