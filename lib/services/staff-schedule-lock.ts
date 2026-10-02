import type { Prisma } from '@prisma/client';

/** Statuses that hold a staff member's time. */
export const BLOCKING_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
] as const;

/**
 * Serialise appointment writes for one staff member until the transaction
 * ends.
 *
 * Checking for a clash and then inserting is only safe if nobody else can
 * insert in between. Read committed — Postgres's default — does not stop
 * that, and there is no row to lock yet, because the clashing appointment is
 * the one about to be written. An advisory lock keyed on the staff member
 * makes concurrent bookings for the same person queue, while bookings for
 * different people still run in parallel. It is released at commit or
 * rollback, so it cannot leak.
 */
export async function lockStaffSchedule(
  tx: Prisma.TransactionClient,
  staffId: string
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${staffId}, 0))`;
}

/**
 * Whether the staff member already has an appointment overlapping
 * [startTime, endTime). Touching ends — one finishing at 10:00, the next
 * starting at 10:00 — do not overlap.
 */
export async function hasOverlappingAppointment(
  tx: Prisma.TransactionClient,
  slot: {
    businessId: string;
    staffId: string;
    startTime: Date;
    endTime: Date;
  }
): Promise<boolean> {
  const clash = await tx.appointment.findFirst({
    where: {
      businessId: slot.businessId,
      staffId: slot.staffId,
      status: { in: [...BLOCKING_STATUSES] },
      startTime: { lt: slot.endTime },
      endTime: { gt: slot.startTime },
    },
    select: { id: true },
  });
  return Boolean(clash);
}
