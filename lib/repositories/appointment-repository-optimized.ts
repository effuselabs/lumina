/**
 * Optimized Appointment Repository
 * 
 * Enhanced appointment repository with database query optimization,
 * efficient pagination, and performance monitoring for sub-500ms operations.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { prisma } from '@/lib/prisma'
import { AppointmentWithRelations } from '@/types/database'
import { AppointmentStatus, Prisma } from '@prisma/client'
import { performance } from 'perf_hooks'

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

interface QueryPerformanceMetrics {
    operation: string
    duration: number
    recordCount: number
    timestamp: Date
    businessId: string
    queryType: 'read' | 'write' | 'aggregate'
}

class PerformanceMonitor {
    private static instance: PerformanceMonitor
    private metrics: QueryPerformanceMetrics[] = []
    private readonly MAX_METRICS = 1000
    private readonly PERFORMANCE_THRESHOLD_MS = 500

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor()
        }
        return PerformanceMonitor.instance
    }

    async measureQuery<T>(
        operation: string,
        businessId: string,
        queryType: 'read' | 'write' | 'aggregate',
        queryFn: () => Promise<T>
    ): Promise<T> {
        const startTime = performance.now()

        try {
            const result = await queryFn()
            const duration = performance.now() - startTime

            // Determine record count
            let recordCount = 0
            if (Array.isArray(result)) {
                recordCount = result.length
            } else if (result && typeof result === 'object' && 'appointments' in result) {
                recordCount = (result as any).appointments?.length || 0
            } else if (result) {
                recordCount = 1
            }

            // Store metrics
            this.recordMetric({
                operation,
                duration,
                recordCount,
                timestamp: new Date(),
                businessId,
                queryType
            })

            // Log slow queries
            if (duration > this.PERFORMANCE_THRESHOLD_MS) {
                console.warn(`Slow query detected: ${operation} took ${duration.toFixed(2)}ms`)
            }

            return result
        } catch (error) {
            const duration = performance.now() - startTime
            console.error(`Query failed: ${operation} after ${duration.toFixed(2)}ms`, error)
            throw error
        }
    }

    private recordMetric(metric: QueryPerformanceMetrics): void {
        this.metrics.push(metric)

        // Keep only recent metrics
        if (this.metrics.length > this.MAX_METRICS) {
            this.metrics = this.metrics.slice(-this.MAX_METRICS)
        }
    }

    getPerformanceStats(businessId?: string): {
        averageDuration: number
        slowQueries: number
        totalQueries: number
        queryTypeBreakdown: Record<string, { count: number; avgDuration: number }>
    } {
        const relevantMetrics = businessId
            ? this.metrics.filter(m => m.businessId === businessId)
            : this.metrics

        if (relevantMetrics.length === 0) {
            return {
                averageDuration: 0,
                slowQueries: 0,
                totalQueries: 0,
                queryTypeBreakdown: {}
            }
        }

        const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0)
        const slowQueries = relevantMetrics.filter(m => m.duration > this.PERFORMANCE_THRESHOLD_MS).length

        // Group by query type
        const queryTypeBreakdown: Record<string, { count: number; avgDuration: number }> = {}

        for (const metric of relevantMetrics) {
            if (!queryTypeBreakdown[metric.queryType]) {
                queryTypeBreakdown[metric.queryType] = { count: 0, avgDuration: 0 }
            }
            queryTypeBreakdown[metric.queryType].count++
        }

        // Calculate averages
        for (const [type, stats] of Object.entries(queryTypeBreakdown)) {
            const typeMetrics = relevantMetrics.filter(m => m.queryType === type)
            const typeDuration = typeMetrics.reduce((sum, m) => sum + m.duration, 0)
            stats.avgDuration = typeDuration / typeMetrics.length
        }

        return {
            averageDuration: totalDuration / relevantMetrics.length,
            slowQueries,
            totalQueries: relevantMetrics.length,
            queryTypeBreakdown
        }
    }
}

// ============================================================================
// OPTIMIZED QUERY BUILDERS
// ============================================================================

class OptimizedQueryBuilder {
    /**
     * Build optimized appointment include clause with selective loading
     */
    static buildAppointmentInclude(options: {
        includeClient?: boolean
        includeStaff?: boolean
        includeServices?: boolean
        includeTransactions?: boolean
        includeStatusHistory?: boolean
    } = {}): Prisma.AppointmentInclude {
        const {
            includeClient = true,
            includeStaff = true,
            includeServices = true,
            includeTransactions = false,
            includeStatusHistory = false
        } = options

        return {
            ...(includeClient && {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true
                    }
                }
            }),
            ...(includeStaff && {
                staff: {
                    select: {
                        id: true,
                        displayName: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            }),
            ...(includeServices && {
                services: {
                    select: {
                        id: true,
                        serviceId: true,
                        serviceName: true,
                        price: true,
                        duration: true,
                        serviceOrder: true,
                        startOffset: true,
                        assignedStaffId: true,
                        service: {
                            select: {
                                id: true,
                                name: true,
                                category: true
                            }
                        }
                    },
                    orderBy: {
                        serviceOrder: 'asc' as const
                    }
                }
            }),
            ...(includeTransactions && {
                transactions: {
                    select: {
                        id: true,
                        type: true,
                        status: true,
                        amount: true,
                        createdAt: true
                    }
                }
            }),
            ...(includeStatusHistory && {
                statusHistory: {
                    select: {
                        id: true,
                        oldStatus: true,
                        newStatus: true,
                        changedBy: true,
                        reason: true,
                        createdAt: true
                    },
                    orderBy: {
                        createdAt: 'desc' as const
                    },
                    take: 10 // Limit status history to recent entries
                }
            })
        }
    }

    /**
     * Build optimized where clause with proper indexing utilization
     */
    static buildOptimizedWhere(
        businessId: string,
        filters: {
            status?: AppointmentStatus | AppointmentStatus[]
            startDate?: Date
            endDate?: Date
            clientId?: string
            staffId?: string
            search?: string
        }
    ): Prisma.AppointmentWhereInput {
        const {
            status,
            startDate,
            endDate,
            clientId,
            staffId,
            search
        } = filters

        const where: Prisma.AppointmentWhereInput = {
            businessId, // Always first for index utilization
            ...(status && {
                status: Array.isArray(status) ? { in: status } : status
            }),
            ...(staffId && { staffId }), // Utilize businessId + staffId index
            ...(clientId && { clientId }),
            ...(startDate && endDate && {
                startTime: {
                    gte: startDate,
                    lte: endDate
                }
            }),
            ...(search && {
                OR: [
                    {
                        client: {
                            OR: [
                                { firstName: { contains: search, mode: 'insensitive' } },
                                { lastName: { contains: search, mode: 'insensitive' } },
                                { email: { contains: search, mode: 'insensitive' } },
                                { phone: { contains: search } }
                            ]
                        }
                    },
                    { clientName: { contains: search, mode: 'insensitive' } },
                    { clientEmail: { contains: search, mode: 'insensitive' } },
                    { clientPhone: { contains: search } }
                ]
            })
        }

        return where
    }

    /**
     * Build cursor-based pagination for efficient large dataset handling
     */
    static buildCursorPagination(
        cursor?: string,
        limit: number = 50,
        orderBy: 'startTime' | 'createdAt' | 'updatedAt' = 'startTime',
        orderDirection: 'asc' | 'desc' = 'asc'
    ): {
        cursor?: { id: string }
        take: number
        skip?: number
        orderBy: Prisma.AppointmentOrderByWithRelationInput
    } {
        return {
            ...(cursor && { cursor: { id: cursor } }),
            take: limit + 1, // Take one extra to determine if there are more results
            ...(cursor && { skip: 1 }), // Skip the cursor record
            orderBy: {
                [orderBy]: orderDirection,
                id: 'asc' // Secondary sort for consistent pagination
            }
        }
    }
}

