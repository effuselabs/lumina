import { prisma } from '@/lib/prisma'
import { TimeOffRequestRepository } from '@/lib/repositories/time-off-request-repository'
import { TimeOffRequest, TimeOffStatus } from '@prisma/client'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        timeOffRequest: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        appointment: {
            findMany: jest.fn(),
        },
    },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('TimeOffRequestRepository', () => {
    let repository: TimeOffRequestRepository
    const staffId = 'staff-123'
    const businessId = 'business-123'
    const approverId = 'approver-123'

    beforeEach(() => {
        repository = new TimeOffRequestRepository()
        jest.clearAllMocks()
    })

    describe('createTimeOffRequest', () => {
        it('should create a new time-off request', async () => {
            const requestData = {
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-01-17'),
                reason: 'Vacation',
            }

            const mockRequest: TimeOffRequest = {
                id: 'request-1',
                staffId,
                businessId,
                ...requestData,
                status: TimeOffStatus.PENDING,
                approvedBy: null,
                approvedAt: null,
                denialReason: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.timeOffRequest.create.mockResolvedValue(mockRequest)

            const result = await repository.createTimeOffRequest(staffId, businessId, requestData)

            expect(mockPrisma.timeOffRequest.create).toHaveBeenCalledWith({
                data: {
                    staffId,
                    businessId,
                    ...requestData,
                    status: TimeOffStatus.PENDING,
                },
            })
            expect(result).toEqual(mockRequest)
        })

        it('should handle multi-day requests', async () => {
            const requestData = {
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-01-19'), // 5 days
                reason: 'Extended vacation',
            }

            const mockRequest: TimeOffRequest = {
                id: 'request-1',
                staffId,
                businessId,
                ...requestData,
                status: TimeOffStatus.PENDING,
                approvedBy: null,
                approvedAt: null,
                denialReason: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.timeOffRequest.create.mockResolvedValue(mockRequest)

            const result = await repository.createTimeOffRequest(staffId, businessId, requestData)

            expect(result.startDate).toEqual(requestData.startDate)
            expect(result.endDate).toEqual(requestData.endDate)
        })
    })

    describe('getTimeOffRequests', () => {
        it('should return all time-off requests for business', async () => {
            const mockRequests: TimeOffRequest[] = [
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
                },
            ]

            mockPrisma.timeOffRequest.findMany.mockResolvedValue(mockRequests)

            const result = await repository.getTimeOffRequests(businessId)

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
            expect(result).toEqual(mockRequests)
        })

        it('should filter by status when provided', async () => {
            const mockRequests: TimeOffRequest[] = [
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
                },
            ]

            mockPrisma.timeOffRequest.findMany.mockResolvedValue(mockRequests)

            const result = await repository.getTimeOffRequests(businessId, TimeOffStatus.APPROVED)

            expect(mockPrisma.timeOffRequest.findMany).toHaveBeenCalledWith({
                where: {
                    businessId,
                    status: TimeOffStatus.APPROVED,
                },
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
            expect(result).toEqual(mockRequests)
        })

        it('should filter by staff when provided', async () => {
            const mockRequests: TimeOffRequest[] = [
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
                },
            ]

            mockPrisma.timeOffRequest.findMany.mockResolvedValue(mockRequests)

            const result = await repository.getTimeOffRequestsForStaff(staffId)

            expect(mockPrisma.timeOffRequest.findMany).toHaveBeenCalledWith({
                where: { staffId },
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
            expect(result).toEqual(mockRequests)
        })
    })

    describe('approveTimeOff', () => {
        it('should approve a time-off request', async () => {
            const requestId = 'request-1'
            const approvalDate = new Date()

            const mockApprovedRequest: TimeOffRequest = {
                id: requestId,
                staffId,
                businessId,
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-01-17'),
                reason: 'Vacation',
                status: TimeOffStatus.APPROVED,
                approvedBy: approverId,
                approvedAt: approvalDate,
                denialReason: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.timeOffRequest.update.mockResolvedValue(mockApprovedRequest)

            const result = await repository.approveTimeOff(requestId, approverId)

            expect(mockPrisma.timeOffRequest.update).toHaveBeenCalledWith({
                where: { id: requestId },
                data: {
                    status: TimeOffStatus.APPROVED,
                    approvedBy: approverId,
                    approvedAt: expect.any(Date),
                    denialReason: null,
                    updatedAt: expect.any(Date),
                },
            })
            expect(result).toEqual(mockApprovedRequest)
        })
    })

    describe('denyTimeOff', () => {
        it('should deny a time-off request with reason', async () => {
            const requestId = 'request-1'
            const denialReason = 'Insufficient coverage'

            const mockDeniedRequest: TimeOffRequest = {
                id: requestId,
                staffId,
                businessId,
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-01-17'),
                reason: 'Vacation',
                status: TimeOffStatus.DENIED,
                approvedBy: null,
                approvedAt: null,
                denialReason,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.timeOffRequest.update.mockResolvedValue(mockDeniedRequest)

            const result = await repository.denyTimeOff(requestId, approverId, denialReason)

            expect(mockPrisma.timeOffRequest.update).toHaveBeenCalledWith({
                where: { id: requestId },
                data: {
                    status: TimeOffStatus.DENIED,
                    denialReason,
                    updatedAt: expect.any(Date),
                },
            })
            expect(result).toEqual(mockDeniedRequest)
        })
    })

    describe('checkTimeOffConflicts', () => {
        it('should detect conflicts with existing appointments', async () => {
            const startDate = new Date('2024-01-15')
            const endDate = new Date('2024-01-17')

            const mockConflictingAppointments = [
                {
                    id: 'appointment-1',
                    staffId,
                    startTime: new Date('2024-01-16T10:00:00Z'),
                    endTime: new Date('2024-01-16T11:00:00Z'),
                    clientName: 'John Doe',
                    serviceName: 'Haircut',
                },
            ]

            mockPrisma.appointment.findMany.mockResolvedValue(mockConflictingAppointments)

            const result = await repository.checkTimeOffConflicts(staffId, startDate, endDate)

            expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
                where: {
                    staffId,
                    startTime: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: {
                        not: 'CANCELLED',
                    },
                },
                select: {
                    id: true,
                    startTime: true,
                    endTime: true,
                    client: {
                        select: {
                            name: true,
                        },
                    },
                    service: {
                        select: {
                            name: true,
                        },
                    },
                },
            })
            expect(result).toHaveLength(1)
            expect(result[0].type).toBe('APPOINTMENT_CONFLICT')
        })

        it('should detect conflicts with approved time-off requests', async () => {
            const startDate = new Date('2024-01-15')
            const endDate = new Date('2024-01-17')

            const mockConflictingTimeOff: TimeOffRequest[] = [
                {
                    id: 'request-2',
                    staffId,
                    businessId,
                    startDate: new Date('2024-01-16'),
                    endDate: new Date('2024-01-18'),
                    reason: 'Personal',
                    status: TimeOffStatus.APPROVED,
                    approvedBy: approverId,
                    approvedAt: new Date(),
                    denialReason: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]

            mockPrisma.appointment.findMany.mockResolvedValue([])
            mockPrisma.timeOffRequest.findMany.mockResolvedValue(mockConflictingTimeOff)

            const result = await repository.checkTimeOffConflicts(staffId, startDate, endDate)

            expect(result).toHaveLength(1)
            expect(result[0].type).toBe('TIME_OFF_CONFLICT')
        })

        it('should return empty array when no conflicts', async () => {
            const startDate = new Date('2024-01-15')
            const endDate = new Date('2024-01-17')

            mockPrisma.appointment.findMany.mockResolvedValue([])
            mockPrisma.timeOffRequest.findMany.mockResolvedValue([])

            const result = await repository.checkTimeOffConflicts(staffId, startDate, endDate)

            expect(result).toHaveLength(0)
        })
    })

    describe('getTimeOffRequest', () => {
        it('should return specific time-off request', async () => {
            const requestId = 'request-1'
            const mockRequest: TimeOffRequest = {
                id: requestId,
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
            }

            mockPrisma.timeOffRequest.findUnique.mockResolvedValue(mockRequest)

            const result = await repository.getTimeOffRequest(requestId)

            expect(mockPrisma.timeOffRequest.findUnique).toHaveBeenCalledWith({
                where: { id: requestId },
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
            expect(result).toEqual(mockRequest)
        })

        it('should return null when request not found', async () => {
            const requestId = 'nonexistent-request'

            mockPrisma.timeOffRequest.findUnique.mockResolvedValue(null)

            const result = await repository.getTimeOffRequest(requestId)

            expect(result).toBeNull()
        })
    })

    describe('updateTimeOffRequest', () => {
        it('should update time-off request details', async () => {
            const requestId = 'request-1'
            const updateData = {
                startDate: new Date('2024-01-16'),
                endDate: new Date('2024-01-18'),
                reason: 'Updated vacation dates',
            }

            const mockUpdatedRequest: TimeOffRequest = {
                id: requestId,
                staffId,
                businessId,
                ...updateData,
                status: TimeOffStatus.PENDING,
                approvedBy: null,
                approvedAt: null,
                denialReason: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.timeOffRequest.update.mockResolvedValue(mockUpdatedRequest)

            const result = await repository.updateTimeOffRequest(requestId, updateData)

            expect(mockPrisma.timeOffRequest.update).toHaveBeenCalledWith({
                where: { id: requestId },
                data: {
                    ...updateData,
                    updatedAt: expect.any(Date),
                },
            })
            expect(result).toEqual(mockUpdatedRequest)
        })
    })

    describe('deleteTimeOffRequest', () => {
        it('should delete time-off request', async () => {
            const requestId = 'request-1'
            const mockDeletedRequest: TimeOffRequest = {
                id: requestId,
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
            }

            mockPrisma.timeOffRequest.delete.mockResolvedValue(mockDeletedRequest)

            const result = await repository.deleteTimeOffRequest(requestId)

            expect(mockPrisma.timeOffRequest.delete).toHaveBeenCalledWith({
                where: { id: requestId },
            })
            expect(result).toEqual(mockDeletedRequest)
        })
    })

    describe('error handling', () => {
        it('should handle database errors gracefully', async () => {
            mockPrisma.timeOffRequest.findMany.mockRejectedValue(new Error('Database error'))

            await expect(repository.getTimeOffRequests(businessId))
                .rejects.toThrow('Database error')
        })

        it('should validate required parameters', async () => {
            await expect(repository.createTimeOffRequest('', businessId, {
                startDate: new Date(),
                endDate: new Date(),
                reason: 'Test',
            })).rejects.toThrow()
        })

        it('should validate date ranges', async () => {
            const invalidData = {
                startDate: new Date('2024-01-17'),
                endDate: new Date('2024-01-15'), // End before start
                reason: 'Invalid dates',
            }

            await expect(repository.createTimeOffRequest(staffId, businessId, invalidData))
                .rejects.toThrow()
        })
    })
})