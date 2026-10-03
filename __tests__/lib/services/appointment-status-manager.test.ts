import { AppointmentStatusManager } from '@/lib/services/appointment-status-manager';
import { prisma } from '@/lib/prisma';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';

/**
 * A cancelled appointment can be reinstated, which puts it back in its old
 * slot. Nothing checked that slot was still free: cancel a 10:00, let another
 * client book 10:00, reinstate the first, and the stylist has two clients.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn((run: (tx: unknown) => unknown) =>
      run(jest.requireMock('@/lib/prisma').prisma)
    ),
    $executeRaw: jest.fn(),
    appointment: { findFirst: jest.fn(), update: jest.fn() },
    appointmentStatusHistory: { create: jest.fn() },
  },
}));

const cancelled = {
  id: 'appointment-1',
  status: 'CANCELLED',
  staffId: 'staff-1',
  startTime: new Date('2026-11-02T10:00:00Z'),
  endTime: new Date('2026-11-02T11:00:00Z'),
  confirmedAt: null,
  startedAt: null,
  completedAt: null,
  cancelledAt: new Date('2026-11-01T09:00:00Z'),
};

describe('AppointmentStatusManager reinstating', () => {
  const manager = new AppointmentStatusManager();

  beforeEach(() => {
    jest.clearAllMocks();
    asMock(prisma.appointment.update).mockResolvedValue({
      ...cancelled,
      status: 'SCHEDULED',
    });
  });

  it('refuses to reinstate into a slot that has been booked since', async () => {
    asMock(prisma.appointment.findFirst)
      .mockResolvedValueOnce(cancelled)
      .mockResolvedValueOnce({ id: 'booked-since' });

    const result = await manager.updateStatus(
      'appointment-1',
      'SCHEDULED',
      'business-1'
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/booked since/);
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it('cannot skip the check with skipValidation', async () => {
    asMock(prisma.appointment.findFirst)
      .mockResolvedValueOnce(cancelled)
      .mockResolvedValueOnce({ id: 'booked-since' });

    const result = await manager.updateStatus(
      'appointment-1',
      'SCHEDULED',
      'business-1',
      { skipValidation: true }
    );

    expect(result.success).toBe(false);
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it('reinstates into a free slot, under the staff lock', async () => {
    asMock(prisma.appointment.findFirst)
      .mockResolvedValueOnce(cancelled)
      .mockResolvedValueOnce(null);

    const result = await manager.updateStatus(
      'appointment-1',
      'SCHEDULED',
      'business-1'
    );

    expect(result.success).toBe(true);
    const [lock] = asMock(prisma.$executeRaw).mock.invocationCallOrder;
    const [update] = asMock(prisma.appointment.update).mock.invocationCallOrder;
    expect(lock).toBeLessThan(update);
  });

  it('takes no lock to cancel', async () => {
    asMock(prisma.appointment.findFirst).mockResolvedValueOnce({
      ...cancelled,
      status: 'SCHEDULED',
      cancelledAt: null,
    });

    const result = await manager.updateStatus(
      'appointment-1',
      'CANCELLED',
      'business-1'
    );

    expect(result.success).toBe(true);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
});
