/**
 * Appointment Validation Schemas
 *
 * Zod schemas for validating appointment API requests and ensuring
 * proper input validation and sanitization for all appointment operations.
 *
 * Requirements: 3.4, 3.5, 9.1, 9.2
 *
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { AppointmentStatus } from '@prisma/client';
import { z } from 'zod';

// ============================================================================
// BASE VALIDATION SCHEMAS
// ============================================================================

export const appointmentServiceSchema = z.object({
  serviceId: z.string().cuid('Invalid service ID format'),
  serviceName: z.string().min(1, 'Service name is required').max(255),
  price: z.number().min(0, 'Price must be positive'),
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
  serviceOrder: z
    .number()
    .min(1, 'Service order must be at least 1')
    .default(1),
  startOffset: z
    .number()
    .min(0, 'Start offset must be non-negative')
    .default(0),
  assignedStaffId: z.string().cuid('Invalid staff ID format').optional(),
});

export const dateRangeSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine(data => data.endDate >= data.startDate, {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  });

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// ============================================================================
// CREATE APPOINTMENT SCHEMA
// ============================================================================

export const createAppointmentSchema = z
  .object({
    businessId: z.string().cuid('Invalid business ID format'),
    clientId: z.string().cuid('Invalid client ID format').optional(),
    staffId: z.string().cuid('Invalid staff ID format'),
    userId: z.string().cuid('Invalid user ID format').optional(),

    // Appointment timing
    startTime: z.coerce.date().refine(date => date > new Date(), {
      message: 'Appointment must be scheduled in the future',
    }),
    endTime: z.coerce.date(),

    // Services
    services: z
      .array(appointmentServiceSchema)
      .min(1, 'At least one service is required'),

    // Client information (for walk-ins)
    clientName: z.string().min(1).max(100).optional(),
    clientEmail: z.string().email('Invalid email format').optional(),
    clientPhone: z
      .string()
      .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
      .max(20)
      .optional(),

    // Appointment details
    notes: z
      .string()
      .max(1000, 'Notes must be less than 1000 characters')
      .optional(),
    internalNotes: z
      .string()
      .max(1000, 'Internal notes must be less than 1000 characters')
      .optional(),

    // Payment information
    depositAmount: z
      .number()
      .min(0, 'Deposit amount must be positive')
      .optional(),
    depositPaid: z.boolean().default(false),
  })
  .refine(data => data.endTime > data.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  })
  .refine(
    data => {
      // Either clientId or client contact info must be provided
      return (
        data.clientId ||
        (data.clientName && (data.clientEmail || data.clientPhone))
      );
    },
    {
      message:
        'Either client ID or client contact information (name and email/phone) is required',
      path: ['clientId'],
    }
  );

// ============================================================================
// UPDATE APPOINTMENT SCHEMA
// ============================================================================

export const updateAppointmentSchema = z
  .object({
    // Appointment timing
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),

    // Services (optional for updates)
    services: z.array(appointmentServiceSchema).optional(),

    // Client information updates
    clientName: z.string().min(1).max(100).optional(),
    clientEmail: z.string().email('Invalid email format').optional(),
    clientPhone: z
      .string()
      .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
      .max(20)
      .optional(),

    // Appointment details
    notes: z
      .string()
      .max(1000, 'Notes must be less than 1000 characters')
      .optional(),
    internalNotes: z
      .string()
      .max(1000, 'Internal notes must be less than 1000 characters')
      .optional(),

    // Payment information
    depositAmount: z
      .number()
      .min(0, 'Deposit amount must be positive')
      .optional(),
    depositPaid: z.boolean().optional(),

    // Status (handled separately in status endpoint)
    status: z.nativeEnum(AppointmentStatus).optional(),
  })
  .refine(
    data => {
      // If both start and end times are provided, end must be after start
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const appointmentFiltersSchema = z
  .object({
    // Pagination
    ...paginationSchema.shape,

    // Filtering
    staffId: z.string().cuid('Invalid staff ID format').optional(),
    clientId: z.string().cuid('Invalid client ID format').optional(),
    status: z.nativeEnum(AppointmentStatus).optional(),

    // Date filtering
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),

    // Search
    search: z.string().max(255).optional(),

    // Sorting
    sortBy: z
      .enum(['startTime', 'endTime', 'createdAt', 'updatedAt', 'status'])
      .default('startTime'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),

    // Additional options
    includeConflicts: z.coerce.boolean().default(false),
    validateAvailability: z.coerce.boolean().default(false),
  })
  .refine(
    data => {
      // If both dates are provided, end must be after start
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: 'End date must be after or equal to start date',
      path: ['endDate'],
    }
  );

// ============================================================================
// STATUS UPDATE SCHEMA
// ============================================================================

export const updateStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
  reason: z
    .string()
    .max(500, 'Reason must be less than 500 characters')
    .optional(),
  changedBy: z.string().cuid('Invalid user ID format').optional(),
});

// ============================================================================
// CANCELLATION SCHEMA
// ============================================================================

export const cancelAppointmentSchema = z.object({
  reason: z
    .string()
    .max(500, 'Cancellation reason must be less than 500 characters')
    .optional(),
  refundAmount: z.number().min(0, 'Refund amount must be positive').optional(),
  notifyClient: z.boolean().default(true),
  changedBy: z.string().cuid('Invalid user ID format').optional(),
});

// ============================================================================
// SERVICE MANAGEMENT SCHEMAS
// ============================================================================

export const addServicesSchema = z.object({
  services: z
    .array(appointmentServiceSchema)
    .min(1, 'At least one service is required'),
});

export const removeServicesSchema = z.object({
  serviceIds: z
    .array(z.string().cuid('Invalid service ID format'))
    .min(1, 'At least one service ID is required'),
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const validateAppointmentSchema = z
  .object({
    businessId: z.string().cuid('Invalid business ID format'),
    staffId: z.string().cuid('Invalid staff ID format'),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    services: z
      .array(z.string().cuid('Invalid service ID format'))
      .min(1, 'At least one service is required'),
    clientId: z.string().cuid('Invalid client ID format').optional(),
    excludeAppointmentId: z
      .string()
      .cuid('Invalid appointment ID format')
      .optional(),
  })
  .refine(data => data.endTime > data.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export const conflictCheckSchema = z
  .object({
    businessId: z.string().cuid('Invalid business ID format'),
    staffId: z.string().cuid('Invalid staff ID format').optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    excludeAppointmentId: z
      .string()
      .cuid('Invalid appointment ID format')
      .optional(),
  })
  .refine(data => data.endDate >= data.startDate, {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  });

// ============================================================================
// EXPORTED TYPES
// ============================================================================

export type CreateAppointmentRequest = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentRequest = z.infer<typeof updateAppointmentSchema>;
export type AppointmentFilters = z.infer<typeof appointmentFiltersSchema>;
export type UpdateStatusRequest = z.infer<typeof updateStatusSchema>;
export type CancelAppointmentRequest = z.infer<typeof cancelAppointmentSchema>;
export type AddServicesRequest = z.infer<typeof addServicesSchema>;
export type RemoveServicesRequest = z.infer<typeof removeServicesSchema>;
export type ValidateAppointmentRequest = z.infer<
  typeof validateAppointmentSchema
>;
export type ConflictCheckRequest = z.infer<typeof conflictCheckSchema>;
