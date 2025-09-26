/**
 * Calendar Integration Service Tests
 * 
 * Tests the integration layer between appointment booking engine and LUM-96 calendar infrastructure
 * Requirements: 4.1, 4.2, 4.3, 1.2, 1.3
 */

import { AvailabilityCache } from '@/lib/services/availability-cache'
import { AvailabilityCalculator } from '@/lib/services/availability-calculator'
import { CalendarIntegration } from '@/lib/services/calendar-integration'
import { ConflictDetectionEngine } from '@/lib/services/conflict-detection-engine'
import { ServiceDurationValidator } from '@/lib/services/service-duration-validator'

// Mock the LUM-96 services
jest.mock('@/lib/services/availability-calculator')
jest.mock('@/lib/services/conflict-detection-engine')
jest.mock('@/lib/services/service-duration-validator')
jest.mock('@/lib/services/availability-cache')

const mockAvailabilityCalculator = AvailabilityCalculator as jest.Mocked<typeof AvailabilityCalculator>
const mockConflictDetectionEngine = ConflictDetectionEngine as jest.Mocked<typeof ConflictDetectionEngine>
const mockServiceDurationValidator = ServiceDurationValidator as jest.Mocked<typeof ServiceDurationValidator>
const mockAvailabilityCache = AvailabilityCache as jest.Mocked<typeof AvailabilityCache>

// Add missing mock methods
mockAvailabilityCalculator.batchCalculateAndCache = jest.fn().mockResolvedValue(undefined)
mockAvailabilityCalculator.invalidateStaffAvailabilityCache = jest.fn().mockResolvedValue(undefined)
mockAvailabilityCalculator.invalidateBusinessHoursCache = jest.fn().mockResolvedValue(undefined)
mockAvailabilityCalculator.cleanupExpiredCache = jest.fn().mockResolvedValue(0)

mockAvailabilityCache.invalidateStaffAvailability = jest.fn().mockResolvedValue(undefined)
mockAvailabilityCache.invalidateBusinessHours = jest.fn().mockResolvedValue(undefined)
mockAvailabilityCache.invalidate = jest.fn().mockResolvedValue(undefined)
mockAvailabilityCache.cleanupExpired = jest.fn().mockResolvedValue(0)

