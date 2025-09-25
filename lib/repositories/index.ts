// Calendar Infrastructure Repositories
export { BusinessHoursRepository } from './business-hours-repository'
export { StaffAvailabilityRepository } from './staff-availability-repository'
export { TimeOffRequestRepository } from './time-off-request-repository'

// Re-export types for convenience
export type {
    BusinessHoursWithHolidays, BusinessSchedule,
    Holiday
} from './business-hours-repository'

export type {
    AvailabilityPattern, AvailabilitySlot,
    ConflictInfo, DateRange, DayAvailability, RecurringPattern
} from './staff-availability-repository'

export type {
    TimeOffApproval,
    TimeOffConflict, TimeOffRequestData, TimeOffRequestWithDetails
} from './time-off-request-repository'
