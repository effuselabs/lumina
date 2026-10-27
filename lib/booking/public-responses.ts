import { z } from 'zod';

/**
 * What the public booking API may tell an anonymous visitor (#151).
 *
 * Every success response under `app/api/public/booking/` is parsed through
 * one of these before it is sent. Parsing strips any key a schema does not
 * name, so a field added to a query or a service result reaches a stranger
 * only when someone adds it here, in a diff a reviewer sees.
 * `__tests__/security/public-booking-responses.test.ts` pins each schema's
 * keys for the same reason.
 *
 * Dropped when these were written, because nothing on the booking page read
 * them: staff surnames (the salon chooses a display name), the legacy
 * `operatingHours` JSON (opening hours live in `BusinessHours`), and timing
 * and cache diagnostics.
 */

/** Prices arrive as numbers or Prisma Decimals, which serialise as strings. */
const money = z.preprocess(
  value =>
    typeof value === 'object' && value !== null ? String(value) : value,
  z.union([z.number(), z.string()])
);

/** Dates leave as ISO strings either way. */
const instant = z.union([z.date(), z.string()]);

const text = z.string().nullish();

const publicStaffMember = z.object({
  id: z.string(),
  displayName: z.string(),
  title: text,
  bio: text,
  avatar: text,
  customPrice: money.nullish(),
  customDuration: z.number().nullish(),
});

const publicService = z.object({
  id: z.string(),
  name: z.string(),
  description: text,
  category: text,
  price: money,
  duration: z.number(),
  prerequisites: text,
  recommendations: text,
  staffIds: z.array(z.string()),
  availableStaff: z.array(publicStaffMember),
});

export const PublicBusinessResponse = z.object({
  business: z.object({
    id: z.string(),
    name: z.string(),
    email: text,
    phone: text,
    website: text,
    address: text,
    city: text,
    state: text,
    zipCode: text,
    country: text,
    timezone: z.string(),
    requireDeposit: z.boolean(),
    depositAmount: money.nullish(),
    cancellationPolicy: text,
    logo: text,
    primaryColor: text,
  }),
  services: z.array(publicService),
  servicesByCategory: z.record(z.string(), z.array(publicService)),
  bookingConfig: z.object({
    requireDeposit: z.boolean(),
    depositAmount: money.nullish(),
    advanceBookingDays: z.number(),
    minimumNoticeHours: z.number(),
    maxServicesPerBooking: z.number(),
  }),
});

export const PublicStaffResponse = z.object({
  staff: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
      avatar: text,
      specialties: z.array(z.string()),
      isActive: z.boolean(),
    })
  ),
  totalStaff: z.number(),
  serviceIds: z.array(z.string()),
});

const publicSlot = z.object({
  startTime: instant,
  endTime: instant,
  staffId: z.string(),
  staffName: z.string(),
  isAvailable: z.boolean(),
  totalDuration: z.number(),
  totalPrice: money,
  services: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        duration: z.number(),
        price: money,
      })
    )
    .optional(),
});

export const PublicAvailabilityResponse = z.object({
  availableSlots: z.array(publicSlot),
  alternatives: z.array(publicSlot),
  nextAvailableDate: z.string().nullish(),
  requestedDate: z.string(),
  timezone: z.string(),
  totalSlotsFound: z.number(),
});

const optionalText = z.string().optional();

export const PublicBookingCreatedResponse = z.object({
  appointment: z.object({
    id: z.string(),
    confirmationNumber: z.string(),
    dateTime: instant,
    services: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        duration: z.number(),
        price: money,
      })
    ),
    staff: z.object({
      id: z.string(),
      displayName: z.string(),
      title: optionalText,
    }),
    // The client's own details, echoed to the client who just typed them.
    client: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string(),
      phone: z.string(),
    }),
    totalDuration: z.number(),
    totalPrice: money,
    notes: optionalText,
    business: z.object({
      name: z.string(),
      address: optionalText,
      phone: optionalText,
      email: optionalText,
    }),
  }),
  confirmationSent: z.boolean(),
  message: z.string(),
});
