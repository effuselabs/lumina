/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from 'react-dom/server';
import BookingConfirmationEmail from '@/lib/email/templates/booking-confirmation-email';
import { appointmentWhen } from '@/lib/email/appointment-time';

const base = {
  customerName: 'Ada Client',
  businessName: 'Sunset Salon',
  serviceName: 'Cut',
  staffName: 'Sam',
  appointmentDate: 'Wednesday, October 21, 2026',
  appointmentTime: '2:00 PM – 3:00 PM PDT',
  duration: 60,
  price: 45,
  appointmentId: 'appointment-1',
};

/**
 * The email's words, as a reader sees them. `@react-email/render` loads
 * react-dom through a dynamic import that Jest cannot run, so render with
 * react-dom directly and drop the markup.
 */
const text = (props: Parameters<typeof BookingConfirmationEmail>[0]) =>
  renderToStaticMarkup(BookingConfirmationEmail(props))
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ');

describe('appointment email', () => {
  it('says a moved appointment moved, and where from', async () => {
    const body = text({
      ...base,
      notice: {
        kind: 'moved',
        previous: {
          appointmentDate: 'Tuesday, October 20, 2026',
          appointmentTime: '10:00 AM – 11:00 AM PDT',
        },
      },
    });

    expect(body).toMatch(/Appointment Moved/i);
    expect(body).not.toMatch(/Confirmed/i);
    expect(body).toContain(
      'Tuesday, October 20, 2026, 10:00 AM – 11:00 AM PDT'
    );
    expect(body).toContain('2:00 PM – 3:00 PM PDT');
  });

  it('says a cancelled appointment is cancelled, without arrival advice', async () => {
    const body = text({ ...base, notice: { kind: 'cancelled' } });

    expect(body).toMatch(/Appointment Cancelled/i);
    expect(body).not.toMatch(/Confirmed/i);
    expect(body).not.toMatch(/arrive 5-10 minutes early/);
  });

  it('is a confirmation by default', async () => {
    expect(text(base)).toMatch(/Appointment Confirmed/i);
  });
});

describe('appointmentWhen', () => {
  const slot = {
    startTime: new Date('2026-10-21T21:00:00Z'),
    endTime: new Date('2026-10-21T22:00:00Z'),
  };

  it('formats in the salon zone, not the server zone', () => {
    expect(appointmentWhen(slot, 'America/Los_Angeles')).toEqual({
      appointmentDate: 'Wednesday, October 21, 2026',
      appointmentTime: '2:00 PM – 3:00 PM PDT',
    });
  });

  it('can land on a different calendar day from UTC', () => {
    expect(appointmentWhen(slot, 'Australia/Sydney').appointmentDate).toBe(
      'Thursday, October 22, 2026'
    );
  });
});
