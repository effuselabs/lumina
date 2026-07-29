import { ClientService } from '@/lib/services/client-service';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    client: {
      findFirst: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('@/lib/prisma') as {
  prisma: { client: { findFirst: jest.Mock } };
};

/**
 * `POST /api/public/booking/[businessId]/client-lookup` is unauthenticated —
 * it has to be, it serves the public booking page. So whatever
 * `ClientService.lookupClient` returns is returned to anyone on the internet
 * who can guess an email address or a phone number.
 *
 * It used to return the matched client's first name, last name, email and
 * phone. That turned the booking page into a lookup service for the salon's
 * client list: type a phone number, learn who it belongs to and what their
 * email address is. It also silently overwrote whatever the person at the
 * keyboard had typed, so two people sharing a phone number — a household, a
 * couple — booked as each other, and the confirmation email went to the wrong
 * one.
 */
describe('public booking client lookup', () => {
  const existingClient = {
    id: 'client-1',
    firstName: 'Priya',
    lastName: 'Raman',
    email: 'priya.raman@gmail.com',
    phone: '+15551234567',
    emailMarketing: true,
  };

  beforeEach(() => {
    prisma.client.findFirst.mockReset();
  });

  it('reports that a client exists without disclosing who they are', async () => {
    prisma.client.findFirst.mockResolvedValue(existingClient);

    const result = await ClientService.lookupClient({
      businessId: 'business-1',
      phone: '5551234567',
    });

    expect(result.clientExists).toBe(true);

    // The whole point: no personal data crosses back out.
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('Priya');
    expect(serialized).not.toContain('Raman');
    expect(serialized).not.toContain('priya.raman@gmail.com');
    expect(serialized).not.toContain('5551234567');
  });

  it('reports a miss for an unknown contact', async () => {
    prisma.client.findFirst.mockResolvedValue(null);

    const result = await ClientService.lookupClient({
      businessId: 'business-1',
      email: 'stranger@gmail.com',
    });

    expect(result.clientExists).toBe(false);
  });

  it('does not query at all without an email or phone', async () => {
    const result = await ClientService.lookupClient({
      businessId: 'business-1',
    });

    expect(result.clientExists).toBe(false);
    expect(prisma.client.findFirst).not.toHaveBeenCalled();
  });

  it('scopes the lookup to the business', async () => {
    prisma.client.findFirst.mockResolvedValue(null);

    await ClientService.lookupClient({
      businessId: 'business-1',
      email: 'someone@gmail.com',
    });

    expect(prisma.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: 'business-1' }),
      })
    );
  });
});