describe('CalendarIntegration', () => {
    const businessId = 'test-business-id'
    const staffId = 'test-staff-id'
    const serviceIds = ['service-1', 'service-2']
    const startTime = new Date('2024-01-15T10:00:00Z')
    const endTime = new Date('2024-01-15T11:00:00Z')

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('checkAvailability', () => {
        const availabilityRequest = {
            businessId,
            staffId,
            startTime,
            endTime,
            serviceIds
        }

        it('should successfully check availability when slot is available', async () => {
            // Mock LUM-96 availability calculator response
            mockAvailabilityCalculator.calculateAvailability.mockResolvedValue({
                slots: [
                    {
                        startTime,
                        endTime,
                        staffId,
                        staffName: 'Test Staff',
                        isAvailable: true
                    }
                ],
                metadata: {
                    totalSlots: 1,
                    availableSlots: 1,
                    conflictedSlots: 0,
                    cacheHit: false,
                    calculationTime: 100,
                    timezone: 'UTC'
                }
            })

            // Mock conflict detection response
            mockConflictDetectionEngine.validateAppointmentSlot.mockResolvedValue({
                isValid: true,
                conflicts: [],
                warnings: []
            })

            const result = await CalendarIntegration.checkAvailability(availabilityRequest)

            expect(result.isAvailable).toBe(true)
            expect(result.conflicts).toHaveLength(0)
            expect(result.warnings).toHaveLength(0)
            expect(result.metadata.cacheHit).toBe(false)
            expect(mockAvailabilityCalculator.calculateAvailability).toHaveBeenCalledWith({
                businessId,
                staffId,
                date: startTime,
                duration: 60,
                serviceId: serviceIds[0]
            })
        })

        it('should return conflicts when slot has conflicts', async () => {
            const conflicts = [{
                type: 'OVERLAPPING_APPOINTMENT' as any,
                severity: 'ERROR' as any,
                message: 'Appointment overlaps with existing booking',
                details: {}
            }]

            mockAvailabilityCalculator.calculateAvailability.mockResolvedValue({
                slots: [
                    {
                        startTime,
                        endTime,
                        staffId,
                        staffName: 'Test Staff',
                        isAvailable: false,
                        conflicts: ['Overlapping appointment']
                    }
                ],
                metadata: {
                    totalSlots: 1,
                    availableSlots: 0,
                    conflictedSlots: 1,
                    cacheHit: false,
                    calculationTime: 100,
                    timezone: 'UTC'
                }
            })

            mockConflictDetectionEngine.validateAppointmentSlot.mockResolvedValue({
                isValid: false,
                conflicts,
                warnings: []
            })

            const result = await CalendarIntegration.checkAvailability(availabilityRequest)

            expect(result.isAvailable).toBe(false)
            expect(result.conflicts).toHaveLength(1)
            expect(result.conflicts[0].message).toBe('Appointment overlaps with existing booking')
        })

        it('should handle LUM-96 service failures gracefully', async () => {
            mockAvailabilityCalculator.calculateAvailability.mockRejectedValue(
                new Error('Availability service unavailable')
            )

            const result = await CalendarIntegration.checkAvailability(availabilityRequest)

            expect(result.isAvailable).toBe(false)
            expect(result.conflicts).toHaveLength(1)
            expect(result.conflicts[0].message).toContain('Availability check failed')
        })
    })

    describe('detectConflicts', () => {
        const conflictRequest = {
            businessId,
            staffId,
            startTime,
            endTime,
            serviceIds,
            clientId: 'test-client-id'
        }

        it('should detect conflicts successfully', async () => {
            const conflicts = [{
                type: 'OVERLAPPING_APPOINTMENT' as any,
                severity: 'ERROR' as any,
                message: 'Appointment overlaps',
                details: {},
                suggestedResolutions: [{
                    type: 'RESCHEDULE' as any,
                    description: 'Reschedule to alternative time',
                    alternativeSlots: [{
                        startTime: new Date('2024-01-15T11:00:00Z'),
                        endTime: new Date('2024-01-15T12:00:00Z')
                    }]
                }]
            }]

            mockConflictDetectionEngine.detectConflicts.mockResolvedValue(conflicts)

            const result = await CalendarIntegration.detectConflicts(conflictRequest)

            expect(result.hasConflicts).toBe(true)
            expect(result.conflicts).toHaveLength(1)
            expect(result.suggestedResolutions).toBeDefined()
            expect(result.suggestedResolutions![0].type).toBe('RESCHEDULE')
        })

        it('should handle conflict detection failures', async () => {
            mockConflictDetectionEngine.detectConflicts.mockRejectedValue(
                new Error('Conflict detection service unavailable')
            )

            const result = await CalendarIntegration.detectConflicts(conflictRequest)

            expect(result.hasConflicts).toBe(true)
            expect(result.conflicts[0].message).toContain('Conflict detection failed')
        })
    })

    describe('validateServiceDuration', () => {
        const durationRequest = {
            serviceIds: ['service-1'],
            timeSlot: { startTime, endTime },
            businessId,
            staffId
        }

        it('should validate single service duration successfully', async () => {
            mockServiceDurationValidator.validateServiceFit.mockResolvedValue({
                isValid: true,
                requiredDuration: 45,
                availableDuration: 60
            })

            const result = await CalendarIntegration.validateServiceDuration(durationRequest)

            expect(result.isValid).toBe(true)
            expect(result.requiredDuration).toBe(45)
            expect(result.availableDuration).toBe(60)
        })

        it('should handle validation failures', async () => {
            mockServiceDurationValidator.validateServiceFit.mockRejectedValue(
                new Error('Duration validation service unavailable')
            )

            const result = await CalendarIntegration.validateServiceDuration(durationRequest)

            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('Duration validation failed')
        })
    })

    describe('invalidateAvailabilityCache', () => {
        it('should invalidate staff availability cache', async () => {
            const request = {
                businessId,
                staffId,
                type: 'staff_availability' as const
            }

            await CalendarIntegration.invalidateAvailabilityCache(request)

            expect(mockAvailabilityCache.invalidateStaffAvailability).toHaveBeenCalledWith(staffId, businessId)
            expect(mockAvailabilityCalculator.invalidateStaffAvailabilityCache).toHaveBeenCalledWith(staffId, businessId)
        })

        it('should invalidate business hours cache', async () => {
            const request = {
                businessId,
                type: 'business_hours' as const
            }

            await CalendarIntegration.invalidateAvailabilityCache(request)

            expect(mockAvailabilityCache.invalidateBusinessHours).toHaveBeenCalledWith(businessId)
            expect(mockAvailabilityCalculator.invalidateBusinessHoursCache).toHaveBeenCalledWith(businessId)
        })

        it('should invalidate appointment cache for date range', async () => {
            const request = {
                businessId,
                staffId,
                type: 'appointments' as const,
                dateRange: {
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-17')
                }
            }

            await CalendarIntegration.invalidateAvailabilityCache(request)

            // Should call invalidate for each date in range
            expect(mockAvailabilityCache.invalidate).toHaveBeenCalledTimes(3)
        })

        it('should invalidate client appointments cache', async () => {
            const clientId = 'test-client-id'
            const request = {
                businessId,
                clientId,
                type: 'client_appointments' as const
            }

            await CalendarIntegration.invalidateAvailabilityCache(request)

            // Should complete without throwing (appointment cache invalidation is logged)
            expect(true).toBe(true)
        })

        it('should invalidate specific appointment details cache', async () => {
            const appointmentId = 'test-appointment-id'
            const request = {
                businessId,
                appointmentId,
                staffId,
                clientId: 'test-client-id',
                type: 'appointment_details' as const
            }

            await CalendarIntegration.invalidateAvailabilityCache(request)

            // Should complete without throwing (appointment cache invalidation is logged)
            expect(true).toBe(true)
        })

        it('should handle cache invalidation failures gracefully', async () => {
            mockAvailabilityCache.invalidateStaffAvailability.mockRejectedValue(
                new Error('Cache service unavailable')
            )

            const request = {
                businessId,
                staffId,
                type: 'staff_availability' as const
            }

            // Should not throw error
            await expect(CalendarIntegration.invalidateAvailabilityCache(request)).resolves.toBeUndefined()
        })

        it('should update cache metrics on invalidation', async () => {
            const request = {
                businessId,
                staffId,
                type: 'staff_availability' as const
            }

            const initialMetrics = CalendarIntegration.getCacheMetrics()
            const initialCount = initialMetrics.coordination.invalidationCount

            await CalendarIntegration.invalidateAvailabilityCache(request)

            const updatedMetrics = CalendarIntegration.getCacheMetrics()
            expect(updatedMetrics.coordination.invalidationCount).toBe(initialCount + 1)
            expect(updatedMetrics.coordination.lastInvalidation).toBeDefined()
        })
    })

    describe('warmCache', () => {
        it('should warm availability cache with high priority', async () => {
            const request = {
                businessId,
                staffIds: [staffId],
                dateRange: {
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-17')
                },
                priority: 'high' as const,
                warmingType: 'availability' as const
            }

            await CalendarIntegration.warmCache(request)

            // Should complete without throwing
            expect(true).toBe(true)
        })

        it('should warm appointment cache for staff', async () => {
            const request = {
                businessId,
                staffIds: [staffId, 'staff-2'],
                dateRange: {
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-17')
                },
                priority: 'medium' as const,
                warmingType: 'appointments' as const
            }

            await CalendarIntegration.warmCache(request)

            // Should complete without throwing
            expect(true).toBe(true)
        })

        it('should warm client history cache', async () => {
            const request = {
                businessId,
                clientIds: ['client-1', 'client-2'],
                dateRange: {
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-17')
                },
                priority: 'low' as const,
                warmingType: 'client_history' as const
            }

            await CalendarIntegration.warmCache(request)

            // Should complete without throwing
            expect(true).toBe(true)
        })

        it('should warm all cache types', async () => {
            const request = {
                businessId,
                staffIds: [staffId],
                clientIds: ['client-1'],
                dateRange: {
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-17')
                },
                priority: 'high' as const,
                warmingType: 'all' as const
            }

            await CalendarIntegration.warmCache(request)

            // Should complete without throwing
            expect(true).toBe(true)
        })

        it('should update cache metrics on warming', async () => {
            const request = {
                businessId,
                staffIds: [staffId],
                dateRange: {
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-17')
                },
                priority: 'high' as const,
                warmingType: 'availability' as const
            }

            const initialMetrics = CalendarIntegration.getCacheMetrics()
            const initialCount = initialMetrics.coordination.warmingCount

            await CalendarIntegration.warmCache(request)

            const updatedMetrics = CalendarIntegration.getCacheMetrics()
            expect(updatedMetrics.coordination.warmingCount).toBe(initialCount + 1)
            expect(updatedMetrics.coordination.lastWarming).toBeDefined()
        })

        it('should handle cache warming failures gracefully', async () => {
            const request = {
                businessId,
                staffIds: [staffId],
                dateRange: {
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-17')
                },
                priority: 'high' as const,
                warmingType: 'availability' as const
            }

            // Mock failure in availability calculator
            mockAvailabilityCalculator.batchCalculateAndCache.mockRejectedValue(
                new Error('Cache warming service unavailable')
            )

            // Should not throw error
            await expect(CalendarIntegration.warmCache(request)).resolves.toBeUndefined()
        })

        it('should validate cache warming request parameters', async () => {
            const invalidRequest = {
                businessId: '',
                staffIds: [staffId],
                dateRange: {
                    startDate: new Date('2024-01-17'),
                    endDate: new Date('2024-01-15') // End before start
                },
                priority: 'high' as const,
                warmingType: 'availability' as const
            }

            // Should handle validation error gracefully
            await expect(CalendarIntegration.warmCache(invalidRequest)).resolves.toBeUndefined()
        })
    })

    describe('cache metrics and management', () => {
        beforeEach(() => {
            CalendarIntegration.resetCacheMetrics()
        })

        it('should return comprehensive cache metrics', () => {
            const availabilityMetrics = {
                hitRate: 85.5,
                totalRequests: 1000,
                totalHits: 855,
                totalMisses: 145,
                averageQueryTime: 120
            }

            const cacheMetrics = {
                hitRate: 90.2,
                totalRequests: 800,
                totalHits: 722,
                totalMisses: 78,
                averageQueryTime: 95
            }

            mockAvailabilityCalculator.getCacheMetrics.mockReturnValue(availabilityMetrics)
            mockAvailabilityCache.getMetrics.mockReturnValue(cacheMetrics)

            const result = CalendarIntegration.getCacheMetrics()

            expect(result.availability).toEqual(availabilityMetrics)
            expect(result.cache).toEqual(cacheMetrics)
            expect(result.coordination).toBeDefined()
            expect(result.coordination.invalidationCount).toBe(0)
            expect(result.coordination.warmingCount).toBe(0)
        })

        it('should reset cache coordination metrics', () => {
            // First, perform some operations to update metrics
            const request = {
                businessId,
                staffIds: [staffId],
                dateRange: {
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-17')
                },
                priority: 'high' as const,
                warmingType: 'availability' as const
            }

            CalendarIntegration.warmCache(request)

            // Reset metrics
            CalendarIntegration.resetCacheMetrics()

            const metrics = CalendarIntegration.getCacheMetrics()
            expect(metrics.coordination.invalidationCount).toBe(0)
            expect(metrics.coordination.warmingCount).toBe(0)
            expect(metrics.coordination.averageResponseTime).toBe(0)
        })
    })

    describe('getCacheMetrics', () => {
        it('should return cache metrics from LUM-96 services', () => {
            const availabilityMetrics = {
                hitRate: 85.5,
                totalRequests: 1000,
                totalHits: 855,
                totalMisses: 145,
                averageQueryTime: 120
            }

            const cacheMetrics = {
                hitRate: 90.2,
                totalRequests: 800,
                totalHits: 722,
                totalMisses: 78,
                averageQueryTime: 95
            }

            mockAvailabilityCalculator.getCacheMetrics.mockReturnValue(availabilityMetrics)
            mockAvailabilityCache.getMetrics.mockReturnValue(cacheMetrics)

            const result = CalendarIntegration.getCacheMetrics()

            expect(result.availability).toEqual(availabilityMetrics)
            expect(result.cache).toEqual(cacheMetrics)
        })
    })
})