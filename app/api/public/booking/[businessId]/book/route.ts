import { prisma } from '@/lib/prisma';
import { InputSanitizer } from '@/lib/security/rate-limiter';
import { PublicBookingAuditEvent, auditPublicBooking } from '@/lib/security/public-booking-audit';
import { securePublicBookingPOST, createSecurePublicBookingResponse } from '@/lib/security/public-booking-security-middleware';
import { format } from 'date-fns';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { emailService } from '../../../../../../lib/email/email-service';
import { AvailabilityCacheInvalidation } from '../../../../../../lib/services/availability-cache-invalidation';
import { ClientService } from '../../../../../../lib/services/client-service';

// Using dedicated public booking rate limiters

// Validation schemas
const timeSlotSchema = z.object({
  startTime: z.string().datetime('Invalid start time format'),
  endTime: z.string().datetime('Invalid end time format'),
  staffId: z.string().cuid('Invalid staff ID'),
  totalDuration: z.number().min(1).max(480), // Max 8 hours
  totalPrice: z.number().min(0),
});

const clientDataSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
  isNewClient: z.boolean().default(true),
  marketingOptIn: z.boolean().default(false),
});

const bookingRequestSchema = z.object({
  services: z
    .array(z.string().cuid())
    .min(1, 'At least one service is required')
    .max(5),
  timeSlot: timeSlotSchema,
  client: clientDataSchema,
});

// Error types
enum BookingErrorType {
  BUSINESS_NOT_FOUND = 'BUSINESS_NOT_FOUND',
  BUSINESS_INACTIVE = 'BUSINESS_INACTIVE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SLOT_UNAVAILABLE = 'SLOT_UNAVAILABLE',
  BOOKING_CONFLICT = 'BOOKING_CONFLICT',
  SERVICES_UNAVAILABLE = 'SERVICES_UNAVAILABLE',
  STAFF_UNAVAILABLE = 'STAFF_UNAVAILABLE',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

class BookingError extends Error {
  type: BookingErrorType;
  userMessage: string;
  suggestions?: string[];
  alternativeSlots?: any[];

