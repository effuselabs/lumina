import { AppointmentStatus as PrismaStatus } from '@prisma/client';
import { AppointmentStatus } from '@/types/dashboard-appointments';

/** The dashboard's mirror of Prisma's enum must not drift from it. */
it('mirrors Prisma’s AppointmentStatus exactly', () => {
  expect(AppointmentStatus).toEqual({ ...PrismaStatus });
});
