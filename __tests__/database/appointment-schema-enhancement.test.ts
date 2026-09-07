/**
 * Test suite for appointment booking engine database schema enhancements
 * Validates new models, fields, and relationships
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Appointment Schema Enhancement Tests', () => {
  let testBusinessId: string;
  let testClientId: string;
  let testStaffId: string;
  let testUserId: string;
  let testServiceId: string;

  beforeAll(async () => {
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test-schema@example.com',
        name: 'Test Schema User',
        role: 'STAFF',
      },
    });
    testUserId = testUser.id;

    // Create test business
    const testBusiness = await prisma.business.create({
      data: {
        name: 'Test Schema Business',
        slug: 'test-schema-business',
        country: 'US',
        timezone: 'America/New_York',
      },
    });
    testBusinessId = testBusiness.id;

    // Create test staff
    const testStaff = await prisma.staff.create({
      data: {
        businessId: testBusinessId,
        userId: testUserId,
        displayName: 'Test Staff Member',
        employmentType: 'COMMISSION',
        commissionRate: 50.0,
      },
    });
    testStaffId = testStaff.id;

    // Create test client
    const testClient = await prisma.client.create({
      data: {
        businessId: testBusinessId,
        firstName: 'Test',
        lastName: 'Client',
        email: 'test-client@example.com',
        phone: '+1234567890',
      },
    });
    testClientId = testClient.id;

    // Create test service
    const testService = await prisma.service.create({
      data: {
        businessId: testBusinessId,
        name: 'Test Haircut',
        price: 50.0,
        duration: 60,
      },
    });
    testServiceId = testService.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.appointmentStatusHistory.deleteMany({
      where: { businessId: testBusinessId },
    });
    await prisma.appointmentPreferences.deleteMany({
      where: { businessId: testBusinessId },
    });
    await prisma.appointmentService.deleteMany({
      where: { appointment: { businessId: testBusinessId } },
    });
    await prisma.appointment.deleteMany({
      where: { businessId: testBusinessId },
    });
    await prisma.service.deleteMany({
      where: { businessId: testBusinessId },
    });
    await prisma.client.deleteMany({
      where: { businessId: testBusinessId },
    });
    await prisma.staff.deleteMany({
      where: { businessId: testBusinessId },
    });
    await prisma.business.delete({
      where: { id: testBusinessId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });

    await prisma.$disconnect();
  });

  describe('Enhanced Appointment Model', () => {
    it('should create appointment with new enhanced fields', async () => {
      const startTime = new Date('2024-12-01T10:00:00Z');
      const endTime = new Date('2024-12-01T11:00:00Z');

      const appointment = await prisma.appointment.create({
        data: {
          businessId: testBusinessId,
          clientId: testClientId,
          staffId: testStaffId,
          startTime,
          endTime,
          status: 'SCHEDULED',
          totalDuration: 60,
          totalPrice: 50.0,
          notes: 'Test appointment with enhanced fields',
        },
      });

      expect(appointment).toBeDefined();
      expect(appointment.totalDuration).toBe(60);
      expect(appointment.totalPrice.toNumber()).toBe(50.0);
      expect(appointment.confirmedAt).toBeNull();
      expect(appointment.startedAt).toBeNull();
      expect(appointment.completedAt).toBeNull();
      expect(appointment.cancelledAt).toBeNull();
      expect(appointment.cancellationReason).toBeNull();
    });

    it('should update appointment status tracking fields', async () => {
      const appointment = await prisma.appointment.create({
        data: {
          businessId: testBusinessId,
          clientId: testClientId,
          staffId: testStaffId,
          startTime: new Date('2024-12-01T14:00:00Z'),
          endTime: new Date('2024-12-01T15:00:00Z'),
          status: 'SCHEDULED',
          totalDuration: 60,
          totalPrice: 75.0,
        },
      });

      const confirmedAt = new Date();
      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CONFIRMED',
          confirmedAt,
        },
      });

      expect(updatedAppointment.status).toBe('CONFIRMED');
      expect(updatedAppointment.confirmedAt).toEqual(confirmedAt);
    });
  });

  describe('Enhanced AppointmentService Model', () => {
    it('should create appointment service with new ordering fields', async () => {
      const appointment = await prisma.appointment.create({
        data: {
          businessId: testBusinessId,
          clientId: testClientId,
          staffId: testStaffId,
          startTime: new Date('2024-12-01T16:00:00Z'),
          endTime: new Date('2024-12-01T17:30:00Z'),
          status: 'SCHEDULED',
          totalDuration: 90,
          totalPrice: 100.0,
        },
      });

      const appointmentService = await prisma.appointmentService.create({
        data: {
          appointmentId: appointment.id,
          serviceId: testServiceId,
          serviceName: 'Test Haircut',
          price: 50.0,
          duration: 60,
          serviceOrder: 1,
          startOffset: 0,
          assignedStaffId: testStaffId,
        },
      });

      expect(appointmentService).toBeDefined();
      expect(appointmentService.serviceOrder).toBe(1);
      expect(appointmentService.startOffset).toBe(0);
      expect(appointmentService.assignedStaffId).toBe(testStaffId);
    });

    it('should support multi-service appointments with proper ordering', async () => {
      const appointment = await prisma.appointment.create({
        data: {
          businessId: testBusinessId,
          clientId: testClientId,
          staffId: testStaffId,
          startTime: new Date('2024-12-01T18:00:00Z'),
          endTime: new Date('2024-12-01T20:00:00Z'),
          status: 'SCHEDULED',
          totalDuration: 120,
          totalPrice: 150.0,
        },
      });

      // Create multiple services for the same appointment
      const service1 = await prisma.appointmentService.create({
        data: {
          appointmentId: appointment.id,
          serviceId: testServiceId,
          serviceName: 'Haircut',
          price: 50.0,
          duration: 60,
          serviceOrder: 1,
          startOffset: 0,
        },
      });

      const service2 = await prisma.appointmentService.create({
        data: {
          appointmentId: appointment.id,
          serviceId: testServiceId,
          serviceName: 'Hair Styling',
          price: 100.0,
          duration: 60,
          serviceOrder: 2,
          startOffset: 60,
        },
      });

      const services = await prisma.appointmentService.findMany({
        where: { appointmentId: appointment.id },
        orderBy: { serviceOrder: 'asc' },
      });

      expect(services).toHaveLength(2);
      expect(services[0].serviceOrder).toBe(1);
      expect(services[0].startOffset).toBe(0);
      expect(services[1].serviceOrder).toBe(2);
      expect(services[1].startOffset).toBe(60);
    });
  });

  describe('AppointmentStatusHistory Model', () => {
    it('should create status history record', async () => {
      const appointment = await prisma.appointment.create({
        data: {
          businessId: testBusinessId,
          clientId: testClientId,
          staffId: testStaffId,
          startTime: new Date('2024-12-02T10:00:00Z'),
          endTime: new Date('2024-12-02T11:00:00Z'),
          status: 'SCHEDULED',
          totalDuration: 60,
          totalPrice: 50.0,
        },
      });

      const statusHistory = await prisma.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          businessId: testBusinessId,
          oldStatus: null,
          newStatus: 'SCHEDULED',
          changedBy: testUserId,
          reason: 'Initial appointment creation',
        },
      });

      expect(statusHistory).toBeDefined();
      expect(statusHistory.appointmentId).toBe(appointment.id);
      expect(statusHistory.businessId).toBe(testBusinessId);
      expect(statusHistory.oldStatus).toBeNull();
      expect(statusHistory.newStatus).toBe('SCHEDULED');
      expect(statusHistory.changedBy).toBe(testUserId);
    });

    it('should track status transitions', async () => {
      const appointment = await prisma.appointment.create({
        data: {
          businessId: testBusinessId,
          clientId: testClientId,
          staffId: testStaffId,
          startTime: new Date('2024-12-02T14:00:00Z'),
          endTime: new Date('2024-12-02T15:00:00Z'),
          status: 'SCHEDULED',
          totalDuration: 60,
          totalPrice: 50.0,
        },
      });

      // Create initial status
      await prisma.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          businessId: testBusinessId,
          oldStatus: null,
          newStatus: 'SCHEDULED',
          changedBy: testUserId,
        },
      });

      // Update to confirmed
      await prisma.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          businessId: testBusinessId,
          oldStatus: 'SCHEDULED',
          newStatus: 'CONFIRMED',
          changedBy: testUserId,
          reason: 'Client confirmed appointment',
        },
      });

      const history = await prisma.appointmentStatusHistory.findMany({
        where: { appointmentId: appointment.id },
        orderBy: { createdAt: 'asc' },
      });

      expect(history).toHaveLength(2);
      expect(history[0].newStatus).toBe('SCHEDULED');
      expect(history[1].oldStatus).toBe('SCHEDULED');
      expect(history[1].newStatus).toBe('CONFIRMED');
    });
  });

  describe('AppointmentPreferences Model', () => {
    it('should create client appointment preferences', async () => {
      const preferences = await prisma.appointmentPreferences.create({
        data: {
          clientId: testClientId,
          businessId: testBusinessId,
          preferredStaffId: testStaffId,
          preferredServices: [testServiceId],
          preferredTimeSlots: {
            days: ['monday', 'wednesday', 'friday'],
            times: ['10:00', '14:00', '16:00'],
          },
          specialRequests: 'Please use organic products',
        },
      });

      expect(preferences).toBeDefined();
      expect(preferences.clientId).toBe(testClientId);
      expect(preferences.businessId).toBe(testBusinessId);
      expect(preferences.preferredStaffId).toBe(testStaffId);
      expect(preferences.preferredServices).toContain(testServiceId);
      expect(preferences.specialRequests).toBe('Please use organic products');
    });

    it('should enforce unique constraint per client/business', async () => {
      // Create first preference
      await prisma.appointmentPreferences.create({
        data: {
          clientId: testClientId,
          businessId: testBusinessId,
          preferredServices: [testServiceId],
          preferredTimeSlots: { days: ['monday'] },
        },
      });

      // Attempt to create duplicate should fail
      await expect(
        prisma.appointmentPreferences.create({
          data: {
            clientId: testClientId,
            businessId: testBusinessId,
            preferredServices: [testServiceId],
            preferredTimeSlots: { days: ['tuesday'] },
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Database Indexes and Performance', () => {
    it('should efficiently query appointments by business and status', async () => {
      // Create multiple appointments with different statuses
      const appointments = await Promise.all([
        prisma.appointment.create({
          data: {
            businessId: testBusinessId,
            clientId: testClientId,
            staffId: testStaffId,
            startTime: new Date('2024-12-03T10:00:00Z'),
            endTime: new Date('2024-12-03T11:00:00Z'),
            status: 'SCHEDULED',
            totalDuration: 60,
            totalPrice: 50.0,
          },
        }),
        prisma.appointment.create({
          data: {
            businessId: testBusinessId,
            clientId: testClientId,
            staffId: testStaffId,
            startTime: new Date('2024-12-03T14:00:00Z'),
            endTime: new Date('2024-12-03T15:00:00Z'),
            status: 'CONFIRMED',
            totalDuration: 60,
            totalPrice: 50.0,
          },
        }),
      ]);

      // Query by business and status (should use index)
      const scheduledAppointments = await prisma.appointment.findMany({
        where: {
          businessId: testBusinessId,
          status: 'SCHEDULED',
        },
      });

      expect(scheduledAppointments).toHaveLength(1);
      expect(scheduledAppointments[0].status).toBe('SCHEDULED');
    });

    it('should efficiently query appointment services by order', async () => {
      const appointment = await prisma.appointment.create({
        data: {
          businessId: testBusinessId,
          clientId: testClientId,
          staffId: testStaffId,
          startTime: new Date('2024-12-03T16:00:00Z'),
          endTime: new Date('2024-12-03T18:00:00Z'),
          status: 'SCHEDULED',
          totalDuration: 120,
          totalPrice: 150.0,
        },
      });

      // Create services in random order
      await Promise.all([
        prisma.appointmentService.create({
          data: {
            appointmentId: appointment.id,
            serviceId: testServiceId,
            serviceName: 'Service 3',
            price: 50.0,
            duration: 40,
            serviceOrder: 3,
            startOffset: 80,
          },
        }),
        prisma.appointmentService.create({
          data: {
            appointmentId: appointment.id,
            serviceId: testServiceId,
            serviceName: 'Service 1',
            price: 50.0,
            duration: 40,
            serviceOrder: 1,
            startOffset: 0,
          },
        }),
        prisma.appointmentService.create({
          data: {
            appointmentId: appointment.id,
            serviceId: testServiceId,
            serviceName: 'Service 2',
            price: 50.0,
            duration: 40,
            serviceOrder: 2,
            startOffset: 40,
          },
        }),
      ]);

      // Query services in order (should use appointmentId, serviceOrder index)
      const orderedServices = await prisma.appointmentService.findMany({
        where: { appointmentId: appointment.id },
        orderBy: { serviceOrder: 'asc' },
      });

      expect(orderedServices).toHaveLength(3);
      expect(orderedServices[0].serviceName).toBe('Service 1');
      expect(orderedServices[1].serviceName).toBe('Service 2');
      expect(orderedServices[2].serviceName).toBe('Service 3');
    });
  });

  describe('Business Context Validation', () => {
    it('should maintain proper business isolation', async () => {
      // Create second business for isolation test
      const otherBusiness = await prisma.business.create({
        data: {
          name: 'Other Business',
          slug: 'other-business-schema-test',
          country: 'US',
          timezone: 'America/New_York',
        },
      });

      const appointment = await prisma.appointment.create({
        data: {
          businessId: testBusinessId,
          clientId: testClientId,
          staffId: testStaffId,
          startTime: new Date('2024-12-04T10:00:00Z'),
          endTime: new Date('2024-12-04T11:00:00Z'),
          status: 'SCHEDULED',
          totalDuration: 60,
          totalPrice: 50.0,
        },
      });

      // Query should not return appointments from other business
      const otherBusinessAppointments = await prisma.appointment.findMany({
        where: { businessId: otherBusiness.id },
      });

      expect(otherBusinessAppointments).toHaveLength(0);

      // Clean up
      await prisma.business.delete({
        where: { id: otherBusiness.id },
      });
    });
  });
});
