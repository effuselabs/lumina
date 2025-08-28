import { prisma } from './prisma';
import type {
  AppointmentWithRelations,
  BusinessAnalytics,
  BusinessWithRelations,
  FinancialSummary,
  StaffPerformance,
  StaffWithRelations,
} from '@/types/database';

// ============================================================================
// BUSINESS UTILITIES
// ============================================================================

export async function getBusinessWithRelations(
  businessId: string
): Promise<BusinessWithRelations | null> {
  return prisma.business.findUnique({
    where: { id: businessId },
    include: {
      users: {
        include: {
          user: true,
        },
      },
      staff: {
        include: {
          user: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      },
      services: true,
      clients: true,
    },
  });
}

export async function getBusinessBySlug(
  slug: string
): Promise<BusinessWithRelations | null> {
  return prisma.business.findUnique({
    where: { slug },
    include: {
      users: {
        include: {
          user: true,
        },
      },
      staff: {
        include: {
          user: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      },
      services: true,
      clients: true,
    },
  });
}

// ============================================================================
// STAFF UTILITIES
// ============================================================================

export async function getStaffWithRelations(
  staffId: string
): Promise<StaffWithRelations | null> {
  return prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      user: true,
      business: true,
      services: {
        include: {
          service: true,
        },
      },
      appointments: {
        include: {
          client: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      },
    },
  });
}

export async function getStaffByUserId(
  userId: string
): Promise<StaffWithRelations | null> {
  return prisma.staff.findUnique({
    where: { userId },
    include: {
      user: true,
      business: true,
      services: {
        include: {
          service: true,
        },
      },
      appointments: {
        include: {
          client: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      },
    },
  });
}

// ============================================================================
// APPOINTMENT UTILITIES
// ============================================================================

export async function getAppointmentWithRelations(
  appointmentId: string
): Promise<AppointmentWithRelations | null> {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      client: true,
      staff: {
        include: {
          user: true,
        },
      },
      services: {
        include: {
          service: true,
        },
      },
      transactions: true,
    },
  });
}

export async function getBusinessAppointments(
  businessId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AppointmentWithRelations[]> {
  const where: any = { businessId };

  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) where.startTime.gte = startDate;
    if (endDate) where.startTime.lte = endDate;
  }

  return prisma.appointment.findMany({
    where,
    include: {
      client: true,
      staff: {
        include: {
          user: true,
        },
      },
      services: {
        include: {
          service: true,
        },
      },
      transactions: true,
    },
    orderBy: {
      startTime: 'asc',
    },
  });
}

// ============================================================================
// FINANCIAL UTILITIES
// ============================================================================

export async function getFinancialSummary(
  businessId: string,
  startDate: Date,
  endDate: Date
): Promise<FinancialSummary> {
  const transactions = await prisma.transaction.findMany({
    where: {
      businessId,
      status: 'COMPLETED',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalRevenue = transactions
    .filter(t => t.type === 'PAYMENT')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalCommissions = transactions
    .filter(t => t.type === 'COMMISSION')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalTransactions = transactions.length;
  const averageTicket =
    totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  return {
    totalRevenue,
    totalCommissions,
    totalTransactions,
    averageTicket,
    period: {
      start: startDate,
      end: endDate,
    },
  };
}

export async function getStaffPerformance(
  staffId: string,
  startDate: Date,
  endDate: Date
): Promise<StaffPerformance> {
  const transactions = await prisma.transaction.findMany({
    where: {
      staffId,
      status: 'COMPLETED',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      staffId,
      status: 'COMPLETED',
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      client: true,
    },
  });

  const totalRevenue = transactions
    .filter(t => t.type === 'PAYMENT')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalCommissions = transactions
    .filter(t => t.type === 'COMMISSION')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalAppointments = appointments.length;
  const averageTicket =
    totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

  // Calculate client retention rate (simplified)
  const uniqueClients = new Set(
    appointments.map(a => a.clientId).filter(Boolean)
  );
  const returningClients = new Set();

  for (const clientId of uniqueClients) {
    const clientAppointments = appointments.filter(
      a => a.clientId === clientId
    );
    if (clientAppointments.length > 1) {
      returningClients.add(clientId);
    }
  }

  const clientRetentionRate =
    uniqueClients.size > 0
      ? (returningClients.size / uniqueClients.size) * 100
      : 0;

  return {
    staffId,
    totalRevenue,
    totalCommissions,
    totalAppointments,
    averageTicket,
    clientRetentionRate,
    period: {
      start: startDate,
      end: endDate,
    },
  };
}

// ============================================================================
// ANALYTICS UTILITIES
// ============================================================================

export async function getBusinessAnalytics(
  businessId: string,
  startDate: Date,
  endDate: Date
): Promise<BusinessAnalytics> {
  // Get financial summary
  const revenue = await getFinancialSummary(businessId, startDate, endDate);

  // Get appointment statistics
  const appointments = await prisma.appointment.findMany({
    where: {
      businessId,
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      services: {
        include: {
          service: true,
        },
      },
    },
  });

  const appointmentStats = {
    total: appointments.length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
    cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
    noShows: appointments.filter(a => a.status === 'NO_SHOW').length,
  };

  // Get client statistics
  const clients = await prisma.client.findMany({
    where: { businessId },
  });

  const newClients = await prisma.client.findMany({
    where: {
      businessId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const clientStats = {
    total: clients.length,
    new: newClients.length,
    returning: clients.length - newClients.length,
  };

  // Get staff performance
  const staff = await prisma.staff.findMany({
    where: { businessId },
  });

  const staffPerformance = await Promise.all(
    staff.map(s => getStaffPerformance(s.id, startDate, endDate))
  );

  // Get top services
  const serviceStats = new Map<
    string,
    { name: string; bookings: number; revenue: number }
  >();

  appointments.forEach(appointment => {
    appointment.services.forEach(appointmentService => {
      const serviceId = appointmentService.serviceId;
      const serviceName = appointmentService.serviceName;
      const revenue = Number(appointmentService.price);

      if (serviceStats.has(serviceId)) {
        const stats = serviceStats.get(serviceId)!;
        stats.bookings += 1;
        stats.revenue += revenue;
      } else {
        serviceStats.set(serviceId, {
          name: serviceName,
          bookings: 1,
          revenue,
        });
      }
    });
  });

  const topServices = Array.from(serviceStats.entries())
    .map(([serviceId, stats]) => ({
      serviceId,
      serviceName: stats.name,
      bookings: stats.bookings,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    revenue,
    appointments: appointmentStats,
    clients: clientStats,
    staff: staffPerformance,
    topServices,
  };
}

// ============================================================================
// AVAILABILITY UTILITIES
// ============================================================================

export async function checkStaffAvailability(
  staffId: string,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const conflictingAppointments = await prisma.appointment.findMany({
    where: {
      staffId,
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
      },
      OR: [
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } },
          ],
        },
        {
          AND: [{ startTime: { lt: endTime } }, { endTime: { gte: endTime } }],
        },
        {
          AND: [
            { startTime: { gte: startTime } },
            { endTime: { lte: endTime } },
          ],
        },
      ],
    },
  });

  return conflictingAppointments.length === 0;
}
