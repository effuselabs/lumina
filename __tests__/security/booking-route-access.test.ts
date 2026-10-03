/**
 * `NextResponse` extends the Web `Response`, which jsdom does not provide.
 *
 * @jest-environment node
 */
import { DELETE, GET, PUT } from '@/app/api/booking/[id]/route';
import { prisma } from '@/lib/prisma';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';
import { NextRequest } from 'next/server';

/**
 * `/api/booking/[id]` takes an appointment id, and checked only that the
 * caller was signed in — never that they belonged to the appointment's
 * business. Any user of any salon could read, reschedule or cancel any other
 * salon's appointment.
 */

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/email-service', () => ({
  emailService: { sendBookingConfirmation: jest.fn() },
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    businessUser: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { auth } = require('@/auth');

const APPOINTMENT = 'clappointmentaaaaaaaaaaaa';
const SALON_A = 'clsalonaaaaaaaaaaaaaaaaaa';
const params = { params: Promise.resolve({ id: APPOINTMENT }) };
const url = `http://localhost/api/booking/${APPOINTMENT}`;

describe('/api/booking/[id] tenant access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(prisma.appointment.findUnique).mockResolvedValue({
      businessId: SALON_A,
    });
    // Signed in, but a member of some other salon.
    asMock(auth).mockResolvedValue({ user: { id: 'user-from-salon-b' } });
    asMock(prisma.businessUser.findUnique).mockResolvedValue(null);
  });

  it('answers another salon with the same 404 as a missing id', async () => {
    const responses = [
      await GET(new NextRequest(url), params),
      await PUT(
        new NextRequest(url, {
          method: 'PUT',
          body: JSON.stringify({ notes: 'moved by a stranger' }),
        }),
        params
      ),
      await DELETE(new NextRequest(url, { method: 'DELETE' }), params),
    ];

    expect(responses.map(response => response.status)).toEqual([404, 404, 404]);
    expect(prisma.appointment.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.businessUser.findUnique).toHaveBeenCalledWith({
      where: {
        businessId_userId: { businessId: SALON_A, userId: 'user-from-salon-b' },
      },
      select: { role: true },
    });
  });

  it('answers a missing appointment with 404 before checking membership', async () => {
    asMock(prisma.appointment.findUnique).mockResolvedValue(null);

    const response = await GET(new NextRequest(url), params);

    expect(response.status).toBe(404);
    expect(prisma.businessUser.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an anonymous caller with 401', async () => {
    asMock(auth).mockResolvedValue(null);

    const response = await GET(new NextRequest(url), params);

    expect(response.status).toBe(401);
  });

  it('rejects a move that changes only one end of the slot', async () => {
    asMock(prisma.businessUser.findUnique).mockResolvedValue({
      role: 'OWNER',
    });

    const response = await PUT(
      new NextRequest(url, {
        method: 'PUT',
        body: JSON.stringify({ startTime: '2026-11-02T14:00:00.000Z' }),
      }),
      params
    );

    expect(response.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