// ============================================================================
// OPTIMIZED APPOINTMENT REPOSITORY
// ============================================================================

export class OptimizedAppointmentRepository {
    private performanceMonitor = PerformanceMonitor.getInstance()

    /**
     * Optimized appointment creation with minimal database roundtrips
     */
    async create(
        request: {
            businessId: string
            clientId?: string
            staffId: string
            userId?: string
            startTime: Date
            endTime: Date
            totalDuration: number
            totalPrice: number
            clientName?: string
            clientEmail?: string
            clientPhone?: string
            notes?: string
            internalNotes?: string
            depositAmount?: number
            depositPaid?: boolean
            services: Array<{
                serviceId: string
                serviceName: string
                price: number
                duration: number
                serviceOrder?: number
                startOffset?: number
                assignedStaffId?: string
            }>
        }
    ): Promise<AppointmentWithRelations> {
        return this.performanceMonitor.measureQuery(
            'create_appointment',
            request.businessId,
            'write',
            async () => {
                // Single transaction for atomic creation
                return await prisma.$transaction(async (tx) => {
                    // Validate business context in single query
                    const [staffExists, clientExists] = await Promise.all([
                        tx.staff.findFirst({
                            where: { id: request.staffId, businessId: request.businessId },
                            select: { id: true }
                        }),
                        request.clientId ? tx.client.findFirst({
                            where: { id: request.clientId, businessId: request.businessId },
                            select: { id: true }
                        }) : Promise.resolve(true)
                    ])

                    if (!staffExists) {
                        throw new Error('Staff member not found or access denied')
                    }
                    if (request.clientId && !clientExists) {
                        throw new Error('Client not found or access denied')
                    }

                    // Create appointment with services in single operation
                    const appointment = await tx.appointment.create({
                        data: {
                            businessId: request.businessId,
                            clientId: request.clientId,
                            staffId: request.staffId,
                            userId: request.userId,
                            startTime: request.startTime,
                            endTime: request.endTime,
                            totalDuration: request.totalDuration,
                            totalPrice: request.totalPrice,
                            clientName: request.clientName,
                            clientEmail: request.clientEmail,
                            clientPhone: request.clientPhone,
                            notes: request.notes,
                            internalNotes: request.internalNotes,
                            depositAmount: request.depositAmount,
                            depositPaid: request.depositPaid || false,
                            services: {
                                create: request.services.map((service, index) => ({
                                    serviceId: service.serviceId,
                                    serviceName: service.serviceName,
                                    price: service.price,
                                    duration: service.duration,
                                    serviceOrder: service.serviceOrder || index + 1,
                                    startOffset: service.startOffset || 0,
                                    assignedStaffId: service.assignedStaffId
                                }))
                            }
                        },
                        include: OptimizedQueryBuilder.buildAppointmentInclude()
                    })

                    return appointment
                })
            }
        )
    }

