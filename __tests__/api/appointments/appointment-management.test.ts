/**
 * Appointment Management API Integration Tests
 * 
 * Tests for appointment update, cancellation, and status management endpoints
 * including business context validation and proper error handling.
 * 
 * Requirements: 2.2, 2.3, 5.1, 5.2, 5.3
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { DELETE as cancelAppointment, PUT as updateAppointment } from '@/app/api/appointments/[id]/route'
import { GET as getStatusInfo, PUT as updateStatus } from '@/app/api/appointments/[id]/status/route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { AppointmentStatus } from '@prisma/client'
import { NextRequest } from 'next/server'
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'

// Mock dependencies
jest.mock('@/auth')
jest.mock('@/lib/prisma', () => ({
    prisma: {
        businessUser: {
            findFirst: jest.fn()
        }
    }
}))

// Mock the services
const mockAppointmentService = {
    getAppointmentById: jest.fn(),
    updateAppointment: jest.fn(),
    cancelAppointment: jest.fn()
}

const mockStatusManager = {
    updateStatus: jest.fn(),
    getValidTransitions: jest.fn()
}

jest.mock('@/lib/services/appointment-service', () => ({
    AppointmentService: jest.fn(() => mockAppointmentService)
}))

jest.mock('@/lib/services/appointment-status-manager', () => ({
    AppointmentStatusManager: jest.fn(() => mockStatusManager)
}))

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

// Test data
const mockSession = {
    user: {
        id: 'user-123',
        email: 'test@example.com'
    }
}

const mockBusinessUser = {
    id: 'bu-123',
    businessId: 'business-123',
    userId: 'user-123',
    role: 'MANAGER'
}

const mockAppointment = {
    id: 'appointment-123',
    businessId: 'business-123',
    clientId: 'client-123',
    staffId: 'staff-123',
    startTime: new Date('2024-12-01T10:00:00Z'),
    endTime: new Date('2024-12-01T11:00:00Z'),
    status: AppointmentStatus.SCHEDULED,
    totalDuration: 60,
    totalPrice: 50,
    services: [],
    createdAt: new Date(),
    updatedAt: new Date()
}

describe('Appointment Management API', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockAuth.mockResolvedValue(mockSession)
        asMock(mockPrisma.businessUser.findFirst).mockResolvedValue(mockBusinessUser)
        mockAppointmentService.getAppointmentById.mockResolvedValue(mockAppointment)
    })

    afterEach(() => {
        jest.resetAllMocks()
    })

    describe('PUT /api/appointments/[id] - Update Appointment', () => {
        const updateData = {
            businessId: 'business-123',
            notes: 'Updated notes',
            startTime: '2024-12-01T11:00:00Z',
            endTime: '2024-12-01T12:00:00Z'
        }

        it('should update appointment successfully', async () => {
            const mockResult = {
                success: true,
                appointment: { ...mockAppointment, notes: 'Updated notes' },
                errors: [],
                warnings: []
            }
            mockAppointmentService.updateAppointment.mockResolvedValue(mockResult)

            const request = new NextRequest('http://localhost/api/appointments/appointment-123', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            })

            const response = await updateAppointment(request, { params: { id: 'appointment-123' } })
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.appointment.notes).toBe('Updated notes')
            expect(mockAppointmentService.updateAppointment).toHaveBeenCalledWith(
                'appointment-123',
                'business-123',
                expect.objectContaining({
                    notes: 'Updated notes'
                })
            )
        })

        it('should return 401 when not authenticated', async () => {
            mockAuth.mockResolvedValue(null)

            const request = new NextRequest('http://localhost/api/appointments/appointment-123', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            })

            const response = await updateAppointment(request, { params: { id: 'appointment-123' } })
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data.error).toBe('Unauthorized')
        })

        it('should return 400 when businessId is missing', async () => {
            const { businessId, ...dataWithoutBusinessId } = updateData

            const request = new NextRequest('http://localhost/api/appointments/appointment-123', {
                method: 'PUT',
                body: JSON.stringify(dataWithoutBusinessId)
            })

            const response = await updateAppointment(request, { params: { id: 'appointment-123' } })
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Business ID is required')
        })

        it('should return 403 when user has no access to business', async () => {
            asMock(mockPrisma.businessUser.findFirst).mockResolvedValue(null)

            const request = new NextRequest('http://localhost/api/appointments/appointment-123', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            })

            const response = await updateAppointment(request, { params: { id: 'appointment-123' } })
            const data = await response.json()

            expect(response.status).toBe(403)
            expect(data.error).toBe('Access denied')
        })

        it('should handle service errors', async () => {
            const mockResult = {
                success: false,
                errors: ['Time slot not available'],
                warnings: ['Peak time booking']
            }
            mockAppointmentService.updateAppointment.mockResolvedValue(mockResult)

            const request = new NextRequest('http://localhost/api/appointments/appointment-123', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            })

            const response = await updateAppointment(request, { params: { id: 'appointment-123' } })
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Failed to update appointment')
            expect(data.details).toContain('Time slot not available')
            expect(data.warnings).toContain('Peak time booking')
        })

        it('should handle validation errors', async () => {
            const invalidData = {
                ...updateData,
                startTime: 'invalid-date'
            }

            const request = new NextRequest('http://localhost/api/appointments/appointment-123', {
                method: 'PUT',
                body: JSON.stringify(invalidData)
            })

            const response = await updateAppointment(request, { params: { id: 'appointment-123' } })
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Validation error')
            expect(data.details).toBeDefined()
        })
    })

    describe('DELETE /api/appointments/[id] - Cancel Appointment', () => {
        it('should cancel appointment successfully', async () => {
            const mockResult = {
                success: true,
                appointment: { ...mockAppointment, status: AppointmentStatus.CANCELLED },
                errors: [],
                warnings: []
            }
            mockAppointmentService.cancelAppointment.mockResolvedValue(mockResult)

            const url = new URL('http://localhost/api/appointments/appointment-123?businessId=business-123')
            const request = new NextRequest(url, { method: 'DELETE' })

            const response = await cancelAppointment(request, { params: { id: 'appointment-123' } })
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.appointment.status).toBe(AppointmentStatus.CANCELLED)
            expect(data.message).toBe('Appointment cancelled successfully')
            expect(mockAppointmentService.cancelAppointment).toHaveBeenCalledWith(
                'appointment-123',
                'business-123',
                expect.objectContaining({
                    changedBy: 'user-123'
                })
            )
        })

        it('should cancel appointment with options', async () => {
            const mockResult = {
                success: true,
                appointment: { ...mockAppointment, status: AppointmentStatus.CANCELLED },
                errors: [],
                warnings: []
            }
            mockAppointmentService.cancelAppointment.mockResolvedValue(mockResult)

            const cancelOptions = {
                reason: 'Client requested',
                refundAmount: 25,
                notifyClient: true
            }

            const request = new NextRequest('http://localhost/api/appointments/appointment-123?businessId=business-123', {
                method: 'DELETE',
                body: JSON.stringify(cancelOptions)
            })

            const response = await cancelAppointment(request, { params: { id: 'appointment-123' } })

            expect(response.status).toBe(200)
            expect(mockAppointmentService.cancelAppointment).toHaveBeenCalledWith(
                'appointment-123',
                'business-123',
                expect.objectContaining({
                    reason: 'Client requested',
                    refundAmount: 25,
                    notifyClient: true,
                    changedBy: 'user-123'
                })
            )
        })

        it('should handle cancellation service errors', async () => {
            const mockResult = {
                success: false,
                errors: ['Cannot cancel completed appointment'],
                warnings: []
            }
            mockAppointmentService.cancelAppointment.mockResolvedValue(mockResult)

            const url = new URL('http://localhost/api/appointments/appointment-123?businessId=business-123')
            const request = new NextRequest(url, { method: 'DELETE' })

            const response = await cancelAppointment(request, { params: { id: 'appointment-123' } })
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Failed to cancel appointment')
            expect(data.details).toContain('Cannot cancel completed appointment')
        })
    })

    describe('PUT /api/appointments/[id]/status - Update Status', () => {
        const statusUpdateData = {
            status: AppointmentStatus.CONFIRMED,
            reason: 'Client confirmed',
            changedBy: 'user-123'
        }

        it('should update status successfully', async () => {
            const mockResult = {
                success: true,
                validTransitions: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED]
            }
            mockStatusManager.updateStatus.mockResolvedValue(mockResult)

            const updatedAppointment = { ...mockAppointment, status: AppointmentStatus.CONFIRMED }
            mockAppointmentService.getAppointmentById
                .mockResolvedValueOnce(mockAppointment) // First call for verification
                .mockResolvedValueOnce(updatedAppointment) // Second call for updated data

            const request = new NextRequest('http://localhost/api/appointments/appointment-123/status?businessId=business-123', {
                method: 'PUT',
                body: JSON.stringify(statusUpdateData)
            })

            const response = await updateStatus(request, { params: { id: 'appointment-123' } })
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.appointment.status).toBe(AppointmentStatus.CONFIRMED)
            expect(data.message).toBe('Status updated successfully')
            expect(data.previousStatus).toBe(AppointmentStatus.SCHEDULED)
            expect(data.newStatus).toBe(AppointmentStatus.CONFIRMED)
            expect(mockStatusManager.updateStatus).toHaveBeenCalledWith(
                'appointment-123',
                AppointmentStatus.CONFIRMED,
                'business-123',
                expect.objectContaining({
                    changedBy: 'user-123',
                    reason: 'Client confirmed'
                })
            )
        })

        it('should return 404 when appointment not found', async () => {
            mockAppointmentService.getAppointmentById.mockResolvedValue(null)

            const request = new NextRequest('http://localhost/api/appointments/nonexistent/status?businessId=business-123', {
                method: 'PUT',
                body: JSON.stringify(statusUpdateData)
            })

            const response = await updateStatus(request, { params: { id: 'nonexistent' } })
            const data = await response.json()

            expect(response.status).toBe(404)
            expect(data.error).toBe('Appointment not found')
        })

        it('should handle invalid status transitions', async () => {
            const mockResult = {
                success: false,
                error: 'Invalid status transition from COMPLETED to SCHEDULED',
                validTransitions: [AppointmentStatus.CANCELLED]
            }
            mockStatusManager.updateStatus.mockResolvedValue(mockResult)

            const request = new NextRequest('http://localhost/api/appointments/appointment-123/status?businessId=business-123', {
                method: 'PUT',
                body: JSON.stringify(statusUpdateData)
            })

            const response = await updateStatus(request, { params: { id: 'appointment-123' } })
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Failed to update status')
            expect(data.details).toContain('Invalid status transition from COMPLETED to SCHEDULED')
            expect(data.validTransitions).toEqual([AppointmentStatus.CANCELLED])
        })

        it('should handle validation errors', async () => {
            const invalidData = {
                status: 'INVALID_STATUS',
                reason: 'Test'
            }

            const request = new NextRequest('http://localhost/api/appointments/appointment-123/status?businessId=business-123', {
                method: 'PUT',
                body: JSON.stringify(invalidData)
            })

            const response = await updateStatus(request, { params: { id: 'appointment-123' } })
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Validation error')
            expect(data.details).toBeDefined()
        })
    })

    describe('GET /api/appointments/[id]/status - Get Status Info', () => {
        it('should return status information successfully', async () => {
            const validTransitions = [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED]
            mockStatusManager.getValidTransitions.mockReturnValue(validTransitions)

            const url = new URL('http://localhost/api/appointments/appointment-123/status?businessId=business-123')
            const request = new NextRequest(url)

            const response = await getStatusInfo(request, { params: { id: 'appointment-123' } })
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.currentStatus).toBe(AppointmentStatus.SCHEDULED)
            expect(data.validTransitions).toEqual(validTransitions)
            expect(mockStatusManager.getValidTransitions).toHaveBeenCalledWith(AppointmentStatus.SCHEDULED)
        })

        it('should return 404 when appointment not found', async () => {
            mockAppointmentService.getAppointmentById.mockResolvedValue(null)

            const url = new URL('http://localhost/api/appointments/nonexistent/status?businessId=business-123')
            const request = new NextRequest(url)

            const response = await getStatusInfo(request, { params: { id: 'nonexistent' } })
            const data = await response.json()

            expect(response.status).toBe(404)
            expect(data.error).toBe('Appointment not found')
        })

        it('should return 401 when not authenticated', async () => {
            mockAuth.mockResolvedValue(null)

            const url = new URL('http://localhost/api/appointments/appointment-123/status?businessId=business-123')
            const request = new NextRequest(url)

            const response = await getStatusInfo(request, { params: { id: 'appointment-123' } })
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data.error).toBe('Unauthorized')
        })

        it('should return 403 when user has no access to business', async () => {
            asMock(mockPrisma.businessUser.findFirst).mockResolvedValue(null)

            const url = new URL('http://localhost/api/appointments/appointment-123/status?businessId=business-123')
            const request = new NextRequest(url)

            const response = await getStatusInfo(request, { params: { id: 'appointment-123' } })
            const data = await response.json()

            expect(response.status).toBe(403)
            expect(data.error).toBe('Access denied')
        })
    })
})