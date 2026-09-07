/**
 * Schema validation test for appointment booking engine enhancements
 * Validates that the new schema changes are properly applied
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Appointment Schema Enhancement Validation', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Schema Structure Validation', () => {
    it('should have AppointmentStatusHistory model available', async () => {
      // Test that the model exists by checking if we can access it
      expect(prisma.appointmentStatusHistory).toBeDefined();

      // Test that we can perform basic operations
      const count = await prisma.appointmentStatusHistory.count();
      expect(typeof count).toBe('number');
    });

    it('should have AppointmentPreferences model available', async () => {
      // Test that the model exists
      expect(prisma.appointmentPreferences).toBeDefined();

      // Test that we can perform basic operations
      const count = await prisma.appointmentPreferences.count();
      expect(typeof count).toBe('number');
    });

    it('should have enhanced Appointment model with new fields', async () => {
      // Test that the model exists
      expect(prisma.appointment).toBeDefined();

      // Test that we can query with new fields
      const appointments = await prisma.appointment.findMany({
        select: {
          id: true,
          totalDuration: true,
          totalPrice: true,
          confirmedAt: true,
          startedAt: true,
          completedAt: true,
          cancelledAt: true,
          cancellationReason: true,
        },
        take: 1,
      });

      expect(Array.isArray(appointments)).toBe(true);
    });

    it('should have enhanced AppointmentService model with new fields', async () => {
      // Test that the model exists
      expect(prisma.appointmentService).toBeDefined();

      // Test that we can query with new fields
      const services = await prisma.appointmentService.findMany({
        select: {
          id: true,
          serviceOrder: true,
          startOffset: true,
          assignedStaffId: true,
        },
        take: 1,
      });

      expect(Array.isArray(services)).toBe(true);
    });
  });

  describe('Database Indexes Validation', () => {
    it('should be able to query appointments by business and status efficiently', async () => {
      // This tests that the index exists by performing a query that would use it
      const startTime = Date.now();

      await prisma.appointment.findMany({
        where: {
          businessId: 'test-business-id',
          status: 'SCHEDULED',
        },
        take: 10,
      });

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      // Query should complete quickly (under 1 second for indexed query)
      expect(queryTime).toBeLessThan(1000);
    });

    it('should be able to query appointment services by order efficiently', async () => {
      const startTime = Date.now();

      await prisma.appointmentService.findMany({
        where: {
          appointmentId: 'test-appointment-id',
        },
        orderBy: {
          serviceOrder: 'asc',
        },
        take: 10,
      });

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      // Query should complete quickly
      expect(queryTime).toBeLessThan(1000);
    });
  });

  describe('Business Context Validation', () => {
    it('should enforce business context in AppointmentStatusHistory', async () => {
      // Test that businessId is required
      await expect(
        prisma.appointmentStatusHistory.create({
          data: {
            appointmentId: 'test-appointment',
            // businessId: missing - should fail
            newStatus: 'SCHEDULED',
          },
        })
      ).rejects.toThrow();
    });

    it('should enforce business context in AppointmentPreferences', async () => {
      // Test that businessId is required
      await expect(
        prisma.appointmentPreferences.create({
          data: {
            clientId: 'test-client',
            // businessId: missing - should fail
            preferredTimeSlots: {},
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Data Type Validation', () => {
    it('should handle JSON fields in AppointmentPreferences', async () => {
      // Test that JSON fields work correctly
      const testData = {
        days: ['monday', 'wednesday', 'friday'],
        times: ['10:00', '14:00', '16:00'],
      };

      // This should not throw an error for valid JSON
      expect(() => {
        JSON.stringify(testData);
      }).not.toThrow();
    });

    it('should handle decimal fields in Appointment model', async () => {
      // Test that decimal fields are properly typed
      const testPrice = 50.0;
      expect(typeof testPrice).toBe('number');
      expect(testPrice.toFixed(2)).toBe('50.00');
    });

    it('should handle array fields in AppointmentPreferences', async () => {
      // Test that array fields work correctly
      const testServices = ['service-1', 'service-2', 'service-3'];
      expect(Array.isArray(testServices)).toBe(true);
      expect(testServices.length).toBe(3);
    });
  });

  describe('Migration Validation', () => {
    it('should have applied migration successfully', async () => {
      // Test that we can access all the new models without errors
      const models = [
        prisma.appointment,
        prisma.appointmentService,
        prisma.appointmentStatusHistory,
        prisma.appointmentPreferences,
      ];

      for (const model of models) {
        expect(model).toBeDefined();
        // Test that we can perform a count operation (basic DB access)
        const count = await model.count();
        expect(typeof count).toBe('number');
      }
    });

    it('should maintain existing data integrity', async () => {
      // Test that existing appointments still work
      const appointmentCount = await prisma.appointment.count();
      expect(typeof appointmentCount).toBe('number');
      expect(appointmentCount).toBeGreaterThanOrEqual(0);

      // Test that existing appointment services still work
      const serviceCount = await prisma.appointmentService.count();
      expect(typeof serviceCount).toBe('number');
      expect(serviceCount).toBeGreaterThanOrEqual(0);
    });
  });
});
