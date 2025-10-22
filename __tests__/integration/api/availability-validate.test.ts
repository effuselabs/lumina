import { POST } from '@/app/api/availability/validate/route'
import { prisma } from '@/lib/prisma'
import { Service, Staff } from '@prisma/client'
import { NextRequest } from 'next/server'
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'

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
        validateAppointmentSlot: jest.fn(),
    },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const { auth } = require('@/lib/auth')
const { ConflictDetectionEngine } = require('@/lib/services/conflict-detection-engine')

describe('/api/availability/validate Integration Tests', () => {
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

    describe('POST /api/availability/validate', () => {
        it('should validate appointment slot successfully', async () => {
            const requestData = {
                staffId,
                startTime: '2024-01-15T09:00:00Z',
                duration: 60,
                serviceIds: [],
            }

            const mockStaff: Partial<Staff> = {
                id: staffId,
                displayName: 'John Doe',
            }

            const mockValidationResult = {
                isValid: true,
                conflicts: [],
                warnings: [],
            }

            asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff as unknown as Staff)
            ConflictDetectionEngine.validateAppointmentSlot.mockResolvedValue(mockValidationResult)

            const request = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.isValid).toBe(true)
            expect(data.canBook).toBe(true)
            expect(data.hasConflicts).toBe(false)
            expect(data.hasWarnings).toBe(false)
            expect(data.request.staffId).toBe(staffId)
            expect(data.request.staffName).toBe('John Doe')
        })

        it('should detect validation conflicts', async () => {
            const requestData = {
                staffId,
                startTime: '2024-01-15T09:00:00Z',
                duration: 60,
                serviceIds: [],
            }

            const mockStaff: Partial<Staff> = {
                id: staffId,
                displayName: 'John Doe',
            }

            const mockValidationResult = {
                isValid: false,
                conflicts: [
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
                ],
                warnings: [],
            }

            asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff as unknown as Staff)
            ConflictDetectionEngine.validateAppointmentSlot.mockResolvedValue(mockValidationResult)

            const request = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.isValid).toBe(false)
            expect(data.canBook).toBe(false)
            expect(data.hasConflicts).toBe(true)
            expect(data.conflicts).toHaveLength(1)
            expect(data.conflicts[0].type).toBe('APPOINTMENT_CONFLICT')
        })

        it('should validate service duration requirements', async () => {
            const requestData = {
                staffId,
                startTime: '2024-01-15T09:00:00Z',
                duration: 60, // 1 hour requested
                serviceIds: [serviceId],
            }

            const mockStaff: Partial<Staff> = {
                id: staffId,
                displayName: 'John Doe',
            }

            const mockServices: Partial<Service>[] = [
                {
                    id: serviceId,
                    businessId,
                    name: 'Haircut',
                    duration: 90, // Service requires 90 minutes
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

            const request = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.isValid).toBe(false) // Should be invalid due to insufficient duration
            expect(data.canBook).toBe(false)
            expect(data.serviceDurationValidation).toBeDefined()
            expect(data.serviceDurationValidation.totalServiceDuration).toBe(90)
            expect(data.serviceDurationValidation.requestedDuration).toBe(60)
            expect(data.serviceDurationValidation.isValid).toBe(false)
            expect(data.conflicts.some((c: any) => c.type === 'INSUFFICIENT_DURATION')).toBe(true)
        })

        it('should validate multiple services duration', async () => {
            const serviceId2 = 'service-456'
            const requestData = {
                staffId,
                startTime: '2024-01-15T09:00:00Z',
                duration: 120, // 2 hours requested
                serviceIds: [serviceId, serviceId2],
            }

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
                {
                    id: serviceId2,
                    businessId,
                    displayName: 'Color',
                    duration: 90,
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

            const request = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.isValid).toBe(false) // 150 minutes required > 120 minutes requested
            expect(data.serviceDurationValidation.totalServiceDuration).toBe(150)
            expect(data.serviceDurationValidation.services).toHaveLength(2)
        })

        it('should handle warnings without blocking booking', async () => {
            const requestData = {
                staffId,
                startTime: '2024-01-15T09:00:00Z',
                duration: 60,
                serviceIds: [],
            }

            const mockStaff: Partial<Staff> = {
                id: staffId,
                displayName: 'John Doe',
            }

            const mockValidationResult = {
                isValid: true,
                conflicts: [],
                warnings: [
                    {
                        type: 'CLOSE_TO_BUSINESS_HOURS',
                        severity: 'WARNING',
                        message: 'Appointment ends close to business closing time',
                        details: {
                            businessCloseTime: '17:00',
                            appointmentEndTime: '16:45',
                        },
                    },
                ],
            }

            asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff as unknown as Staff)
            ConflictDetectionEngine.validateAppointmentSlot.mockResolvedValue(mockValidationResult)

            const request = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.isValid).toBe(true)
            expect(data.canBook).toBe(true)
            expect(data.hasWarnings).toBe(true)
            expect(data.warnings).toHaveLength(1)
            expect(data.warnings[0].type).toBe('CLOSE_TO_BUSINESS_HOURS')
        })

        it('should exclude specific appointment from validation', async () => {
            const excludeAppointmentId = 'appointment-to-exclude'
            const requestData = {
                staffId,
                startTime: '2024-01-15T09:00:00Z',
                duration: 60,
                serviceIds: [],
                excludeAppointmentId,
            }

            const mockStaff: Partial<Staff> = {
                id: staffId,
                displayName: 'John Doe',
            }

            const mockValidationResult = {
                isValid: true,
                conflicts: [],
                warnings: [],
            }

            asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff as unknown as Staff)
            ConflictDetectionEngine.validateAppointmentSlot.mockResolvedValue(mockValidationResult)

            const request = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)

            expect(response.status).toBe(200)
            expect(ConflictDetectionEngine.validateAppointmentSlot).toHaveBeenCalledWith(
                staffId,
                new Date('2024-01-15T09:00:00Z'),
                60,
                businessId,
                [],
                excludeAppointmentId
            )
        })

        it('should return 401 when user is not authenticated', async () => {
            auth.mockResolvedValue(null)

            const requestData = {
                staffId,
                startTime: '2024-01-15T09:00:00Z',
                duration: 60,
                serviceIds: [],
            }

            const request = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data.error).toBe('Business context required')
        })

        it('should return 400 when request body is invalid', async () => {
            const invalidRequestData = {
                staffId: 'invalid-uuid',
                startTime: 'invalid-date',
                duration: -10, // Invalid duration
                serviceIds: [],
            }

            const request = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(invalidRequestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Invalid validation request')
        })

        it('should return 404 when staff not found or not authorized', async () => {
            const requestData = {
                staffId,
                startTime: '2024-01-15T09:00:00Z',
                duration: 60,
                serviceIds: [],
            }

            asMock(mockPrisma.staff.findFirst).mockResolvedValue(null)

            const request = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(404)
            expect(data.error).toBe('Staff member not found or not authorized')
        })

        it('should return 404 when service not found or not authorized', async () => {
            const requestData = {
                staffId,
                startTime: '2024-01-15T09:00:00Z',
                duration: 60,
                serviceIds: [serviceId],
            }

            const mockStaff: Partial<Staff> = {
                id: staffId,
                displayName: 'John Doe',
            }

            asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff as unknown as Staff)
            asMock(mockPrisma.service.findMany).mockResolvedValue([]) // No services found

            const request = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(404)
            expect(data.error).toBe('One or more services not found or not authorized')
        })

        it('should enforce business context isolation for staff', async () => {
            const otherBusinessStaffId = 'other-staff-456'
            const requestData = {
                staffId: otherBusinessStaffId,
                startTime: '2024-01-15T09:00:00Z',
                duration: 60,
                serviceIds: [],
            }

            asMock(mockPrisma.staff.findFirst).mockResolvedValue(null) // Not found in user's business

            const request = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)

            expect(response.status).toBe(404)
            expect(mockPrisma.staff.findFirst).toHaveBeenCalledWith({
                where: { id: otherBusinessStaffId, businessId },
                select: { id: true, name: true },
            })
        })

        it('should enforce business context isolation for services', async () => {
            const otherBusinessServiceId = 'other-service-456'
            const requestData = {
                staffId,
                startTime: '2024-01-15T09:00:00Z',
                duration: 60,
                serviceIds: [otherBusinessServiceId],
            }

            const mockStaff: Partial<Staff> = {
                id: staffId,
                displayName: 'John Doe',
            }

            asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff as unknown as Staff)
            asMock(mockPrisma.service.findMany).mockResolvedValue([]) // Not found in user's business

            const request = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)

            expect(response.status).toBe(404)
            expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
                where: {
                    id: { in: [otherBusinessServiceId] },
                    businessId, // Only searches in user's business
                },
                select: { id: true, name: true, duration: true },
            })
        })

        it('should handle validation engine errors gracefully', async () => {
            const requestData = {
                staffId,
                startTime: '2024-01-15T09:00:00Z',
                duration: 60,
                serviceIds: [],
            }

            const mockStaff: Partial<Staff> = {
                id: staffId,
                displayName: 'John Doe',
            }

            asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff as unknown as Staff)
            ConflictDetectionEngine.validateAppointmentSlot.mockRejectedValue(new Error('Validation engine failed'))

            const request = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBe('Failed to validate appointment')
            expect(data.details).toContain('Validation engine failed')
        })

        it('should handle malformed JSON gracefully', async () => {
            const request = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: 'invalid json',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Invalid validation request')
        })

        it('should provide comprehensive validation response', async () => {
            const requestData = {
                staffId,
                startTime: '2024-01-15T09:00:00Z',
                duration: 60,
                serviceIds: [serviceId],
            }

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
                warnings: [
                    {
                        type: 'PEAK_HOURS',
                        severity: 'INFO',
                        message: 'Appointment is during peak hours',
                        details: { peakHours: '09:00-12:00' },
                    },
                ],
            }

            asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff as unknown as Staff)
            asMock(mockPrisma.service.findMany).mockResolvedValue(mockServices as Service[])
            ConflictDetectionEngine.validateAppointmentSlot.mockResolvedValue(mockValidationResult)

            const request = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data).toMatchObject({
                isValid: true,
                canBook: true,
                hasConflicts: false,
                hasWarnings: true,
                conflicts: [],
                warnings: [
                    {
                        type: 'PEAK_HOURS',
                        severity: 'INFO',
                        message: 'Appointment is during peak hours',
                        details: { peakHours: '09:00-12:00' },
                    },
                ],
                serviceDurationValidation: {
                    totalServiceDuration: 60,
                    requestedDuration: 60,
                    isValid: true,
                    services: [
                        {
                            id: serviceId,
                            displayName: 'Haircut',
                            duration: 60,
                        },
                    ],
                },
                request: {
                    staffId,
                    staffName: 'John Doe',
                    startTime: '2024-01-15T09:00:00Z',
                    endTime: '2024-01-15T10:00:00.000Z',
                    duration: 60,
                    serviceIds: [serviceId],
                },
            })
        })
    })

    describe('Real-time validation updates', () => {
        it('should reflect real-time changes in validation results', async () => {
            const requestData = {
                staffId,
                startTime: '2024-01-15T09:00:00Z',
                duration: 60,
                serviceIds: [],
            }

            const mockStaff: Partial<Staff> = {
                id: staffId,
                displayName: 'John Doe',
            }

            asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff as unknown as Staff)

            // First validation: slot is available
            const initialValidationResult = {
                isValid: true,
                conflicts: [],
                warnings: [],
            }

            ConflictDetectionEngine.validateAppointmentSlot.mockResolvedValueOnce(initialValidationResult)

            const request1 = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response1 = await POST(request1)
            const data1 = await response1.json()

            expect(response1.status).toBe(200)
            expect(data1.isValid).toBe(true)
            expect(data1.canBook).toBe(true)

            // Second validation: conflict appears (simulating real-time booking)
            const updatedValidationResult = {
                isValid: false,
                conflicts: [
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
                ],
                warnings: [],
            }

            ConflictDetectionEngine.validateAppointmentSlot.mockResolvedValueOnce(updatedValidationResult)

            const request2 = new NextRequest('http://localhost:3000/api/availability/validate', {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const response2 = await POST(request2)
            const data2 = await response2.json()

            expect(response2.status).toBe(200)
            expect(data2.isValid).toBe(false)
            expect(data2.canBook).toBe(false)
            expect(data2.hasConflicts).toBe(true)
        })
    })
})