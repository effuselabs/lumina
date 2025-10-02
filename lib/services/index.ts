// Service Duration Validation System
export { ServiceDurationValidator } from './service-duration-validator'
export { TimeSlotAnalysisEngine } from './time-slot-analysis-engine'

// Availability Calculation and Caching System
export { AvailabilityCache } from './availability-cache'
export { AvailabilityCalculator } from './availability-calculator'

// Re-export types for convenience
export type {
    MultiServiceBooking,
    ServiceDuration, TimeSlot,
    ValidationResult
} from './service-duration-validator'

export type {
    AvailabilityGap,
    ContinuousTimeSlot, MultiServiceAvailabilityOptions, ServiceAvailabilityOptions, SlotValidationResult
} from './time-slot-analysis-engine'

export type {
    AvailabilityConstraints, AvailabilitySlot, AvailabilityQuery, AvailabilityResult
} from './availability-calculator'

export type {
    CacheEntry,
    CacheMetrics, CacheOptions
} from './availability-cache'

