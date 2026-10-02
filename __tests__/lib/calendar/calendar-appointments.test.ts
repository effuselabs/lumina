import {
  toDashboardAppointment,
  visibleWindow,
} from '@/lib/calendar/calendar-appointments';

/**
 * The dashboard calendar rendered a hardcoded empty list and invented
 * opening hours, so no appointment ever reached it — including the booking
 * the milestone's definition of done says must land there.
 */

const apiAppointment = {
  id: 'apt1',
  businessId: 'biz1',
  clientId: 'cli1',
  staffId: 'stf1',
  startTime: '2026-10-05T08:30:00.000Z',
  endTime: '2026-10-05T09:15:00.000Z',
  status: 'CONFIRMED',
  totalDuration: 45,
  totalPrice: '35',
  notes: null,
  updatedAt: '2026-10-02T00:35:18.654Z',
  clientName: null,
  clientEmail: null,
  clientPhone: null,
  client: {
    id: 'cli1',
    firstName: 'Ray',
    lastName: 'Reinger',
    email: 'ray@example.com',
    phone: '(680) 894-7382',
  },
  staff: {
    id: 'stf1',
    firstName: 'Trevor',
    lastName: 'Schmidt',
    displayName: 'Trevor Schmidt',
  },
  services: [
    {
      serviceId: 'svc1',
      serviceName: 'Blowout',
      price: '35',
      duration: 45,
    },
  ],
};

describe('toDashboardAppointment', () => {
  it('maps the API shape, turning instants into Dates and decimals into numbers', () => {
    const mapped = toDashboardAppointment(apiAppointment, '#FF7A5A');
    expect(mapped.startTime).toEqual(new Date('2026-10-05T08:30:00.000Z'));
    expect(mapped.endTime).toEqual(new Date('2026-10-05T09:15:00.000Z'));
    expect(mapped.totalPrice).toBe(35);
    expect(mapped.services).toEqual([
      { id: 'svc1', name: 'Blowout', duration: 45, price: 35 },
    ]);
    expect(mapped.client).toMatchObject({
      firstName: 'Ray',
      lastName: 'Reinger',
    });
    expect(mapped.staff).toMatchObject({
      displayName: 'Trevor Schmidt',
      color: '#FF7A5A',
    });
    expect(mapped.canReschedule).toBe(true);
  });

  it('falls back to the booking contact when the client row is missing', () => {
    const mapped = toDashboardAppointment(
      {
        ...apiAppointment,
        client: null,
        clientName: 'Walk In',
        clientEmail: 'walk@example.com',
        clientPhone: null,
      },
      '#FF7A5A'
    );
    expect(mapped.client).toMatchObject({
      firstName: 'Walk In',
      lastName: '',
      email: 'walk@example.com',
      phone: '',
    });
  });

  it('cannot be changed once finished or cancelled', () => {
    for (const status of ['COMPLETED', 'CANCELLED', 'NO_SHOW']) {
      const mapped = toDashboardAppointment(
        { ...apiAppointment, status },
        '#FF7A5A'
      );
      expect([mapped.canEdit, mapped.canCancel, mapped.canReschedule]).toEqual([
        false,
        false,
        false,
      ]);
    }
  });

  it('rejects a response that is not an appointment', () => {
    expect(() => toDashboardAppointment({ id: 'apt1' }, '#FF7A5A')).toThrow();
  });
});

describe('visibleWindow', () => {
  // Thursday 1 October 2026, mid-afternoon local time.
  const thursday = new Date(2026, 9, 1, 15, 0);

  it('is the day for day view', () => {
    expect(visibleWindow('day', thursday)).toEqual({
      start: new Date(2026, 9, 1),
      end: new Date(2026, 9, 2),
    });
  });

  it('is Sunday to Sunday for week view', () => {
    expect(visibleWindow('week', thursday)).toEqual({
      start: new Date(2026, 8, 27),
      end: new Date(2026, 9, 4),
    });
  });

  it('is the six-week grid for month view', () => {
    expect(visibleWindow('month', thursday)).toEqual({
      start: new Date(2026, 8, 27),
      end: new Date(2026, 10, 8),
    });
  });
});