    /**
     * Optimized appointment retrieval by ID with selective loading
     */
    async findById(
        id: string,
        businessId: string,
        options: {
            includeClient?: boolean
            includeStaff?: boolean
            includeServices?: boolean
            includeTransactions?: boolean
            includeStatusHistory?: boolean
        } = {}
    ): Promise<AppointmentWithRelations | null> {
        return this.performanceMonitor.measureQuery(
            'find_appointment_by_id',
            businessId,
            'read',
            async () => {
                return await prisma.appointment.findFirst({
                    where: { id, businessId }, // Utilize composite index
                    include: OptimizedQueryBuilder.buildAppointmentInclude(options)
                })
            }
        )
    }

    /**
     * Optimized business appointments with cursor-based pagination
     */
    async findByBusinessOptimized(
        businessId: string,
        filters: {
            status?: AppointmentStatus | AppointmentStatus[]
            startDate?: Date
            endDate?: Date
            clientId?: string
            staffId?: string
            search?: string
            cursor?: string
            limit?: number
            orderBy?: 'startTime' | 'createdAt' | 'updatedAt'
            orderDirection?: 'asc' | 'desc'
        } = {}
    ): Promise<{
        appointments: AppointmentWithRelations[]
        hasMore: boolean
        nextCursor?: string
        totalCount?: number
    }> {
        return this.performanceMonitor.measureQuery(
            'find_appointments_by_business',
            businessId,
            'read',
            async () => {
                const {
                    cursor,
                    limit = 50,
                    orderBy = 'startTime',
                    orderDirection = 'asc',
                    ...filterOptions
                } = filters

                const where = OptimizedQueryBuilder.buildOptimizedWhere(businessId, filterOptions)
                const pagination = OptimizedQueryBuilder.buildCursorPagination(
                    cursor,
                    limit,
                    orderBy,
                    orderDirection
                )

                // Execute query with optimized pagination
                const appointments = await prisma.appointment.findMany({
                    where,
                    include: OptimizedQueryBuilder.buildAppointmentInclude({
                        includeTransactions: false, // Exclude heavy relations by default
                        includeStatusHistory: false
                    }),
                    ...pagination
                })

                // Determine if there are more results
                const hasMore = appointments.length > limit
                const resultAppointments = hasMore ? appointments.slice(0, limit) : appointments
                const nextCursor = hasMore ? resultAppointments[resultAppointments.length - 1].id : undefined

                return {
                    appointments: resultAppointments,
                    hasMore,
                    nextCursor
                }
            }
        )
    }

