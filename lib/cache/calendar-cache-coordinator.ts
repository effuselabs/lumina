/**
 * Calendar Cache Coordinator
 * 
 * Coordinates cache invalidation between appointment cache and calendar infrastructure
 * (LUM-96) to ensure data consistency and optimal performance.
 * 
 * Requirements: 6.3, 6.4, 4.4
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { EventEmitter } from 'events'
import { AppointmentCacheManager } from './appointment-cache'

// ============================================================================
// CACHE COORDINATION TYPES
// ============================================================================

interface CacheInvalidationEvent {
    type: 'appointment_created' | 'appointment_updated' | 'appointment_deleted' | 'availability_changed'
    businessId: string
    staffId: string
    appointmentId?: string
    timeSlot?: {
        startTime: Date
        endTime: Date
    }
    affectedServices?: string[]
    timestamp: Date
}

interface CacheCoordinationConfig {
    enableCoordination: boolean
    invalidationDelay: number // ms
    batchInvalidationSize: number
    retryAttempts: number
    retryDelay: number // ms
}

// ============================================================================
// CALENDAR CACHE COORDINATOR
// ============================================================================

export class CalendarCacheCoordinator extends EventEmitter {
    private static instance: CalendarCacheCoordinator
    private appointmentCache: AppointmentCacheManager
    private config: CacheCoordinationConfig
    private invalidationQueue: Map<string, CacheInvalidationEvent[]> = new Map()
    private processingTimer?: NodeJS.Timeout

    private constructor() {
        super()
        this.appointmentCache = AppointmentCacheManager.getInstance()
        this.config = {
            enableCoordination: true,
            invalidationDelay: 200, // 200ms delay for batching
            batchInvalidationSize: 50,
            retryAttempts: 3,
            retryDelay: 1000 // 1 second
        }

        this.setupEventHandlers()
    }

    static getInstance(): CalendarCacheCoordinator {
        if (!CalendarCacheCoordinator.instance) {
            CalendarCacheCoordinator.instance = new CalendarCacheCoordinator()
        }
        return CalendarCacheCoordinator.instance
    }

    private setupEventHandlers(): void {
        // Listen for appointment events
        this.on('appointment_created', this.handleAppointmentCreated.bind(this))
        this.on('appointment_updated', this.handleAppointmentUpdated.bind(this))
        this.on('appointment_deleted', this.handleAppointmentDeleted.bind(this))
        this.on('availability_changed', this.handleAvailabilityChanged.bind(this))
    }

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================

    /**
     * Handle appointment creation events
     */
    private async handleAppointmentCreated(event: CacheInvalidationEvent): Promise<void> {
        console.log(`Handling appointment created: ${event.appointmentId}`)

        // Invalidate appointment-related caches
        await this.invalidateAppointmentCaches(event)

        // Coordinate with calendar infrastructure
        await this.coordinateWithCalendarInfrastructure(event)

        // Invalidate availability caches
        await this.invalidateAvailabilityCaches(event)
    }

    /**
     * Handle appointment update events
     */
    private async handleAppointmentUpdated(event: CacheInvalidationEvent): Promise<void> {
        console.log(`Handling appointment updated: ${event.appointmentId}`)

        // Invalidate appointment-related caches
        await this.invalidateAppointmentCaches(event)

        // If time slot changed, invalidate old and new time slots
        if (event.timeSlot) {
            await this.invalidateTimeSlotCaches(event)
        }

        // Coordinate with calendar infrastructure
        await this.coordinateWithCalendarInfrastructure(event)
    }

    /**
     * Handle appointment deletion events
     */
    private async handleAppointmentDeleted(event: CacheInvalidationEvent): Promise<void> {
        console.log(`Handling appointment deleted: ${event.appointmentId}`)

        // Invalidate appointment-related caches
        await this.invalidateAppointmentCaches(event)

        // Coordinate with calendar infrastructure
        await this.coordinateWithCalendarInfrastructure(event)

        // Invalidate availability caches (slot is now available)
        await this.invalidateAvailabilityCaches(event)
    }

    /**
     * Handle availability change events from calendar infrastructure
     */
    private async handleAvailabilityChanged(event: CacheInvalidationEvent): Promise<void> {
        console.log(`Handling availability changed for staff: ${event.staffId}`)

        // Invalidate availability-related caches
        await this.invalidateAvailabilityCaches(event)

        // Invalidate conflict detection caches
        await this.invalidateConflictCaches(event)
    }

    // ============================================================================
    // CACHE INVALIDATION METHODS
    // ============================================================================

    /**
     * Invalidate appointment-related caches
     */
    private async invalidateAppointmentCaches(event: CacheInvalidationEvent): Promise<void> {
        try {
            if (event.appointmentId) {
                // Invalidate specific appointment cache
                await this.appointmentCache.invalidateAppointment(
                    event.appointmentId,
                    event.businessId,
                    event.staffId
                )
            }

            // Invalidate business appointment lists
            await this.appointmentCache.invalidateBusinessAppointments(event.businessId)

            // Invalidate staff appointment lists
            await this.appointmentCache.invalidateStaffAppointments(event.staffId, event.businessId)

        } catch (error) {
            console.error('Error invalidating appointment caches:', error)
        }
    }

    /**
     * Invalidate availability-related caches
     */
    private async invalidateAvailabilityCaches(event: CacheInvalidationEvent): Promise<void> {
        try {
            // This would coordinate with LUM-96 availability cache
            // For now, we'll emit an event that the calendar infrastructure can listen to
            this.emit('invalidate_availability_cache', {
                businessId: event.businessId,
                staffId: event.staffId,
                timeSlot: event.timeSlot,
                timestamp: new Date()
            })

            console.log(`Requested availability cache invalidation for staff ${event.staffId}`)
        } catch (error) {
            console.error('Error invalidating availability caches:', error)
        }
    }

    /**
     * Invalidate time slot specific caches
     */
    private async invalidateTimeSlotCaches(event: CacheInvalidationEvent): Promise<void> {
        if (!event.timeSlot) return

        try {
            // Invalidate conflict detection caches for the time slot
            await this.invalidateConflictCaches(event)

            // Emit event for calendar infrastructure to invalidate time-specific caches
            this.emit('invalidate_timeslot_cache', {
                businessId: event.businessId,
                staffId: event.staffId,
                timeSlot: event.timeSlot,
                timestamp: new Date()
            })

        } catch (error) {
            console.error('Error invalidating time slot caches:', error)
        }
    }

    /**
     * Invalidate conflict detection caches
     */
    private async invalidateConflictCaches(event: CacheInvalidationEvent): Promise<void> {
        try {
            // Invalidate conflict detection caches for the staff member
            // This is a pattern-based invalidation for all conflict checks involving this staff
            const conflictPattern = `conflicts:${event.businessId}:${event.staffId}:*`

            // Note: This would use the cache manager's pattern invalidation
            // For now, we'll log the action
            console.log(`Would invalidate conflict caches with pattern: ${conflictPattern}`)

        } catch (error) {
            console.error('Error invalidating conflict caches:', error)
        }
    }

    // ============================================================================
    // CALENDAR INFRASTRUCTURE COORDINATION
    // ============================================================================

    /**
     * Coordinate cache invalidation with calendar infrastructure (LUM-96)
     */
    private async coordinateWithCalendarInfrastructure(event: CacheInvalidationEvent): Promise<void> {
        try {
            // This would integrate with the LUM-96 calendar infrastructure
            // to coordinate cache invalidation across both systems

            const coordinationPayload = {
                eventType: event.type,
                businessId: event.businessId,
                staffId: event.staffId,
                appointmentId: event.appointmentId,
                timeSlot: event.timeSlot,
                affectedServices: event.affectedServices,
                timestamp: event.timestamp,
                source: 'appointment_engine'
            }

            // Emit event for calendar infrastructure to handle
            this.emit('calendar_coordination_request', coordinationPayload)

            // In a real implementation, this might:
            // 1. Call LUM-96 cache invalidation API
            // 2. Publish to a message queue
            // 3. Update shared cache coordination state

            console.log(`Coordinated with calendar infrastructure for event: ${event.type}`)

        } catch (error) {
            console.error('Error coordinating with calendar infrastructure:', error)

            // Retry coordination if it fails
            await this.retryCoordination(event)
        }
    }

    /**
     * Retry coordination with calendar infrastructure
     */
    private async retryCoordination(event: CacheInvalidationEvent, attempt: number = 1): Promise<void> {
        if (attempt > this.config.retryAttempts) {
            console.error(`Failed to coordinate with calendar infrastructure after ${this.config.retryAttempts} attempts`)
            return
        }

        setTimeout(async () => {
            try {
                await this.coordinateWithCalendarInfrastructure(event)
            } catch (error) {
                console.warn(`Coordination retry ${attempt} failed:`, error)
                await this.retryCoordination(event, attempt + 1)
            }
        }, this.config.retryDelay * attempt)
    }

    // ============================================================================
    // BATCH INVALIDATION
    // ============================================================================

    /**
     * Queue invalidation event for batch processing
     */
    private queueInvalidation(event: CacheInvalidationEvent): void {
        const key = `${event.businessId}:${event.staffId}`

        if (!this.invalidationQueue.has(key)) {
            this.invalidationQueue.set(key, [])
        }

        this.invalidationQueue.get(key)!.push(event)

        this.scheduleBatchProcessing()
    }

    /**
     * Schedule batch processing of invalidation events
     */
    private scheduleBatchProcessing(): void {
        if (this.processingTimer) {
            return // Already scheduled
        }

        this.processingTimer = setTimeout(async () => {
            await this.processBatchInvalidations()
            this.processingTimer = undefined
        }, this.config.invalidationDelay)
    }

    /**
     * Process batched invalidation events
     */
    private async processBatchInvalidations(): Promise<void> {
        const batches = Array.from(this.invalidationQueue.entries())
        this.invalidationQueue.clear()

        for (const [key, events] of batches) {
            try {
                // Process events in batches
                const chunks = this.chunkArray(events, this.config.batchInvalidationSize)

                for (const chunk of chunks) {
                    await Promise.all(chunk.map(event => this.processInvalidationEvent(event)))
                }

                console.log(`Processed ${events.length} invalidation events for ${key}`)
            } catch (error) {
                console.error(`Error processing invalidation batch for ${key}:`, error)
            }
        }
    }

    /**
     * Process individual invalidation event
     */
    private async processInvalidationEvent(event: CacheInvalidationEvent): Promise<void> {
        switch (event.type) {
            case 'appointment_created':
                await this.handleAppointmentCreated(event)
                break
            case 'appointment_updated':
                await this.handleAppointmentUpdated(event)
                break
            case 'appointment_deleted':
                await this.handleAppointmentDeleted(event)
                break
            case 'availability_changed':
                await this.handleAvailabilityChanged(event)
                break
        }
    }

    /**
     * Utility to chunk array into smaller arrays
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = []
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize))
        }
        return chunks
    }

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    /**
     * Trigger appointment created event
     */
    async onAppointmentCreated(
        appointmentId: string,
        businessId: string,
        staffId: string,
        timeSlot: { startTime: Date; endTime: Date },
        serviceIds?: string[]
    ): Promise<void> {
        const event: CacheInvalidationEvent = {
            type: 'appointment_created',
            businessId,
            staffId,
            appointmentId,
            timeSlot,
            affectedServices: serviceIds,
            timestamp: new Date()
        }

        if (this.config.enableCoordination) {
            this.queueInvalidation(event)
        } else {
            await this.processInvalidationEvent(event)
        }
    }

    /**
     * Trigger appointment updated event
     */
    async onAppointmentUpdated(
        appointmentId: string,
        businessId: string,
        staffId: string,
        timeSlot?: { startTime: Date; endTime: Date },
        serviceIds?: string[]
    ): Promise<void> {
        const event: CacheInvalidationEvent = {
            type: 'appointment_updated',
            businessId,
            staffId,
            appointmentId,
            timeSlot,
            affectedServices: serviceIds,
            timestamp: new Date()
        }

        if (this.config.enableCoordination) {
            this.queueInvalidation(event)
        } else {
            await this.processInvalidationEvent(event)
        }
    }

    /**
     * Trigger appointment deleted event
     */
    async onAppointmentDeleted(
        appointmentId: string,
        businessId: string,
        staffId: string,
        timeSlot: { startTime: Date; endTime: Date }
    ): Promise<void> {
        const event: CacheInvalidationEvent = {
            type: 'appointment_deleted',
            businessId,
            staffId,
            appointmentId,
            timeSlot,
            timestamp: new Date()
        }

        if (this.config.enableCoordination) {
            this.queueInvalidation(event)
        } else {
            await this.processInvalidationEvent(event)
        }
    }

    /**
     * Trigger availability changed event (from calendar infrastructure)
     */
    async onAvailabilityChanged(
        businessId: string,
        staffId: string,
        timeSlot?: { startTime: Date; endTime: Date }
    ): Promise<void> {
        const event: CacheInvalidationEvent = {
            type: 'availability_changed',
            businessId,
            staffId,
            timeSlot,
            timestamp: new Date()
        }

        if (this.config.enableCoordination) {
            this.queueInvalidation(event)
        } else {
            await this.processInvalidationEvent(event)
        }
    }

    /**
     * Get coordination statistics
     */
    getCoordinationStats(): {
        queuedEvents: number
        processedEvents: number
        coordinationEnabled: boolean
        lastProcessingTime?: Date
    } {
        const queuedEvents = Array.from(this.invalidationQueue.values())
            .reduce((sum, events) => sum + events.length, 0)

        return {
            queuedEvents,
            processedEvents: 0, // Would track this in a real implementation
            coordinationEnabled: this.config.enableCoordination,
            lastProcessingTime: undefined // Would track this in a real implementation
        }
    }

    /**
     * Update coordination configuration
     */
    updateConfig(config: Partial<CacheCoordinationConfig>): void {
        this.config = { ...this.config, ...config }
    }

    /**
     * Shutdown coordinator
     */
    async shutdown(): Promise<void> {
        if (this.processingTimer) {
            clearTimeout(this.processingTimer)
        }

        // Process any remaining events
        if (this.invalidationQueue.size > 0) {
            await this.processBatchInvalidations()
        }

        this.removeAllListeners()
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const calendarCacheCoordinator = CalendarCacheCoordinator.getInstance()

// Utility functions for easy integration
export async function notifyAppointmentCreated(
    appointmentId: string,
    businessId: string,
    staffId: string,
    timeSlot: { startTime: Date; endTime: Date },
    serviceIds?: string[]
): Promise<void> {
    await calendarCacheCoordinator.onAppointmentCreated(appointmentId, businessId, staffId, timeSlot, serviceIds)
}

export async function notifyAppointmentUpdated(
    appointmentId: string,
    businessId: string,
    staffId: string,
    timeSlot?: { startTime: Date; endTime: Date },
    serviceIds?: string[]
): Promise<void> {
    await calendarCacheCoordinator.onAppointmentUpdated(appointmentId, businessId, staffId, timeSlot, serviceIds)
}

export async function notifyAppointmentDeleted(
    appointmentId: string,
    businessId: string,
    staffId: string,
    timeSlot: { startTime: Date; endTime: Date }
): Promise<void> {
    await calendarCacheCoordinator.onAppointmentDeleted(appointmentId, businessId, staffId, timeSlot)
}

export async function notifyAvailabilityChanged(
    businessId: string,
    staffId: string,
    timeSlot?: { startTime: Date; endTime: Date }
): Promise<void> {
    await calendarCacheCoordinator.onAvailabilityChanged(businessId, staffId, timeSlot)
}