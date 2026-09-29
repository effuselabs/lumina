import type { Prisma } from '@prisma/client';

// ============================================================================
// EXTENDED TYPES WITH RELATIONS
// ============================================================================

// User with all relations
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    businesses: {
      include: {
        business: true;
      };
    };
    staffProfile: {
      include: {
        business: true;
        services: {
          include: {
            service: true;
          };
        };
      };
    };
  };
}>;

// Staff with relations
export type StaffWithRelations = Prisma.StaffGetPayload<{
  include: {
    user: true;
    business: true;
    services: {
      include: {
        service: true;
      };
    };
    appointments: {
      include: {
        client: true;
        services: {
          include: {
            service: true;
          };
        };
      };
    };
    paymentCalculations: true;
  };
}>;

// Appointment with full relations
export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    client: true;
    staff: {
      include: {
        user: true;
      };
    };
    services: {
      include: {
        service: true;
      };
    };
    transactions: true;
  };
}>;