    /**
     * Optimized staff appointments with date range indexing
     */
    async findByStaffOptimized(
        staffId: string,
        businessId: string,
        dateRange?: { startDate: Date; endDate: Date },
        options: {
            status?: AppointmentStatus | AppointmentStatus[]
            cursor?: string
            limit?: number
            orderBy?: 'startTime' | 'createdAt'
            orderDirection?: 'asc' | 'desc'
        } = {}
    ): Promise<{
        appointments: AppointmentWithRelations[]
        hasMore: boolean
        nextCursor?: string
    }> {
        return this.performanceMonitor.measureQuery(
            'find_appointments_by_staff',
            businessId,
            'read',
            async () => {
                const {
                    status,
                    cursor,
                    limit = 50,
                    orderBy = 'startTime',
                    orderDirection = 'asc'
                } = options

                // Utilize businessId + staffId + startTime composite index
                const where: Prisma.AppointmentWhereInput = {
                    businessId,
                    staffId,
                    ...(status && {
                        status: Array.isArray(status) ? { in: status } : status
                    }),
                    ...(dateRange && {
                        startTime: {
                            gte: dateRange.startDate,
                            lte: dateRange.endDate
                        }
                    })
                }

                const pagination = OptimizedQueryBuilder.buildCursorPagination(
                    cursor,
                    limit,
                    orderBy,
                    orderDirection
                )

                const appointments = await prisma.appointment.findMany({
                    where,
                    include: OptimizedQueryBuilder.buildAppointmentInclude({
                        includeTransactions: false,
                        includeStatusHistory: false
                    }),
                    ...pagination
                })

                const hasMore = appointments.length > limit
                const resultAppointments = hasMore ? appointments.slice(0, limit) : appointments
                const nextCursor = hasMore ? resultAppointments[resultAppointments.length - 1].id : undefined

                return {
                    appointments: resultAppointments,
                    hasMore,
                    nextCursor
                }
            }
        )
    }

