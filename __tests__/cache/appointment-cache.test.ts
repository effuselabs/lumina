/**
 * Appointment Cache Unit Tests
 * 
 * Unit tests for appointment caching operations and invalidation logic
 * to ensure proper cache behavior and coordination with calendar infrastructure.
 * 
 * Requirements: 6.3, 6.4, 4.4
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { appointmentCache, useAppointmentCache } from '@/lib/cache/appointment-cache'
import { CalendarCacheCoordinator } from '@/lib/cache/calendar-cache-coordinator'
import { AppointmentWithRelations } from '@/types/database'
import { AppointmentStatus } from '@prisma/client'
import Redis from 'ioredis'

// Mock Redis
jest.mock('ioredis')
const MockedRedis = Redis as jest.MockedClass<typeof Redis>

// Mock data
const mockAppointment: AppointmentWithRelations = {
    id: 'test-appointment-1',
    businessId: 'test-business-1',
    clientId: 'test-client-1',
    staffId: 'test-staff-1',
    userId: null,
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T11:00:00Z'),
    status: AppointmentStatus.SCHEDULED,
    totalDuration: 60,
    totalPrice: 100.00,
    clientName: null,
    clientEmail: null,
    clientPhone: null,
    notes: null,
    internalNotes: null,
    depositAmount: null,
    depositPaid: false,
    confirmedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: new Date('2024-01-10T10:00:00Z'),
    updatedAt: new Date('2024-01-10T10:00:00Z'),
    client: {
        id: 'test-client-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890'
    },
    staff: {
        id: 'test-staff-1',
        displayName: 'Jane Smith',
        user: {
            id: 'test-user-1',
            name: 'Jane Smith',
            email: 'jane@example.com'
        }
    },
    services: [
        {
            id: 'test-service-1',
            serviceId: 'service-1',
            serviceName: 'Haircut',
            price: 100.00,
            duration: 60,
            serviceOrder: 1,
            startOffset: 0,
            assignedStaffId: null,
            service: {
                id: 'service-1',
                name: 'Haircut',
                category: 'Hair'
            }
        }
    ],
    transactions: [],
    statusHistory: []
} as any

describe('AppointmentCacheManager', () => {
    let cacheManager: AppointmentCacheManager
    let mockRedisInstance: jest.Mocked<Redis>

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks()

        // Create mock Redis instance
        mockRedisInstance = {
            get: jest.fn(),
            setex: jest.fn(),
            del: jest.fn(),
            keys: jest.fn(),
            info: jest.fn(),
            dbsize: jest.fn(),
            on: jest.fn(),
            disconnect: jest.fn()
        } as any

        MockedRedis.mockImplementation(() => mockRedisInstance)

        // Get fresh instance
        cacheManager = AppointmentCacheManager.getInstance()
    })

    afterEach(async () => {
        await cacheManager.disconnect()
    })

    describe('Cache Operations', () => {
        it('should get appointment from cache', async () => {
            const appointmentData = JSON.stringify(mockAppointment)
            mockRedisInstance.get.mockResolvedValue(appointmentData)

            const result = await cacheManager.getAppointment(
                mockAppointment.id,
                mockAppointment.businessId
            )

            expect(result).toEqual(mockAppointment)
            expect(mockRedisInstance.get).toHaveBeenCalledWith(
                CacheKeyGenerator.appointmentById(mockAppointment.id, mockAppointment.businessId)
            )
        })

        it('should return null when appointment not in cache', async () => {
            mockRedisInstance.get.mockResolvedValue(null)

            const result = await cacheManager.getAppointment(
                'non-existent-id',
                'test-business-1'
            )

            expect(result).toBeNull()
        })

        it('should set appointment in cache', async () => {
            mockRedisInstance.setex.mockResolvedValue('OK')

            await cacheManager.setAppointment(mockAppointment)

            expect(mockRedisInstance.setex).toHaveBeenCalledWith(
                CacheKeyGenerator.appointmentById(mockAppointment.id, mockAppointment.businessId),
                3600, // Default TTL
                JSON.stringify(mockAppointment)
            )
        })

        it('should handle cache errors gracefully', async () => {
            mockRedisInstance.get.mockRejectedValue(new Error('Redis connection failed'))

            const result = await cacheManager.getAppointment(
                mockAppointment.id,
                mockAppointment.businessId
            )

            expect(result).toBeNull()
        })
    })

    describe('List Caching', () => {
        it('should cache and retrieve appointment lists', async () => {
            const appointmentList = {
                appointments: [mockAppointment],
                hasMore: false,
                nextCursor: undefined
            }

            const cacheKey = 'test-list-key'
            const listData = JSON.stringify(appointmentList)

            mockRedisInstance.get.mockResolvedValue(listData)

            const result = await cacheManager.getAppointmentList(cacheKey)

            expect(result).toEqual(appointmentList)
            expect(mockRedisInstance.get).toHaveBeenCalledWith(cacheKey)
        })

        it('should set appointment list with custom TTL', async () => {
            const appointmentList = {
                appointments: [mockAppointment],
                hasMore: false
            }

            const cacheKey = 'test-list-key'
            const customTTL = 600

            mockRedisInstance.setex.mockResolvedValue('OK')

            await cacheManager.setAppointmentList(cacheKey, appointmentList, customTTL)

            expect(mockRedisInstance.setex).toHaveBeenCalledWith(
                cacheKey,
                customTTL,
                JSON.stringify(appointmentList)
            )
        })
    })

    describe('Statistics Caching', () => {
        it('should cache and retrieve appointment statistics', async () => {
            const statistics = {
                total: 10,
                byStatus: { SCHEDULED: 5, COMPLETED: 5 },
                byStaff: [],
                totalRevenue: 1000,
                averageAppointmentValue: 100
            }

            const dateRange = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            }

            mockRedisInstance.get.mockResolvedValue(JSON.stringify(statistics))

            const result = await cacheManager.getStatistics('test-business-1', dateRange)

            expect(result).toEqual(statistics)
            expect(mockRedisInstance.get).toHaveBeenCalledWith(
                CacheKeyGenerator.appointmentStatistics('test-business-1', dateRange)
            )
        })

        it('should set statistics with appropriate TTL', async () => {
            const statistics = { total: 10 }
            const dateRange = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            }

            mockRedisInstance.setex.mockResolvedValue('OK')

            await cacheManager.setStatistics('test-business-1', dateRange, statistics)

            expect(mockRedisInstance.setex).toHaveBeenCalledWith(
                CacheKeyGenerator.appointmentStatistics('test-business-1', dateRange),
                7200, // Statistics TTL
                JSON.stringify(statistics)
            )
        })
    })

    describe('Conflict Check Caching', () => {
        it('should cache and retrieve conflict check results', async () => {
            const conflicts = [
                {
                    appointmentId: 'conflict-1',
                    startTime: new Date('2024-01-15T10:30:00Z'),
                    endTime: new Date('2024-01-15T11:30:00Z'),
                    clientName: 'Conflicting Client',
                    serviceCount: 1
                }
            ]

            const timeSlot = {
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z')
            }

            mockRedisInstance.get.mockResolvedValue(JSON.stringify(conflicts))

            const result = await cacheManager.getConflictCheck(
                'test-staff-1',
                'test-business-1',
                timeSlot
            )

            expect(result).toEqual(conflicts)
        })

        it('should set conflict check results with short TTL', async () => {
            const conflicts: any[] = []
            const timeSlot = {
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z')
            }

            mockRedisInstance.setex.mockResolvedValue('OK')

            await cacheManager.setConflictCheck(
                'test-staff-1',
                'test-business-1',
                timeSlot,
                conflicts
            )

            expect(mockRedisInstance.setex).toHaveBeenCalledWith(
                CacheKeyGenerator.appointmentConflicts('test-staff-1', 'test-business-1', timeSlot),
                300, // Conflict check TTL
                JSON.stringify(conflicts)
            )
        })
    })

    describe('Cache Invalidation', () => {
        it('should invalidate appointment-related caches', async () => {
            mockRedisInstance.keys.mockResolvedValue([
                'business:test-business-1:appointments:hash1',
                'staff:test-business-1:test-staff-1:appointments'
            ])
            mockRedisInstance.del.mockResolvedValue(2)

            await cacheManager.invalidateAppointment(
                'test-appointment-1',
                'test-business-1',
                'test-staff-1',
                true // immediate
            )

            expect(mockRedisInstance.keys).toHaveBeenCalled()
            expect(mockRedisInstance.del).toHaveBeenCalled()
        })

        it('should invalidate business appointments by pattern', async () => {
            mockRedisInstance.keys.mockResolvedValue([
                'business:test-business-1:appointments:hash1',
                'business:test-business-1:appointments:hash2'
            ])
            mockRedisInstance.del.mockResolvedValue(2)

            await cacheManager.invalidateBusinessAppointments('test-business-1')

            expect(mockRedisInstance.keys).toHaveBeenCalledWith(
                CacheKeyGenerator.businessAppointmentList('test-business-1')
            )
            expect(mockRedisInstance.del).toHaveBeenCalled()
        })

        it('should invalidate staff appointments by pattern', async () => {
            mockRedisInstance.keys.mockResolvedValue([
                'staff:test-business-1:test-staff-1:appointments1',
                'staff:test-business-1:test-staff-1:appointments2'
            ])
            mockRedisInstance.del.mockResolvedValue(2)

            await cacheManager.invalidateStaffAppointments('test-staff-1', 'test-business-1')

            expect(mockRedisInstance.keys).toHaveBeenCalledWith(
                CacheKeyGenerator.staffAppointmentList('test-staff-1', 'test-business-1')
            )
            expect(mockRedisInstance.del).toHaveBeenCalled()
        })
    })

    describe('Cache Statistics', () => {
        it('should return cache statistics', async () => {
            mockRedisInstance.info.mockImplementation((section: string) => {
                if (section === 'memory') {
                    return Promise.resolve('used_memory:1048576\n') // 1MB
                }
                if (section === 'stats') {
                    return Promise.resolve('keyspace_hits:1000\nkeyspace_misses:100\nevicted_keys:5\n')
                }
                return Promise.resolve('')
            })
            mockRedisInstance.dbsize.mockResolvedValue(50)

            const stats = await cacheManager.getCacheStats()

            expect(stats.memoryUsage).toBe(1) // 1MB
            expect(stats.keyCount).toBe(50)
            expect(stats.hitRate).toBeCloseTo(0.909) // 1000/(1000+100)
            expect(stats.evictions).toBe(5)
        })
    })

    describe('Cache Clearing', () => {
        it('should clear all appointment cache entries', async () => {
            mockRedisInstance.keys.mockResolvedValue([
                'lumina:appointments:key1',
                'lumina:appointments:key2'
            ])
            mockRedisInstance.del.mockResolvedValue(2)

            await cacheManager.clearCache()

            expect(mockRedisInstance.keys).toHaveBeenCalled()
            expect(mockRedisInstance.del).toHaveBeenCalledWith(
                'lumina:appointments:key1',
                'lumina:appointments:key2'
            )
        })
    })
})

describe('CacheKeyGenerator', () => {
    describe('Key Generation', () => {
        it('should generate consistent appointment keys', () => {
            const key1 = CacheKeyGenerator.appointmentById('app-1', 'business-1')
            const key2 = CacheKeyGenerator.appointmentById('app-1', 'business-1')

            expect(key1).toBe(key2)
            expect(key1).toContain('appointment:business-1:app-1')
        })

        it('should generate different keys for different appointments', () => {
            const key1 = CacheKeyGenerator.appointmentById('app-1', 'business-1')
            const key2 = CacheKeyGenerator.appointmentById('app-2', 'business-1')

            expect(key1).not.toBe(key2)
        })

        it('should generate business appointment list keys with filters', () => {
            const filters = { status: AppointmentStatus.SCHEDULED, limit: 50 }
            const key = CacheKeyGenerator.appointmentsByBusiness('business-1', filters)

            expect(key).toContain('business:business-1:appointments')
            expect(key).toContain('limit:50')
        })

        it('should generate staff appointment keys with date range', () => {
            const dateRange = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            }

            const key = CacheKeyGenerator.appointmentsByStaff('staff-1', 'business-1', dateRange)

            expect(key).toContain('staff:business-1:staff-1')
            expect(key).toContain('2024-01-01')
            expect(key).toContain('2024-01-31')
        })

        it('should generate conflict check keys', () => {
            const timeSlot = {
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z')
            }

            const key = CacheKeyGenerator.appointmentConflicts('staff-1', 'business-1', timeSlot)

            expect(key).toContain('conflicts:business-1:staff-1')
            expect(key).toContain('2024-01-15T10:00:00.000Z')
        })

        it('should generate statistics keys', () => {
            const dateRange = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            }

            const key = CacheKeyGenerator.appointmentStatistics('business-1', dateRange)

            expect(key).toContain('stats:business-1')
            expect(key).toContain('2024-01-01')
            expect(key).toContain('2024-01-31')
        })
    })

    describe('Related Keys Generation', () => {
        it('should generate all related keys for appointment', () => {
            const keys = CacheKeyGenerator.appointmentRelatedKeys('app-1', 'business-1', 'staff-1')

            expect(keys).toHaveLength(5)
            expect(keys[0]).toContain('appointment:business-1:app-1')
            expect(keys[1]).toContain('business:business-1:*')
            expect(keys[2]).toContain('staff:business-1:staff-1:*')
            expect(keys[3]).toContain('conflicts:business-1:staff-1:*')
            expect(keys[4]).toContain('stats:business-1:*')
        })
    })
})

describe('CalendarCacheCoordinator', () => {
    let coordinator: CalendarCacheCoordinator

    beforeEach(() => {
        coordinator = CalendarCacheCoordinator.getInstance()
    })

    afterEach(async () => {
        await coordinator.shutdown()
    })

    describe('Event Handling', () => {
        it('should handle appointment created events', async () => {
            const spy = jest.spyOn(coordinator as any, 'handleAppointmentCreated')

            await coordinator.onAppointmentCreated(
                'app-1',
                'business-1',
                'staff-1',
                {
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    endTime: new Date('2024-01-15T11:00:00Z')
                },
                ['service-1']
            )

            expect(spy).toHaveBeenCalled()
        })

        it('should handle appointment updated events', async () => {
            const spy = jest.spyOn(coordinator as any, 'handleAppointmentUpdated')

            await coordinator.onAppointmentUpdated(
                'app-1',
                'business-1',
                'staff-1',
                {
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    endTime: new Date('2024-01-15T11:00:00Z')
                }
            )

            expect(spy).toHaveBeenCalled()
        })

        it('should handle appointment deleted events', async () => {
            const spy = jest.spyOn(coordinator as any, 'handleAppointmentDeleted')

            await coordinator.onAppointmentDeleted(
                'app-1',
                'business-1',
                'staff-1',
                {
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    endTime: new Date('2024-01-15T11:00:00Z')
                }
            )

            expect(spy).toHaveBeenCalled()
        })

        it('should handle availability changed events', async () => {
            const spy = jest.spyOn(coordinator as any, 'handleAvailabilityChanged')

            await coordinator.onAvailabilityChanged('business-1', 'staff-1')

            expect(spy).toHaveBeenCalled()
        })
    })

    describe('Coordination Statistics', () => {
        it('should return coordination statistics', () => {
            const stats = coordinator.getCoordinationStats()

            expect(stats).toHaveProperty('queuedEvents')
            expect(stats).toHaveProperty('processedEvents')
            expect(stats).toHaveProperty('coordinationEnabled')
            expect(typeof stats.queuedEvents).toBe('number')
            expect(typeof stats.coordinationEnabled).toBe('boolean')
        })
    })

    describe('Configuration', () => {
        it('should update coordination configuration', () => {
            const newConfig = {
                enableCoordination: false,
                invalidationDelay: 500
            }

            coordinator.updateConfig(newConfig)

            const stats = coordinator.getCoordinationStats()
            expect(stats.coordinationEnabled).toBe(false)
        })
    })
})

describe('Cache Integration', () => {
    it('should coordinate cache invalidation between systems', async () => {
        const cacheManager = AppointmentCacheManager.getInstance()
        const coordinator = CalendarCacheCoordinator.getInstance()

        // Mock Redis operations
        mockRedisInstance.keys.mockResolvedValue(['test-key'])
        mockRedisInstance.del.mockResolvedValue(1)

        // Test coordination
        await coordinator.onAppointmentCreated(
            'app-1',
            'business-1',
            'staff-1',
            {
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z')
            }
        )

        // Verify cache operations were triggered
        expect(mockRedisInstance.keys).toHaveBeenCalled()

        await cacheManager.disconnect()
        await coordinator.shutdown()
    })
})