  constructor(
    type: BookingErrorType,
    message: string,
    userMessage: string,
    suggestions?: string[],
    alternativeSlots?: any[]
  ) {
    super(message);
    this.type = type;
    this.userMessage = userMessage;
    this.suggestions = suggestions;
    this.alternativeSlots = alternativeSlots;
    this.name = 'BookingError';
  }
}

interface CreatedAppointment {
  id: string;
  confirmationNumber: string;
  dateTime: Date;
  services: {
    id: string;
    name: string;
    duration: number;
    price: number;
  }[];
  staff: {
    id: string;
    displayName: string;
    title?: string;
  };
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  totalDuration: number;
  totalPrice: number;
  notes?: string;
  business: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

// Generate confirmation number
function generateConfirmationNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}${random}`.toUpperCase();
}

// Business context validation
async function validateBusinessForBooking(businessId: string) {
  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        bookingEnabled: true,
        onlineBooking: true,
        timezone: true,
      },
    });

    if (!business) {
      throw new BookingError(
        BookingErrorType.BUSINESS_NOT_FOUND,
        'Business not found',
        'The business you are trying to book with could not be found.',
        [
          'Please check the booking link and try again',
          'Contact the business directly',
        ]
      );
    }

    if (!business.bookingEnabled || !business.onlineBooking) {
      throw new BookingError(
        BookingErrorType.BUSINESS_INACTIVE,
        'Booking disabled for business',
        'Online booking is currently unavailable for this business.',
        ['Please call the business directly to schedule an appointment']
      );
    }

    return business;
  } catch (error) {
    if (error instanceof BookingError) {
      throw error;
    }

    throw new BookingError(
      BookingErrorType.SYSTEM_ERROR,
      'System error during business validation',
      'We are experiencing technical difficulties. Please try again.',
      ['Try refreshing the page']
    );
  }
}

// Validate services and calculate totals
async function validateServicesAndCalculateTotals(
  businessId: string,
  serviceIds: string[],
  staffId: string,
  expectedDuration: number,
  expectedPrice: number
) {
  const services = await prisma.service.findMany({
    where: {
      id: { in: serviceIds },
      businessId,
      isActive: true,
      isOnline: true,
    },
    include: {
      staff: {
        where: {
          staffId,
          staff: {
            isActive: true,
            acceptsOnlineBookings: true,
          },
        },
        include: {
          staff: {
            select: {
              id: true,
              displayName: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (services.length !== serviceIds.length) {
    throw new BookingError(
      BookingErrorType.SERVICES_UNAVAILABLE,
      'Some services are not available',
      'One or more selected services are no longer available for online booking.',
      ['Please select different services', 'Contact the business directly']
    );
  }

  // Verify staff can perform all services
  const staffCanPerformAll = services.every(service =>
    service.staff.some(s => s.staffId === staffId)
  );

  if (!staffCanPerformAll) {
    throw new BookingError(
      BookingErrorType.STAFF_UNAVAILABLE,
      'Staff member cannot perform all selected services',
      'The selected staff member is not available for all chosen services.',
      ['Please select a different staff member', 'Choose different services']
    );
  }

  // Calculate actual totals
  const actualDuration = services.reduce(
    (sum, service) => sum + service.duration,
    0
  );
  const actualPrice = services.reduce((sum, service) => {
    const staffService = service.staff.find(s => s.staffId === staffId);
    return sum + Number(staffService?.customPrice || service.price);
  }, 0);

  // Verify totals match (allow small floating point differences)
  if (
    Math.abs(actualDuration - expectedDuration) > 1 ||
    Math.abs(actualPrice - expectedPrice) > 0.01
  ) {
    throw new BookingError(
      BookingErrorType.VALIDATION_ERROR,
      'Service totals do not match',
      'The service pricing or duration has changed. Please refresh and try again.',
      ['Refresh the page and reselect your services']
    );
  }

  const staffMember = services[0].staff.find(s => s.staffId === staffId)?.staff;
  if (!staffMember) {
    throw new BookingError(
      BookingErrorType.STAFF_UNAVAILABLE,
      'Staff member not found',
      'The selected staff member is no longer available.',
      ['Please select a different staff member']
    );
  }

  return {
    services: services.map(service => ({
      id: service.id,
      name: service.name,
      duration: service.duration,
      price: Number(
        service.staff.find(s => s.staffId === staffId)?.customPrice ||
        service.price
      ),
    })),
    staff: staffMember,
    actualDuration,
    actualPrice,
  };
}

// Validate time slot availability
async function validateTimeSlotAvailability(
  businessId: string,
  staffId: string,
  startTime: Date,
  endTime: Date,
  serviceIds?: string[]
) {
  // Check for existing appointments that conflict
  const conflictingAppointments = await prisma.appointment.findMany({
    where: {
      businessId,
      staffId,
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
      },
      OR: [
        {
          // Appointment starts during our slot
          startTime: {
            gte: startTime,
            lt: endTime,
          },
        },
        {
          // Appointment ends during our slot
          endTime: {
            gt: startTime,
            lte: endTime,
          },
        },
        {
          // Appointment encompasses our slot
          startTime: {
            lte: startTime,
          },
          endTime: {
            gte: endTime,
          },
        },
      ],
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
    },
  });

  if (conflictingAppointments.length > 0) {
    // Find alternative slots when there's a conflict
    let alternativeSlots: any[] = [];
    try {
      const { AlternativeSlotsService } = await import('../../../../../../lib/services/alternative-slots-service');
      const alternatives = await AlternativeSlotsService.findNearbyAlternatives({
        businessId,
        serviceIds: serviceIds || [],
        originalStartTime: startTime,
        staffId,
        maxAlternatives: 6,
        timeWindowHours: 4,
      });
      alternativeSlots = alternatives;
    } catch (altError) {
      console.error('Failed to fetch alternative slots:', altError);
    }

    throw new BookingError(
      BookingErrorType.BOOKING_CONFLICT,
      'Time slot is no longer available',
      'The selected time slot has been booked by another client.',
      [
        'Please select a different time slot',
        'Refresh the page to see updated availability',
      ],
      alternativeSlots
    );
  }

  // Validate the time slot is not in the past
  const now = new Date();
  if (startTime <= now) {
    throw new BookingError(
      BookingErrorType.SLOT_UNAVAILABLE,
      'Cannot book appointments in the past',
      'The selected time slot is in the past.',
      ['Please select a future time slot']
    );
  }

  // Validate minimum notice (e.g., 2 hours)
  const minimumNoticeMs = 2 * 60 * 60 * 1000; // 2 hours
  if (startTime.getTime() - now.getTime() < minimumNoticeMs) {
    throw new BookingError(
      BookingErrorType.SLOT_UNAVAILABLE,
      'Insufficient notice for booking',
      'Appointments must be booked at least 2 hours in advance.',
      [
        'Please select a time slot at least 2 hours from now',
        'Call the business for same-day appointments',
      ]
    );
  }
}

// Create or find client using ClientService
async function createOrFindClient(
  businessId: string,
  clientData: z.infer<typeof clientDataSchema>
) {
  // Sanitize client data
  const sanitizedData = {
    firstName: InputSanitizer.sanitizeString(clientData.firstName),
    lastName: InputSanitizer.sanitizeString(clientData.lastName),
    email: clientData.email.toLowerCase().trim(),
    phone: clientData.phone,
    notes: clientData.notes
      ? InputSanitizer.sanitizeNotes(clientData.notes)
      : undefined,
    marketingOptIn: clientData.marketingOptIn,
  };

  // Use ClientService to create or update client
  return await ClientService.createClient({
    businessId,
    firstName: sanitizedData.firstName,
    lastName: sanitizedData.lastName,
    email: sanitizedData.email,
    phone: sanitizedData.phone,
    notes: sanitizedData.notes,
    marketingOptIn: sanitizedData.marketingOptIn,
    source: 'public_booking',
  });
}

// Create appointment with services
async function createAppointmentWithServices(
  businessId: string,
  clientId: string,
  staffId: string,
  startTime: Date,
  endTime: Date,
  services: any[],
  totalDuration: number,
  totalPrice: number,
  notes?: string
) {
  const confirmationNumber = generateConfirmationNumber();

  // Create appointment in a transaction
  return await prisma.$transaction(async tx => {
    // Create the appointment
    const appointment = await tx.appointment.create({
      data: {
        businessId,
        clientId,
        staffId,
        startTime,
        endTime,
        status: 'SCHEDULED',
        totalDuration,
        totalPrice,
        notes,
        // Add confirmation number as internal note for now
        internalNotes: `Confirmation: ${confirmationNumber}`,
      },
    });

    // Create appointment services
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      await tx.appointmentService.create({
        data: {
          appointmentId: appointment.id,
          serviceId: service.id,
          serviceName: service.name,
          assignedStaffId: staffId,
          price: service.price,
          duration: service.duration,
          serviceOrder: i + 1,
          startOffset:
            i === 0
              ? 0
              : services.slice(0, i).reduce((sum, s) => sum + s.duration, 0),
        },
      });
    }

    return { ...appointment, confirmationNumber };
  });
}

// Send staff notification for new booking
async function sendStaffNotification({
  businessId,
  staffId,
  appointment,
  business,
}: {
  businessId: string;
  staffId: string;
  appointment: CreatedAppointment;
  business: any;
}) {
  try {
    // Create a staff notification record in the database
    await prisma.staffNotification.create({
      data: {
        businessId,
        staffId,
        type: 'NEW_BOOKING',
        title: 'New Appointment Booked',
        message: `New appointment scheduled with ${appointment.client.firstName} ${appointment.client.lastName} for ${appointment.services.map(s => s.name).join(', ')} on ${format(appointment.dateTime, 'EEEE, MMMM d, yyyy')} at ${format(appointment.dateTime, 'h:mm a')}.`,
        metadata: {
          appointmentId: appointment.id,
          confirmationNumber: appointment.confirmationNumber,
          clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
          services: appointment.services.map(s => s.name),
          dateTime: appointment.dateTime.toISOString(),
          totalPrice: appointment.totalPrice,
        },
        isRead: false,
        priority: 'NORMAL',
      },
    });

    // TODO: In future iterations, add real-time notifications via WebSocket or push notifications
    console.log(`Staff notification sent to ${staffId} for appointment ${appointment.id}`);
  } catch (error) {
    console.error('Error creating staff notification:', error);
    throw error;
  }
}

// POST /api/public/booking/[businessId]/book
export async function POST(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  const requestStartTime: number = Date.now();
  let validatedData: any = null;

  try {
    // Apply comprehensive security validation
    const securityResult = await securePublicBookingPOST(
      request,
      params.businessId,
      {
        rateLimiter: 'bookingCreation',
        auditEvent: PublicBookingAuditEvent.BOOKING_INITIATED,
      }
    );

    if (!securityResult.success) {
      return securityResult.response!;
    }

    // Use sanitized data from security middleware
    validatedData = securityResult.sanitizedData || bookingRequestSchema.parse(await request.json());

    // Validate business context (already done in security middleware, but get business data)
    const business = await validateBusinessForBooking(params.businessId);

    // Parse time slot dates
    const startTime = new Date(validatedData.timeSlot.startTime);
    const endTime = new Date(validatedData.timeSlot.endTime);

    // Validate time slot availability
    await validateTimeSlotAvailability(
      params.businessId,
      validatedData.timeSlot.staffId,
      startTime,
      endTime,
      validatedData.services
    );

    // Validate services and calculate totals
    const { services, staff, actualDuration, actualPrice } =
      await validateServicesAndCalculateTotals(
        params.businessId,
        validatedData.services,
        validatedData.timeSlot.staffId,
        validatedData.timeSlot.totalDuration,
        validatedData.timeSlot.totalPrice
      );

    // Create or find client
    const client = await createOrFindClient(
      params.businessId,
      validatedData.client
    );

    // Create appointment
    const appointment = await createAppointmentWithServices(
      params.businessId,
      client.id,
      validatedData.timeSlot.staffId,
      startTime,
      endTime,
      services,
      actualDuration,
      actualPrice,
      validatedData.client.notes
    );

    // Invalidate availability cache for real-time updates
    try {
      await AvailabilityCacheInvalidation.handleAppointmentEvent({
        type: 'appointment_created',
        businessId: params.businessId,
        staffId: validatedData.timeSlot.staffId,
        clientId: client.id,
        appointmentId: appointment.id,
        affectedDate: startTime,
        metadata: {
          newStartTime: startTime,
          newEndTime: endTime,
          serviceIds: services.map(s => s.id),
        },
      });
    } catch (cacheError) {
      console.error(
        'Cache invalidation failed after appointment creation:',
        cacheError
      );
      // Don't fail the booking if cache invalidation fails
    }

    // Prepare response
    const createdAppointment: CreatedAppointment = {
      id: appointment.id,
      confirmationNumber: appointment.confirmationNumber,
      dateTime: appointment.startTime,
      services,
      staff: {
        id: staff.id,
        displayName: staff.displayName,
        title: staff.title || undefined,
      },
      client: {
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email || '',
        phone: client.phone || '',
      },
      totalDuration: actualDuration,
      totalPrice: actualPrice,
      notes: validatedData.client.notes,
      business: {
        name: business.name,
        address: business.address || undefined,
        phone: business.phone || undefined,
        email: business.email || undefined,
      },
    };

    // Send confirmation email
    let confirmationSent = false;
    try {
      const emailResult = await emailService.sendBookingConfirmation({
        customerName: `${client.firstName} ${client.lastName}`,
        customerEmail: client.email || '',
        businessName: business.name,
        serviceName: services.map(s => s.name).join(', '),
        staffName: staff.displayName,
        appointmentDate: format(appointment.startTime, 'EEEE, MMMM d, yyyy'),
        appointmentTime: format(appointment.startTime, 'h:mm a'),
        duration: actualDuration,
        price: actualPrice,
        businessAddress: business.address || undefined,
        businessPhone: business.phone || undefined,
        businessEmail: business.email || undefined,
        appointmentId: appointment.confirmationNumber,
        notes: validatedData.client.notes,
      });

      confirmationSent = emailResult.success;

      if (emailResult.previewUrl) {
        console.log('Email preview URL:', emailResult.previewUrl);
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the booking if email fails
    }

    // Send staff notification
    try {
      await sendStaffNotification({
        businessId: params.businessId,
        staffId: validatedData.timeSlot.staffId,
        appointment: createdAppointment,
        business,
      });
    } catch (notificationError) {
      console.error('Failed to send staff notification:', notificationError);
      // Don't fail the booking if notification fails
    }

    // Log successful booking
    const responseTime = Date.now() - requestStartTime;
    await auditPublicBooking.bookingCompleted(
      params.businessId,
      request,
      {
        appointmentId: appointment.id,
        clientId: client.id,
        serviceIds: validatedData.services,
        staffId: validatedData.timeSlot.staffId,
        totalAmount: actualPrice,
        isNewClient: validatedData.client.isNewClient,
      },
      responseTime
    );

    return createSecurePublicBookingResponse(
      {
        appointment: createdAppointment,
        confirmationSent,
        message: 'Appointment booked successfully!',
      },
      request,
      {
        status: 201,
        addCSRFToken: true,
      }
    );
  } catch (error) {
    console.error('Error in booking creation endpoint:', error);

    // Log booking failure
    const responseTime = Date.now() - requestStartTime;
    await auditPublicBooking.bookingFailed(
      params.businessId,
      request,
      {
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        serviceIds: validatedData?.services,
        staffId: validatedData?.timeSlot?.staffId,
        clientData: validatedData?.client ? 'present' : 'missing',
      },
      error instanceof Error ? error : undefined,
      responseTime
    );

    if (error instanceof BookingError) {
      return createSecurePublicBookingResponse(
        { error },
        request,
        {
          status: error.type === BookingErrorType.BUSINESS_NOT_FOUND ? 404 : 400,
        }
      );
    }

    if (error instanceof z.ZodError) {
      return createSecurePublicBookingResponse(
        {
          error: {
            type: BookingErrorType.VALIDATION_ERROR,
            message: 'Invalid booking data',
            userMessage: 'Please check your booking information and try again.',
            suggestions: [
              'Verify all required fields are filled',
              'Refresh the page and try again',
            ],
            details: error.errors,
          },
        },
        request,
        {
          status: 400,
        }
      );
    }

    return createSecurePublicBookingResponse(
      {
        error: {
          type: BookingErrorType.SYSTEM_ERROR,
          message: 'Internal server error',
          userMessage:
            'We are experiencing technical difficulties. Please try again.',
          suggestions: [
            'Try refreshing the page',
            'Contact the business directly if the problem persists',
          ],
        },
      },
      request,
      {
        status: 500,
      }
    );
  }
}