    /**
     * Optimized conflict detection with minimal data transfer
     */
    async findConflictsOptimized(
        staffId: string,
        businessId: string,
        timeSlot: { startTime: Date; endTime: Date },
        excludeId?: string
    ): Promise<Array<{
        appointmentId: string
        startTime: Date
        endTime: Date
        clientName: string
        serviceCount: number
    }>> {
        return this.performanceMonitor.measureQuery(
            'find_appointment_conflicts',
            businessId,
            'read',
            async () => {
                // Use optimized query with minimal data selection
                const conflicts = await prisma.appointment.findMany({
                    where: {
                        businessId,
                        staffId,
                        ...(excludeId && { id: { not: excludeId } }),
                        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
                        OR: [
                            {
                                startTime: {
                                    gte: timeSlot.startTime,
                                    lt: timeSlot.endTime
                                }
                            },
                            {
                                endTime: {
                                    gt: timeSlot.startTime,
                                    lte: timeSlot.endTime
                                }
                            },
                            {
                                startTime: { lte: timeSlot.startTime },
                                endTime: { gte: timeSlot.endTime }
                            }
                        ]
                    },
                    select: {
                        id: true,
                        startTime: true,
                        endTime: true,
                        clientName: true,
                        client: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        },
                        _count: {
                            select: {
                                services: true
                            }
                        }
                    },
                    orderBy: { startTime: 'asc' }
                })

                return conflicts.map(appointment => ({
                    appointmentId: appointment.id,
                    startTime: appointment.startTime,
                    endTime: appointment.endTime,
                    clientName: appointment.client
                        ? `${appointment.client.firstName} ${appointment.client.lastName}`
                        : appointment.clientName || 'Walk-in Client',
                    serviceCount: appointment._count.services
                }))
            }
        )
    }

    /**
     * Optimized appointment statistics with aggregation queries
     */
    async getAppointmentStatsOptimized(
        businessId: string,
        dateRange: { startDate: Date; endDate: Date }
    ): Promise<{
        total: number
        byStatus: Record<string, number>
        byStaff: Array<{ staffId: string; staffName: string; count: number; revenue: number }>
        totalRevenue: number
        averageAppointmentValue: number
    }> {
        return this.performanceMonitor.measureQuery(
            'get_appointment_stats',
            businessId,
            'aggregate',
            async () => {
                // Use parallel aggregation queries for optimal performance
                const [statusStats, staffStats, revenueStats] = await Promise.all([
                    // Status breakdown
                    prisma.appointment.groupBy({
                        by: ['status'],
                        where: {
                            businessId,
                            startTime: {
                                gte: dateRange.startDate,
                                lte: dateRange.endDate
                            }
                        },
                        _count: { status: true }
                    }),
                    // Staff breakdown with revenue
                    prisma.appointment.groupBy({
                        by: ['staffId'],
                        where: {
                            businessId,
                            startTime: {
                                gte: dateRange.startDate,
                                lte: dateRange.endDate
                            }
                        },
                        _count: { staffId: true },
                        _sum: { totalPrice: true }
                    }),
                    // Overall revenue stats
                    prisma.appointment.aggregate({
                        where: {
                            businessId,
                            startTime: {
                                gte: dateRange.startDate,
                                lte: dateRange.endDate
                            }
                        },
                        _count: true,
                        _sum: { totalPrice: true },
                        _avg: { totalPrice: true }
                    })
                ])

                // Get staff details in single query
                const staffIds = staffStats.map(stat => stat.staffId)
                const staffDetails = staffIds.length > 0 ? await prisma.staff.findMany({
                    where: {
                        id: { in: staffIds },
                        businessId
                    },
                    select: {
                        id: true,
                        displayName: true,
                        user: { select: { name: true } }
                    }
                }) : []

                // Format results
                const byStatus = statusStats.reduce((acc, stat) => {
                    acc[stat.status] = stat._count.status
                    return acc
                }, {} as Record<string, number>)

                const byStaff = staffStats.map(stat => {
                    const staff = staffDetails.find(s => s.id === stat.staffId)
                    return {
                        staffId: stat.staffId,
                        staffName: staff?.displayName || staff?.user?.name || 'Unknown Staff',
                        count: stat._count.staffId,
                        revenue: Number(stat._sum.totalPrice || 0)
                    }
                })

                return {
                    total: revenueStats._count,
                    byStatus,
                    byStaff,
                    totalRevenue: Number(revenueStats._sum.totalPrice || 0),
                    averageAppointmentValue: Number(revenueStats._avg.totalPrice || 0)
                }
            }
        )
    }

    /**
     * Batch update appointments for efficient bulk operations
     */
    async batchUpdateStatus(
        appointmentIds: string[],
        businessId: string,
        status: AppointmentStatus,
        reason?: string
    ): Promise<{ updated: number; errors: string[] }> {
        return this.performanceMonitor.measureQuery(
            'batch_update_appointment_status',
            businessId,
            'write',
            async () => {
                const errors: string[] = []
                let updated = 0

                try {
                    // Validate all appointments belong to business
                    const validAppointments = await prisma.appointment.findMany({
                        where: {
                            id: { in: appointmentIds },
                            businessId
                        },
                        select: { id: true }
                    })

                    const validIds = validAppointments.map(a => a.id)
                    const invalidIds = appointmentIds.filter(id => !validIds.includes(id))

                    if (invalidIds.length > 0) {
                        errors.push(`Invalid appointment IDs: ${invalidIds.join(', ')}`)
                    }

                    if (validIds.length > 0) {
                        // Batch update with transaction
                        await prisma.$transaction(async (tx) => {
                            // Update appointments
                            const result = await tx.appointment.updateMany({
                                where: { id: { in: validIds } },
                                data: {
                                    status,
                                    ...(status === 'CONFIRMED' && { confirmedAt: new Date() }),
                                    ...(status === 'IN_PROGRESS' && { startedAt: new Date() }),
                                    ...(status === 'COMPLETED' && { completedAt: new Date() }),
                                    ...(status === 'CANCELLED' && {
                                        cancelledAt: new Date(),
                                        cancellationReason: reason
                                    })
                                }
                            })

                            updated = result.count

                            // Create status history records
                            await tx.appointmentStatusHistory.createMany({
                                data: validIds.map(appointmentId => ({
                                    appointmentId,
                                    businessId,
                                    newStatus: status,
                                    reason
                                }))
                            })
                        })
                    }

                    return { updated, errors }
                } catch (error) {
                    errors.push(`Batch update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
                    return { updated, errors }
                }
            }
        )
    }

    /**
     * Get performance metrics for monitoring
     */
    getPerformanceMetrics(businessId?: string) {
        return this.performanceMonitor.getPerformanceStats(businessId)
    }
}

// Export singleton instance
export const optimizedAppointmentRepository = new OptimizedAppointmentRepository()