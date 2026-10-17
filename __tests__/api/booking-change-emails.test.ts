/**
 * `NextResponse` extends the Web `Response`, which jsdom does not provide.
 *
 * @jest-environment node
 */
import { DELETE, PUT } from '@/app/api/booking/[id]/route';
import { emailService } from '@/lib/email/email-service';
import { prisma } from '@/lib/prisma';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';
import { NextRequest } from 'next/server';

/**
 * Moving or cancelling an appointment emailed the client the booking
 * confirmation — "Appointment Confirmed!" for a cancellation — with the time
 * formatted in the server's zone. Railway runs in UTC, so a Los Angeles client
 * moved to 2 PM was told 9 PM. Cancelling through DELETE sent nothing at all.
 */

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/email-service', () => ({
  emailService: {
    sendBookingConfirmation: jest.fn(),
    sendAppointmentMoved: jest.fn(),
    sendAppointmentCancelled: jest.fn(),
  },
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn((run: (tx: unknown) => unknown) =>
      run(jest.requireMock('@/lib/prisma').prisma)
    ),
    $executeRaw: jest.fn(),
    appointment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    businessUser: { findUnique: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { auth } = require('@/auth');

const APPOINTMENT = 'clappointmentaaaaaaaaaaaa';
const SALON = 'clsalonaaaaaaaaaaaaaaaaaa';
const params = { params: Promise.resolve({ id: APPOINTMENT }) };
const url = `http://localhost/api/booking/${APPOINTMENT}`;

// 10:00–11:00 in Los Angeles (PDT, UTC−7), moved to 14:00–15:00.
const WAS = {
  startTime: new Date('2026-10-20T17:00:00Z'),
  endTime: new Date('2026-10-20T18:00:00Z'),
};
const NOW = {
  startTime: new Date('2026-10-21T21:00:00Z'),
  endTime: new Date('2026-10-21T22:00:00Z'),
};

const row = (times: { startTime: Date; endTime: Date }, status: string) => ({
  id: APPOINTMENT,
  ...times,
  status,
  notes: null,
  staffId: 'staff-1',
  client: { firstName: 'Ada', lastName: 'Client', email: 'ada@example.com' },
  staff: { displayName: 'Sam', user: { name: 'Sam Stylist' } },
  services: [{ serviceName: 'Cut', duration: 60, price: 45 }],
  business: {
    name: 'Sunset Salon',
    email: 'hello@sunset.example',
    phone: null,
    address: null,
    timezone: 'America/Los_Angeles',
  },
});

const put = (body: object) =>
  PUT(
    new NextRequest(url, { method: 'PUT', body: JSON.stringify(body) }),
    params
  );

describe('/api/booking/[id] change emails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(prisma.appointment.findUnique).mockResolvedValue({
      businessId: SALON,
    });
    asMock(auth).mockResolvedValue({ user: { id: 'owner' } });
    asMock(prisma.businessUser.findUnique).mockResolvedValue({ role: 'OWNER' });
    for (const send of [
      emailService.sendAppointmentMoved,
      emailService.sendAppointmentCancelled,
    ]) {
      asMock(send).mockResolvedValue({ success: true });
    }
  });

  it('tells the client where the appointment moved from and to, in salon time', async () => {
    asMock(prisma.appointment.findFirst)
      .mockResolvedValueOnce({
        ...WAS,
        staffId: 'staff-1',
        status: 'SCHEDULED',
      })
      .mockResolvedValueOnce(null);
    asMock(prisma.appointment.update).mockResolvedValue(row(NOW, 'SCHEDULED'));

    const response = await put({
      startTime: NOW.startTime.toISOString(),
      endTime: NOW.endTime.toISOString(),
    });

    expect(response.status).toBe(200);
    expect(emailService.sendBookingConfirmation).not.toHaveBeenCalled();
    expect(emailService.sendAppointmentMoved).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: 'ada@example.com',
        appointmentDate: 'Wednesday, October 21, 2026',
        appointmentTime: '2:00 PM – 3:00 PM PDT',
      }),
      {
        appointmentDate: 'Tuesday, October 20, 2026',
        appointmentTime: '10:00 AM – 11:00 AM PDT',
      }
    );
  });

  it('sends a cancellation, not a confirmation, when PUT cancels', async () => {
    asMock(prisma.appointment.findFirst).mockResolvedValueOnce({
      ...WAS,
      staffId: 'staff-1',
      status: 'SCHEDULED',
    });
    asMock(prisma.appointment.update).mockResolvedValue(row(WAS, 'CANCELLED'));

    await put({ status: 'CANCELLED' });

    expect(emailService.sendBookingConfirmation).not.toHaveBeenCalled();
    expect(emailService.sendAppointmentCancelled).toHaveBeenCalledWith(
      expect.objectContaining({ appointmentTime: '10:00 AM – 11:00 AM PDT' })
    );
  });

  it('sends nothing for a notes-only change', async () => {
    asMock(prisma.appointment.findFirst).mockResolvedValueOnce({
      ...WAS,
      staffId: 'staff-1',
      status: 'SCHEDULED',
    });
    asMock(prisma.appointment.update).mockResolvedValue(row(WAS, 'SCHEDULED'));

    await put({ notes: 'Prefers a quiet chair' });

    expect(emailService.sendAppointmentMoved).not.toHaveBeenCalled();
    expect(emailService.sendAppointmentCancelled).not.toHaveBeenCalled();
    expect(emailService.sendBookingConfirmation).not.toHaveBeenCalled();
  });

  it('emails the client when DELETE cancels', async () => {
    asMock(prisma.appointment.findFirst).mockResolvedValueOnce(
      row(WAS, 'SCHEDULED')
    );
    asMock(prisma.appointment.update).mockResolvedValue(row(WAS, 'CANCELLED'));

    const response = await DELETE(
      new NextRequest(url, { method: 'DELETE' }),
      params
    );

    expect(response.status).toBe(200);
    expect(emailService.sendAppointmentCancelled).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: 'ada@example.com',
        appointmentDate: 'Tuesday, October 20, 2026',
        appointmentTime: '10:00 AM – 11:00 AM PDT',
      })
    );
  });

  it('does not email again when DELETE cancels a cancelled appointment', async () => {
    asMock(prisma.appointment.findFirst).mockResolvedValueOnce(
      row(WAS, 'CANCELLED')
    );
    asMock(prisma.appointment.update).mockResolvedValue(row(WAS, 'CANCELLED'));

    await DELETE(new NextRequest(url, { method: 'DELETE' }), params);

    expect(emailService.sendAppointmentCancelled).not.toHaveBeenCalled();
  });
});
