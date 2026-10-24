/**
 * @jest-environment node
 */
import { ClientService } from '@/lib/services/client-service';
import { prisma } from '@/lib/prisma';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * The public booking page is used by strangers, so what it accepts can only
 * ever add to a salon's records, never change them.
 *
 * A booking made with an existing client's email or phone number overwrote
 * that client's saved name, marketing consent and notes; and a lookup told
 * anyone who typed a phone number or email whether that person was a client.
 * Now a booking attaches to an existing client without touching the record —
 * the details as typed are kept on the appointment for staff — and the lookup
 * is gone.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));

const SALON = 'clsalonaaaaaaaaaaaaaaaaaa';
const BOOKING = {
  businessId: SALON,
  firstName: 'Someone',
  lastName: 'Else',
  email: 'ADA@example.com ',
  phone: '(555) 010-0000',
  notes: 'Please call me',
  marketingOptIn: true,
};
const SAVED = {
  id: 'client-1',
  businessId: SALON,
  firstName: 'Ada',
  lastName: 'Client',
  email: 'ada@example.com',
  phone: '+15550100000',
  notes: 'Prefers a quiet chair',
  emailMarketing: false,
  smsMarketing: false,
};

describe('ClientService.findOrCreateForBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(prisma.client.findUnique).mockResolvedValue(null);
    asMock(prisma.client.create).mockImplementation(async ({ data }) => ({
      id: 'client-new',
      ...data,
    }));
  });

  it('attaches to a client matched by email without changing their record', async () => {
    asMock(prisma.client.findUnique).mockImplementation(async ({ where }) =>
      where.businessId_email ? SAVED : null
    );

    const result = await ClientService.findOrCreateForBooking(BOOKING);

    expect(result).toEqual({ client: SAVED, created: false });
    expect(prisma.client.update).not.toHaveBeenCalled();
    expect(prisma.client.create).not.toHaveBeenCalled();
  });

  it('attaches to a client matched by phone without changing their record', async () => {
    asMock(prisma.client.findUnique).mockImplementation(async ({ where }) =>
      where.businessId_phone ? SAVED : null
    );

    const result = await ClientService.findOrCreateForBooking(BOOKING);

    expect(result.created).toBe(false);
    expect(prisma.client.update).not.toHaveBeenCalled();
  });

  it('creates a new client from what was typed when nobody matches', async () => {
    const result = await ClientService.findOrCreateForBooking(BOOKING);

    expect(result.created).toBe(true);
    expect(prisma.client.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: SALON,
        firstName: 'Someone',
        lastName: 'Else',
        email: 'ada@example.com',
        phone: '+15550100000',
        emailMarketing: true,
        smsMarketing: true,
      }),
    });
  });
});

describe('the public booking page says nothing about who is a client', () => {
  it('has no client lookup route', () => {
    expect(
      existsSync(
        join(
          process.cwd(),
          'app/api/public/booking/[businessId]/client-lookup/route.ts'
        )
      )
    ).toBe(false);
  });

  it('never asks whether someone is a client while they type', () => {
    const form = readFileSync(
      join(process.cwd(), 'components/booking/client-information-form.tsx'),
      'utf8'
    );

    expect(form).not.toMatch(/client-lookup/);
    expect(form).not.toMatch(/welcome back|recognise you/i);
  });
});
