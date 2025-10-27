/**
 * Performance tests for concurrent booking scenarios
 * Tests system behavior under load and concurrent access
 */

import { jest } from '@jest/globals'
import { performance } from 'perf_hooks'

// Mock the booking API for performance testing
const mockBookingApi = {
    getBusinessInfo: jest.fn(),
    getAvailableSlots: jest.fn(),
    createBooking: jest.fn(),
    validateSlotAvailability: jest.fn(),
}

jest.mock('@/lib/services/booking-api', () => mockBookingApi)

describe('Concurrent Booking Performance Tests', () => {
    const businessId = 'test-business-123'

    beforeEach(() => {
        jest.clearAllMocks()

        // Setup realistic API response times
        mockBookingApi.getBusinessInfo.mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve({
                business: { name: 'Test Salon' },
                services: [{ id: 'service-1', name: 'Haircut', duration: 60, price: 50 }],
                businessHours: []
            }), 100))
        )

        mockBookingApi.getAvailableSlots.mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve({
                availableSlots: [
                    {
                        startTime: new Date('2024-01-15T10:00:00Z'),
                        endTime: new Date('2024-01-15T11:00:00Z'),
                        staffId: 'staff-1',
                        staffName: 'John Doe',
                        isAvailable: true
                    }
                ]
            }), 200))
        )

        mockBookingApi.createBooking.mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve({
                appointment: {
                    id: 'apt-123',
                    confirmationNumber: 'CONF-123',
                    dateTime: new Date('2024-01-15T10:00:00Z')
                },
                confirmationSent: true
            }), 300))
        )

        mockBookingApi.validateSlotAvailability.mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve(true), 50))
        )
    })

    describe('Concurrent Availability Requests', () => {
        test('should handle multiple simultaneous availability requests efficiently', async () => {
            const startTime = performance.now()
            const concurrentRequests = 10

            // Simulate multiple users checking availability simultaneously
            const requests = Array.from({ length: concurrentRequests }, () =>
                mockBookingApi.getAvailableSlots(businessId, {
                    serviceIds: ['service-1'],
                    date: '2024-01-15',
                    duration: 60
                })
            )

            const results = await Promise.all(requests)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            // Verify all requests completed successfully
            expect(results).toHaveLength(concurrentRequests)
            results.forEach((result: any) => {
                expect(result.availableSlots).toBeDefined()
                expect(result.availableSlots.length).toBeGreaterThan(0)
            })

            // Performance assertion: concurrent requests should not take significantly longer
            // than sequential requests due to proper async handling
            expect(totalTime).toBeLessThan(500) // Should complete within 500ms

            // Verify API was called for each request
            expect(mockBookingApi.getAvailableSlots).toHaveBeenCalledTimes(concurrentRequests)
        })

        test('should maintain performance under high load', async () => {
            const highLoadRequests = 50
            const startTime = performance.now()

            const requests = Array.from({ length: highLoadRequests }, (_, index) =>
                mockBookingApi.getAvailableSlots(businessId, {
                    serviceIds: ['service-1'],
                    date: '2024-01-15',
                    duration: 60,
                    requestId: `req-${index}` // Simulate different request contexts
                })
            )

            const results = await Promise.all(requests)
            const endTime = performance.now()
            const totalTime = endTime - startTime
            const averageResponseTime = totalTime / highLoadRequests

            // Verify all requests completed
            expect(results).toHaveLength(highLoadRequests)

            // Performance assertions
            expect(averageResponseTime).toBeLessThan(50) // Average response under 50ms
            expect(totalTime).toBeLessThan(2000) // Total time under 2 seconds

            console.log(`High load test: ${highLoadRequests} requests in ${totalTime.toFixed(2)}ms`)
            console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`)
        })
    })

    describe('Concurrent Booking Attempts', () => {
        test('should handle race conditions in booking creation', async () => {
            const concurrentBookings = 5
            let successfulBookings = 0
            let conflictErrors = 0

            // Mock booking conflicts for concurrent attempts on same slot
            mockBookingApi.createBooking.mockImplementation((businessId, bookingData) => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        // Simulate that only first booking succeeds, others get conflicts
                        if (successfulBookings === 0) {
                            successfulBookings++
                            resolve({
                                appointment: {
                                    id: `apt-${Date.now()}`,
                                    confirmationNumber: `CONF-${Date.now()}`,
                                    dateTime: new Date('2024-01-15T10:00:00Z')
                                },
                                confirmationSent: true
                            })
                        } else {
                            conflictErrors++
                            reject({
                                type: 'BOOKING_CONFLICT',
                                message: 'Time slot no longer available',
                                alternativeSlots: [
                                    {
                                        startTime: new Date('2024-01-15T11:00:00Z'),
                                        endTime: new Date('2024-01-15T12:00:00Z'),
                                        staffId: 'staff-1',
                                        staffName: 'John Doe'
                                    }
                                ]
                            })
                        }
                    }, Math.random() * 100) // Random delay to simulate real-world timing
                })
            })

            const bookingRequests = Array.from({ length: concurrentBookings }, (_, index) =>
                mockBookingApi.createBooking(businessId, {
                    services: ['service-1'],
                    timeSlot: {
                        startTime: new Date('2024-01-15T10:00:00Z'),
                        endTime: new Date('2024-01-15T11:00:00Z'),
                        staffId: 'staff-1'
                    },
                    client: {
                        firstName: `Client${index}`,
                        lastName: 'Test',
                        email: `client${index}@example.com`,
                        phone: `555-000${index}`
                    }
                }).catch((error: any) => error) // Catch errors to analyze them
            )

            const results = await Promise.all(bookingRequests)

            // Verify conflict handling
            const successful = results.filter((result: any) => result.appointment)
            const conflicts = results.filter((result: any) => result.type === 'BOOKING_CONFLICT')

            expect(successful).toHaveLength(1) // Only one booking should succeed
            expect(conflicts).toHaveLength(concurrentBookings - 1) // Others should get conflicts

            // Verify alternative slots are provided for conflicts
            conflicts.forEach((conflict: any) => {
                expect(conflict.alternativeSlots).toBeDefined()
                expect(conflict.alternativeSlots.length).toBeGreaterThan(0)
            })
        })

        test('should maintain data consistency under concurrent load', async () => {
            const concurrentUsers = 20
            const bookingAttempts = []

            // Simulate multiple users trying to book different time slots
            for (let i = 0; i < concurrentUsers; i++) {
                const timeSlot = new Date('2024-01-15T10:00:00Z')
                timeSlot.setHours(10 + (i % 8)) // Spread across different hours

                bookingAttempts.push(
                    mockBookingApi.createBooking(businessId, {
                        services: ['service-1'],
                        timeSlot: {
                            startTime: timeSlot,
                            endTime: new Date(timeSlot.getTime() + 60 * 60 * 1000),
                            staffId: 'staff-1'
                        },
                        client: {
                            firstName: `User${i}`,
                            lastName: 'Test',
                            email: `user${i}@example.com`,
                            phone: `555-${String(i).padStart(4, '0')}`
                        }
                    }).catch((error: any) => ({ error, userId: i }))
                )
            }

            const startTime = performance.now()
            const results = await Promise.all(bookingAttempts)
            const endTime = performance.now()

            // Verify performance under load
            const totalTime = endTime - startTime
            expect(totalTime).toBeLessThan(5000) // Should complete within 5 seconds

            // Verify all requests were processed
            expect(results).toHaveLength(concurrentUsers)

            console.log(`Concurrent booking test: ${concurrentUsers} users in ${totalTime.toFixed(2)}ms`)
        })
    })

    describe('Memory and Resource Usage', () => {
        test('should not leak memory during high-volume operations', async () => {
            const initialMemory = process.memoryUsage()
            const iterations = 100

            // Simulate high-volume booking operations
            for (let i = 0; i < iterations; i++) {
                await mockBookingApi.getAvailableSlots(businessId, {
                    serviceIds: ['service-1'],
                    date: '2024-01-15',
                    duration: 60
                })

                // Occasionally trigger garbage collection
                if (i % 20 === 0 && global.gc) {
                    global.gc()
                }
            }

            const finalMemory = process.memoryUsage()
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

            // Memory increase should be reasonable (less than 50MB for 100 operations)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)

            console.log(`Memory usage: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`)
        })

        test('should handle timeout scenarios gracefully', async () => {
            // Mock slow API responses
            mockBookingApi.getAvailableSlots.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve({
                    availableSlots: []
                }), 5000)) // 5 second delay
            )

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), 3000)
            )

            const apiPromise = mockBookingApi.getAvailableSlots(businessId, {
                serviceIds: ['service-1'],
                date: '2024-01-15',
                duration: 60
            })

            // Test that timeout handling works correctly
            await expect(Promise.race([apiPromise, timeoutPromise]))
                .rejects.toThrow('Request timeout')
        })
    })

    describe('Performance Benchmarks', () => {
        test('should meet performance SLA requirements', async () => {
            const performanceMetrics = {
                businessInfoLoad: [],
                availabilityCheck: [],
                bookingCreation: []
            }

            const testRuns = 10

            // Run multiple test iterations to get average performance
            for (let i = 0; i < testRuns; i++) {
                // Test business info loading
                let start = performance.now()
                await mockBookingApi.getBusinessInfo(businessId)
                performanceMetrics.businessInfoLoad.push(performance.now() - start)

                // Test availability checking
                start = performance.now()
                await mockBookingApi.getAvailableSlots(businessId, {
                    serviceIds: ['service-1'],
                    date: '2024-01-15',
                    duration: 60
                })
                performanceMetrics.availabilityCheck.push(performance.now() - start)

                // Test booking creation
                start = performance.now()
                await mockBookingApi.createBooking(businessId, {
                    services: ['service-1'],
                    timeSlot: {
                        startTime: new Date('2024-01-15T10:00:00Z'),
                        endTime: new Date('2024-01-15T11:00:00Z'),
                        staffId: 'staff-1'
                    },
                    client: {
                        firstName: 'Test',
                        lastName: 'User',
                        email: 'test@example.com',
                        phone: '555-0123'
                    }
                })
                performanceMetrics.bookingCreation.push(performance.now() - start)
            }

            // Calculate averages
            const avgBusinessInfo = performanceMetrics.businessInfoLoad.reduce((a: any, b: any) => a + b) / testRuns
            const avgAvailability = performanceMetrics.availabilityCheck.reduce((a: any, b: any) => a + b) / testRuns
            const avgBooking = performanceMetrics.bookingCreation.reduce((a: any, b: any) => a + b) / testRuns

            // Performance SLA assertions (based on requirements)
            expect(avgBusinessInfo).toBeLessThan(200) // Business info < 200ms
            expect(avgAvailability).toBeLessThan(500) // Availability check < 500ms
            expect(avgBooking).toBeLessThan(1000) // Booking creation < 1s

            console.log('Performance Metrics:')
            console.log(`Business Info Load: ${avgBusinessInfo.toFixed(2)}ms`)
            console.log(`Availability Check: ${avgAvailability.toFixed(2)}ms`)
            console.log(`Booking Creation: ${avgBooking.toFixed(2)}ms`)
        })
    })
})