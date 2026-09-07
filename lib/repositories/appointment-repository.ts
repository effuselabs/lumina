import { prisma } from '@/lib/prisma';
import { AppointmentWithRelations } from '@/types/database';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { multiServiceAppointmentService } from '../services/multi-service-appointment';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export interface CreateAppointmentRequest {
  businessId: string;
  clientId?: string;
  staffId: string;
  userId?: string;
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  totalPrice: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  internalNotes?: string;
  depositAmount?: number;
  depositPaid?: boolean;
  services: AppointmentServiceRequest[];
}

export interface UpdateAppointmentRequest {
  startTime?: Date;
  endTime?: Date;
  totalDuration?: number;
  totalPrice?: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  internalNotes?: string;
  depositAmount?: number;
  depositPaid?: boolean;
  confirmedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

export interface AppointmentServiceRequest {
  serviceId: string;
  serviceName: string;
  price: number;
  duration: number;
  serviceOrder?: number;
  startOffset?: number;
  assignedStaffId?: string;
}

export interface AppointmentFilters {
  status?: AppointmentStatus | AppointmentStatus[];
  startDate?: Date;
  endDate?: Date;
  clientId?: string;
  staffId?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'startTime' | 'createdAt' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

export interface AppointmentConflict {
  appointmentId: string;
  startTime: Date;
  endTime: Date;
  clientName?: string;
  services: string[];
}

export interface PaginatedAppointments {
  appointments: AppointmentWithRelations[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

// ============================================================================
// APPOINTMENT REPOSITORY
// ============================================================================

export class AppointmentRepository {
  /**
   * Create a new appointment with business context validation
   */
  async create(
    request: CreateAppointmentRequest
  ): Promise<AppointmentWithRelations> {
    // Validate business context for staff
    await this.validateBusinessContext(request.staffId, request.businessId);

    // Validate client belongs to business if provided
    if (request.clientId) {
      await this.validateClientBusinessContext(
        request.clientId,
        request.businessId
      );
    }

    try {
      const appointment = await prisma.appointment.create({
        data: {
          businessId: request.businessId,
          clientId: request.clientId,
          staffId: request.staffId,
          userId: request.userId,
          startTime: request.startTime,
          endTime: request.endTime,
          totalDuration: request.totalDuration,
          totalPrice: request.totalPrice,
          clientName: request.clientName,
          clientEmail: request.clientEmail,
          clientPhone: request.clientPhone,
          notes: request.notes,
          internalNotes: request.internalNotes,
          depositAmount: request.depositAmount,
          depositPaid: request.depositPaid || false,
          services: {
            create: request.services.map((service, index) => ({
              serviceId: service.serviceId,
              serviceName: service.serviceName,
              price: service.price,
              duration: service.duration,
              serviceOrder: service.serviceOrder || index + 1,
              startOffset: service.startOffset || 0,
              assignedStaffId: service.assignedStaffId,
            })),
          },
        },
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
            orderBy: {
              serviceOrder: 'asc',
            },
          },
          transactions: true,
        },
      });

      return appointment;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error(
            'Appointment creation failed due to constraint violation'
          );
        }
        if (error.code === 'P2003') {
          throw new Error(
            'Invalid reference: staff, client, or service not found'
          );
        }
      }
      throw new Error(
        `Failed to create appointment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find appointment by ID with business context validation
   */
  async findById(
    id: string,
    businessId: string
  ): Promise<AppointmentWithRelations | null> {
    try {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id,
          businessId,
        },
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
            orderBy: {
              serviceOrder: 'asc',
            },
          },
          transactions: true,
        },
      });

      return appointment;
    } catch (error) {
      throw new Error(
        `Failed to find appointment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find appointments by business with filtering and pagination
   */
  async findByBusiness(
    businessId: string,
    filters: AppointmentFilters = {}
  ): Promise<PaginatedAppointments> {
    try {
      const {
        status,
        startDate,
        endDate,
        clientId,
        staffId,
        limit = 50,
        offset = 0,
        orderBy = 'startTime',
        orderDirection = 'asc',
      } = filters;

      const where: Prisma.AppointmentWhereInput = {
        businessId,
        ...(status && {
          status: Array.isArray(status) ? { in: status } : status,
        }),
        ...(startDate &&
          endDate && {
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          }),
        ...(clientId && { clientId }),
        ...(staffId && { staffId }),
      };

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
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
              orderBy: {
                serviceOrder: 'asc',
              },
            },
            transactions: true,
          },
          orderBy: {
            [orderBy]: orderDirection,
          },
          take: limit,
          skip: offset,
        }),
        prisma.appointment.count({ where }),
      ]);

      return {
        appointments,
        total,
        hasMore: offset + appointments.length < total,
        nextOffset:
          offset + appointments.length < total ? offset + limit : undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to find appointments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update appointment with business context validation
   */
  async update(
    id: string,
    businessId: string,
    updates: UpdateAppointmentRequest
  ): Promise<AppointmentWithRelations> {
    // Validate appointment exists and belongs to business
    const existingAppointment = await this.findById(id, businessId);
    if (!existingAppointment) {
      throw new Error('Appointment not found or access denied');
    }

    try {
      const appointment = await prisma.appointment.update({
        where: { id },
        data: updates,
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
            orderBy: {
              serviceOrder: 'asc',
            },
          },
          transactions: true,
        },
      });

      return appointment;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Appointment not found');
        }
      }
      throw new Error(
        `Failed to update appointment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete appointment with business context validation
   */
  async delete(id: string, businessId: string): Promise<void> {
    // Validate appointment exists and belongs to business
    const existingAppointment = await this.findById(id, businessId);
    if (!existingAppointment) {
      throw new Error('Appointment not found or access denied');
    }

    try {
      await prisma.appointment.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Appointment not found');
        }
      }
      throw new Error(
        `Failed to delete appointment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update appointment status with business context validation
   */
  async updateStatus(
    id: string,
    businessId: string,
    status: AppointmentStatus
  ): Promise<AppointmentWithRelations> {
    const statusTimestamps: Partial<UpdateAppointmentRequest> = {};

    // Set appropriate timestamp based on status
    switch (status) {
      case 'CONFIRMED':
        statusTimestamps.confirmedAt = new Date();
        break;
      case 'IN_PROGRESS':
        statusTimestamps.startedAt = new Date();
        break;
      case 'COMPLETED':
        statusTimestamps.completedAt = new Date();
        break;
      case 'CANCELLED':
        statusTimestamps.cancelledAt = new Date();
        break;
    }

    return this.update(id, businessId, {
      ...statusTimestamps,
    } as any);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate that staff belongs to the specified business
   */
  private async validateBusinessContext(
    staffId: string,
    businessId: string
  ): Promise<void> {
    const staff = await prisma.staff.findFirst({
      where: {
        id: staffId,
        businessId,
      },
      select: { id: true },
    });

    if (!staff) {
      throw new Error('Staff member not found or access denied');
    }
  }

  /**
   * Validate that client belongs to the specified business
   */
  private async validateClientBusinessContext(
    clientId: string,
    businessId: string
  ): Promise<void> {
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        businessId,
      },
      select: { id: true },
    });

    if (!client) {
      throw new Error('Client not found or access denied');
    }
  }

  // ============================================================================
  // ADVANCED QUERY METHODS
  // ============================================================================

  /**
   * Find appointments by staff with date range filtering
   */
  async findByStaff(
    staffId: string,
    businessId: string,
    dateRange?: DateRange,
    filters: Omit<AppointmentFilters, 'staffId'> = {}
  ): Promise<PaginatedAppointments> {
    // Validate staff belongs to business
    await this.validateBusinessContext(staffId, businessId);

    try {
      const {
        status,
        clientId,
        limit = 50,
        offset = 0,
        orderBy = 'startTime',
        orderDirection = 'asc',
      } = filters;

      const where: Prisma.AppointmentWhereInput = {
        businessId,
        staffId,
        ...(status && {
          status: Array.isArray(status) ? { in: status } : status,
        }),
        ...(dateRange && {
          startTime: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        }),
        ...(clientId && { clientId }),
      };

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
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
              orderBy: {
                serviceOrder: 'asc',
              },
            },
            transactions: true,
          },
          orderBy: {
            [orderBy]: orderDirection,
          },
          take: limit,
          skip: offset,
        }),
        prisma.appointment.count({ where }),
      ]);

      return {
        appointments,
        total,
        hasMore: offset + appointments.length < total,
        nextOffset:
          offset + appointments.length < total ? offset + limit : undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to find appointments by staff: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find appointments by client with business context validation
   */
  async findByClient(
    clientId: string,
    businessId: string,
    filters: Omit<AppointmentFilters, 'clientId'> = {}
  ): Promise<PaginatedAppointments> {
    // Validate client belongs to business
    await this.validateClientBusinessContext(clientId, businessId);

    try {
      const {
        status,
        startDate,
        endDate,
        staffId,
        limit = 50,
        offset = 0,
        orderBy = 'startTime',
        orderDirection = 'desc', // Default to most recent first for client view
      } = filters;

      const where: Prisma.AppointmentWhereInput = {
        businessId,
        clientId,
        ...(status && {
          status: Array.isArray(status) ? { in: status } : status,
        }),
        ...(startDate &&
          endDate && {
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          }),
        ...(staffId && { staffId }),
      };

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
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
              orderBy: {
                serviceOrder: 'asc',
              },
            },
            transactions: true,
          },
          orderBy: {
            [orderBy]: orderDirection,
          },
          take: limit,
          skip: offset,
        }),
        prisma.appointment.count({ where }),
      ]);

      return {
        appointments,
        total,
        hasMore: offset + appointments.length < total,
        nextOffset:
          offset + appointments.length < total ? offset + limit : undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to find appointments by client: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find conflicting appointments for a staff member in a time slot
   */
  async findConflicting(
    staffId: string,
    timeSlot: TimeSlot,
    businessId: string,
    excludeId?: string
  ): Promise<AppointmentConflict[]> {
    // Validate staff belongs to business
    await this.validateBusinessContext(staffId, businessId);

    try {
      const conflicts = await prisma.appointment.findMany({
        where: {
          businessId,
          staffId,
          ...(excludeId && { id: { not: excludeId } }),
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
          },
          OR: [
            // Appointment starts during the requested time slot
            {
              startTime: {
                gte: timeSlot.startTime,
                lt: timeSlot.endTime,
              },
            },
            // Appointment ends during the requested time slot
            {
              endTime: {
                gt: timeSlot.startTime,
                lte: timeSlot.endTime,
              },
            },
            // Appointment completely encompasses the requested time slot
            {
              startTime: {
                lte: timeSlot.startTime,
              },
              endTime: {
                gte: timeSlot.endTime,
              },
            },
          ],
        },
        include: {
          client: true,
          services: {
            include: {
              service: true,
            },
            orderBy: {
              serviceOrder: 'asc',
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      return conflicts.map(appointment => ({
        appointmentId: appointment.id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        clientName: appointment.client
          ? `${appointment.client.firstName} ${appointment.client.lastName}`
          : appointment.clientName || 'Walk-in Client',
        services: appointment.services.map(service => service.serviceName),
      }));
    } catch (error) {
      throw new Error(
        `Failed to find conflicting appointments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get appointment statistics for a business within a date range
   */
  async getAppointmentStats(
    businessId: string,
    dateRange: DateRange
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byStaff: Array<{ staffId: string; staffName: string; count: number }>;
    revenue: number;
  }> {
    try {
      const [appointments, statusStats, staffStats] = await Promise.all([
        // Get total count and revenue
        prisma.appointment.findMany({
          where: {
            businessId,
            startTime: {
              gte: dateRange.startDate,
              lte: dateRange.endDate,
            },
          },
          select: {
            status: true,
            totalPrice: true,
          },
        }),
        // Get status breakdown
        prisma.appointment.groupBy({
          by: ['status'],
          where: {
            businessId,
            startTime: {
              gte: dateRange.startDate,
              lte: dateRange.endDate,
            },
          },
          _count: {
            status: true,
          },
        }),
        // Get staff breakdown
        prisma.appointment.groupBy({
          by: ['staffId'],
          where: {
            businessId,
            startTime: {
              gte: dateRange.startDate,
              lte: dateRange.endDate,
            },
          },
          _count: {
            staffId: true,
          },
        }),
      ]);

      // Calculate revenue
      const revenue = appointments.reduce((sum, appointment) => {
        return sum + Number(appointment.totalPrice);
      }, 0);

      // Format status stats
      const byStatus = statusStats.reduce(
        (acc, stat) => {
          acc[stat.status] = stat._count.status;
          return acc;
        },
        {} as Record<string, number>
      );

      // Get staff names and format staff stats
      const staffIds = staffStats.map(stat => stat.staffId);
      const staffDetails = await prisma.staff.findMany({
        where: {
          id: { in: staffIds },
          businessId,
        },
        select: {
          id: true,
          displayName: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      const byStaff = staffStats.map(stat => {
        const staff = staffDetails.find(s => s.id === stat.staffId);
        return {
          staffId: stat.staffId,
          staffName: staff?.displayName || staff?.user?.name || 'Unknown Staff',
          count: stat._count.staffId,
        };
      });

      return {
        total: appointments.length,
        byStatus,
        byStaff,
        revenue,
      };
    } catch (error) {
      throw new Error(
        `Failed to get appointment statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find upcoming appointments for a business (next 7 days by default)
   */
  async findUpcoming(
    businessId: string,
    days: number = 7,
    filters: Omit<AppointmentFilters, 'startDate' | 'endDate'> = {}
  ): Promise<PaginatedAppointments> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.findByBusiness(businessId, {
      ...filters,
      startDate,
      endDate,
      status: filters.status || ['SCHEDULED', 'CONFIRMED'],
      orderBy: 'startTime',
      orderDirection: 'asc',
    });
  }

  /**
   * Search appointments by client name, phone, or email
   */
  async searchByClient(
    businessId: string,
    searchTerm: string,
    filters: AppointmentFilters = {}
  ): Promise<PaginatedAppointments> {
    try {
      const {
        status,
        startDate,
        endDate,
        staffId,
        limit = 50,
        offset = 0,
        orderBy = 'startTime',
        orderDirection = 'desc',
      } = filters;

      const where: Prisma.AppointmentWhereInput = {
        businessId,
        ...(status && {
          status: Array.isArray(status) ? { in: status } : status,
        }),
        ...(startDate &&
          endDate && {
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          }),
        ...(staffId && { staffId }),
        OR: [
          // Search in client record
          {
            client: {
              OR: [
                { firstName: { contains: searchTerm, mode: 'insensitive' } },
                { lastName: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
                { phone: { contains: searchTerm, mode: 'insensitive' } },
              ],
            },
          },
          // Search in walk-in client fields
          {
            clientName: { contains: searchTerm, mode: 'insensitive' },
          },
          {
            clientEmail: { contains: searchTerm, mode: 'insensitive' },
          },
          {
            clientPhone: { contains: searchTerm, mode: 'insensitive' },
          },
        ],
      };

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
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
              orderBy: {
                serviceOrder: 'asc',
              },
            },
            transactions: true,
          },
          orderBy: {
            [orderBy]: orderDirection,
          },
          take: limit,
          skip: offset,
        }),
        prisma.appointment.count({ where }),
      ]);

      return {
        appointments,
        total,
        hasMore: offset + appointments.length < total,
        nextOffset:
          offset + appointments.length < total ? offset + limit : undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to search appointments by client: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Add services to an existing appointment
   */
  async addServices(
    appointmentId: string,
    businessId: string,
    services: AppointmentServiceRequest[]
  ): Promise<AppointmentWithRelations> {
    // Validate appointment exists and belongs to business
    const existingAppointment = await this.findById(appointmentId, businessId);
    if (!existingAppointment) {
      throw new Error('Appointment not found or access denied');
    }

    // Validate services using multi-service appointment service
    const serviceSelections = services.map(s => ({
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      price: s.price,
      duration: s.duration,
      serviceOrder: s.serviceOrder || 1,
    }));

    const validation =
      await multiServiceAppointmentService.validateMultiServiceAppointment(
        businessId,
        existingAppointment.staffId,
        serviceSelections
      );

    if (!validation.isValid) {
      throw new Error(
        `Service validation failed: ${validation.errors.join(', ')}`
      );
    }

    try {
      // Get current max service order
      const existingServices = await prisma.appointmentService.findMany({
        where: { appointmentId },
        orderBy: { serviceOrder: 'desc' },
        take: 1,
      });

      const maxOrder =
        existingServices.length > 0 ? existingServices[0].serviceOrder : 0;

      // Add new services
      await prisma.appointmentService.createMany({
        data: services.map((service, index) => ({
          appointmentId,
          serviceId: service.serviceId,
          serviceName: service.serviceName,
          price: service.price,
          duration: service.duration,
          serviceOrder: service.serviceOrder || maxOrder + index + 1,
          startOffset: service.startOffset || 0,
          assignedStaffId: service.assignedStaffId,
        })),
      });

      // Update appointment totals
      const newTotalPrice =
        Number(existingAppointment.totalPrice) + validation.totalPrice;
      const newTotalDuration =
        (existingAppointment.totalDuration || 0) + validation.totalDuration;
      const newEndTime =
        multiServiceAppointmentService.calculateAppointmentEndTime(
          existingAppointment.startTime,
          [
            ...existingAppointment.services.map(s => ({
              serviceId: s.serviceId,
              serviceName: s.serviceName,
              price: Number(s.price),
              duration: s.duration,
              serviceOrder: s.serviceOrder,
            })),
            ...serviceSelections,
          ]
        );

      return await this.update(appointmentId, businessId, {
        totalPrice: newTotalPrice,
        totalDuration: newTotalDuration,
        endTime: newEndTime,
      });
    } catch (error) {
      throw new Error(
        `Failed to add services to appointment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Remove services from an existing appointment
   */
  async removeServices(
    appointmentId: string,
    businessId: string,
    serviceIds: string[]
  ): Promise<AppointmentWithRelations> {
    // Validate appointment exists and belongs to business
    const existingAppointment = await this.findById(appointmentId, businessId);
    if (!existingAppointment) {
      throw new Error('Appointment not found or access denied');
    }

    // Ensure we don't remove all services
    const remainingServices = existingAppointment.services.filter(
      s => !serviceIds.includes(s.serviceId)
    );

    if (remainingServices.length === 0) {
      throw new Error('Cannot remove all services from an appointment');
    }

    try {
      // Remove the specified services
      await prisma.appointmentService.deleteMany({
        where: {
          appointmentId,
          serviceId: { in: serviceIds },
        },
      });

      // Recalculate totals based on remaining services
      const newTotalPrice = remainingServices.reduce(
        (sum, s) => sum + Number(s.price),
        0
      );
      const newTotalDuration = remainingServices.reduce(
        (sum, s) => sum + s.duration,
        0
      );
      const newEndTime =
        multiServiceAppointmentService.calculateAppointmentEndTime(
          existingAppointment.startTime,
          remainingServices.map(s => ({
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            price: Number(s.price),
            duration: s.duration,
            serviceOrder: s.serviceOrder,
          }))
        );

      // Reorder remaining services to fill gaps
      const reorderedServices = remainingServices
        .sort((a, b) => a.serviceOrder - b.serviceOrder)
        .map((service, index) => ({
          id: service.id,
          serviceOrder: index + 1,
        }));

      // Update service orders
      for (const service of reorderedServices) {
        await prisma.appointmentService.update({
          where: { id: service.id },
          data: { serviceOrder: service.serviceOrder },
        });
      }

      return await this.update(appointmentId, businessId, {
        totalPrice: newTotalPrice,
        totalDuration: newTotalDuration,
        endTime: newEndTime,
      });
    } catch (error) {
      throw new Error(
        `Failed to remove services from appointment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Reorder services within an appointment
   */
  async reorderServices(
    appointmentId: string,
    businessId: string,
    serviceOrders: { serviceId: string; newOrder: number }[]
  ): Promise<AppointmentWithRelations> {
    // Validate appointment exists and belongs to business
    const existingAppointment = await this.findById(appointmentId, businessId);
    if (!existingAppointment) {
      throw new Error('Appointment not found or access denied');
    }

    try {
      // Update service orders
      for (const { serviceId, newOrder } of serviceOrders) {
        await prisma.appointmentService.updateMany({
          where: {
            appointmentId,
            serviceId,
          },
          data: { serviceOrder: newOrder },
        });
      }

      // Recalculate timing based on new order
      const reorderedServices = existingAppointment.services
        .map(s => {
          const newOrderInfo = serviceOrders.find(
            so => so.serviceId === s.serviceId
          );
          return {
            ...s,
            serviceOrder: newOrderInfo ? newOrderInfo.newOrder : s.serviceOrder,
          };
        })
        .sort((a, b) => a.serviceOrder - b.serviceOrder);

      const newEndTime =
        multiServiceAppointmentService.calculateAppointmentEndTime(
          existingAppointment.startTime,
          reorderedServices.map(s => ({
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            price: s.price,
            duration: s.duration,
            serviceOrder: s.serviceOrder,
          })) as any
        );

      return await this.update(appointmentId, businessId, {
        endTime: newEndTime,
      });
    } catch (error) {
      throw new Error(
        `Failed to reorder services: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get qualified staff for multiple services
   */
  async getQualifiedStaffForServices(businessId: string, serviceIds: string[]) {
    return multiServiceAppointmentService.getQualifiedStaff(
      businessId,
      serviceIds
    );
  }

  /**
   * Validate service sequence for an appointment
   */
  validateServiceSequence(services: any[]) {
    return multiServiceAppointmentService.validateServiceSequence(services);
  }

  /**
   * Generate service breakdown for appointment display
   */
  generateServiceBreakdown(services: any[]) {
    return multiServiceAppointmentService.generateServiceBreakdown(services);
  }
}
