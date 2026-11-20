import { Prisma } from '@prisma/client';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';
import { z } from 'zod';
import {
  PublicAvailabilityResponse,
  PublicBookingCreatedResponse,
  PublicBusinessResponse,
  PublicStaffResponse,
} from '@/lib/booking/public-responses';

/**
 * The public booking API answers anonymous visitors, so what it returns is an
 * allow-list (#151). These tests pin every field each response may carry: a
 * new one fails here until someone adds it on purpose, in a diff a reviewer
 * sees. They also check every public route sends its success through a
 * schema, and that a schema strips what it does not name.
 */

/** Every field path a schema allows, e.g. `staff[].displayName`. */
function fieldsOf(schema: z.ZodType, prefix = ''): string[] {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return fieldsOf(schema.unwrap() as z.ZodType, prefix);
  }
  if (schema instanceof z.ZodArray) {
    return fieldsOf(schema.element as z.ZodType, `${prefix}[]`);
  }
  if (schema instanceof z.ZodRecord) {
    return fieldsOf(schema.valueType as z.ZodType, `${prefix}{}`);
  }
  if (schema instanceof z.ZodObject) {
    return Object.entries(schema.shape as Record<string, z.ZodType>).flatMap(
      ([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        const nested = fieldsOf(value, path);
        return nested.length > 0 ? nested : [path];
      }
    );
  }
  return [];
}

const STAFF_MEMBER = [
  'id',
  'displayName',
  'title',
  'bio',
  'avatar',
  'customPrice',
  'customDuration',
];
const SERVICE = [
  'id',
  'name',
  'description',
  'category',
  'price',
  'duration',
  'prerequisites',
  'recommendations',
  'staffIds',
  ...STAFF_MEMBER.map(field => `availableStaff[].${field}`),
];
const SLOT = [
  'startTime',
  'endTime',
  'staffId',
  'staffName',
  'isAvailable',
  'totalDuration',
  'totalPrice',
  'services[].id',
  'services[].name',
  'services[].duration',
  'services[].price',
];

describe('public booking responses carry only allow-listed fields', () => {
  it('business and services', () => {
    expect(fieldsOf(PublicBusinessResponse)).toEqual([
      ...[
        'id',
        'name',
        'email',
        'phone',
        'website',
        'address',
        'city',
        'state',
        'zipCode',
        'country',
        'timezone',
        'requireDeposit',
        'depositAmount',
        'cancellationPolicy',
        'logo',
        'primaryColor',
      ].map(field => `business.${field}`),
      ...SERVICE.map(field => `services[].${field}`),
      ...SERVICE.map(field => `servicesByCategory{}[].${field}`),
      'bookingConfig.requireDeposit',
      'bookingConfig.depositAmount',
      'bookingConfig.advanceBookingDays',
      'bookingConfig.minimumNoticeHours',
      'bookingConfig.maxServicesPerBooking',
    ]);
  });

  it('staff: display names only, never surnames', () => {
    expect(fieldsOf(PublicStaffResponse)).toEqual([
      'staff[].id',
      'staff[].displayName',
      'staff[].avatar',
      'staff[].specialties',
      'staff[].isActive',
      'totalStaff',
      'serviceIds',
    ]);
  });

  it('availability: times, without diagnostics', () => {
    expect(fieldsOf(PublicAvailabilityResponse)).toEqual([
      ...SLOT.map(field => `availableSlots[].${field}`),
      ...SLOT.map(field => `alternatives[].${field}`),
      'nextAvailableDate',
      'requestedDate',
      'timezone',
      'totalSlotsFound',
    ]);
  });

  it('a new booking', () => {
    expect(fieldsOf(PublicBookingCreatedResponse)).toEqual([
      'appointment.id',
      'appointment.confirmationNumber',
      'appointment.dateTime',
      'appointment.services[].id',
      'appointment.services[].name',
      'appointment.services[].duration',
      'appointment.services[].price',
      'appointment.staff.id',
      'appointment.staff.displayName',
      'appointment.staff.title',
      'appointment.client.firstName',
      'appointment.client.lastName',
      'appointment.client.email',
      'appointment.client.phone',
      'appointment.totalDuration',
      'appointment.totalPrice',
      'appointment.notes',
      'appointment.business.name',
      'appointment.business.address',
      'appointment.business.phone',
      'appointment.business.email',
      'confirmationSent',
      'message',
    ]);
  });
});

describe('a schema', () => {
  it('strips a field it does not name', () => {
    const sent = PublicStaffResponse.parse({
      staff: [
        {
          id: 's1',
          displayName: 'Sam',
          lastName: 'Okafor',
          email: 'sam@salon.test',
          avatar: null,
          specialties: [],
          isActive: true,
        },
      ],
      totalStaff: 1,
      serviceIds: [],
      metadata: { businessId: 'b1' },
    });

    expect(sent).toEqual({
      staff: [
        {
          id: 's1',
          displayName: 'Sam',
          avatar: null,
          specialties: [],
          isActive: true,
        },
      ],
      totalStaff: 1,
      serviceIds: [],
    });
  });

  it('sends a Prisma Decimal as the string JSON would', () => {
    const sent = PublicAvailabilityResponse.parse({
      availableSlots: [
        {
          startTime: new Date('2026-10-29T17:30:00Z'),
          endTime: new Date('2026-10-29T18:30:00Z'),
          staffId: 's1',
          staffName: 'Sam',
          isAvailable: true,
          totalDuration: 60,
          totalPrice: new Prisma.Decimal('85.5'),
        },
      ],
      alternatives: [],
      requestedDate: '2026-10-29',
      timezone: 'America/Los_Angeles',
      totalSlotsFound: 1,
    });

    expect(JSON.parse(JSON.stringify(sent)).availableSlots[0].totalPrice).toBe(
      '85.5'
    );
  });
});

describe('every public booking route', () => {
  const root = join(process.cwd(), 'app/api/public');
  const routes = (function walk(dir: string): string[] {
    return readdirSync(dir).flatMap(name => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return walk(path);
      return name === 'route.ts' ? [path] : [];
    });
  })(root);

  // Answers `{ issued: true }` and sets a cookie; it carries no data to list.
  const NO_DATA = [`booking${sep}[businessId]${sep}csrf-token${sep}route.ts`];

  it('is found (so the next test cannot pass vacuously)', () => {
    expect(routes.length).toBeGreaterThanOrEqual(5);
  });

  it.each(
    routes
      .map(path => relative(root, path))
      .filter(path => !NO_DATA.includes(path))
  )('%s sends its success through a response schema', path => {
    const source = readFileSync(join(root, path), 'utf8');
    expect(source).toMatch(/Public\w+Response\.parse\(/);
  });
});
