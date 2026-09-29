/**
 * Business logic validators and constraint checkers
 * Implements comprehensive validation for appointments, schedules, services, and financial integrity
 */

import { PrismaClient } from '@prisma/client';
import { ValidationError, ValidationResult, ValidationWarning } from './types';

export class DataIntegrityValidator {
  private prisma: PrismaClient;
  private businessId: string;

  constructor(prisma: PrismaClient, businessId: string) {
    this.prisma = prisma;
    this.businessId = businessId;
  }

  /**
   * Validate financial data integrity
   */
  async validateFinancialIntegrity(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for appointments without corresponding transactions
    const appointmentsWithoutTransactions =
      await this.prisma.appointment.findMany({
        where: {
          businessId: this.businessId,
          status: 'COMPLETED',
          // Add transaction relationship check when transactions are implemented
        },
      });

    if (appointmentsWithoutTransactions.length > 0) {
      warnings.push({
        field: 'transactions',
        message: `${appointmentsWithoutTransactions.length} completed appointments without transactions`,
        code: 'MISSING_TRANSACTIONS',
      });
    }

    // Check for negative prices
    const servicesWithNegativePrices = await this.prisma.service.findMany({
      where: {
        businessId: this.businessId,
        price: { lt: 0 },
      },
    });

    if (servicesWithNegativePrices.length > 0) {
      errors.push({
        field: 'services',
        message: `${servicesWithNegativePrices.length} services have negative prices`,
        code: 'NEGATIVE_PRICES',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate appointment data integrity
   */
  async validateAppointmentIntegrity(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for appointments with end time before start time
    const invalidTimeAppointments = await this.prisma.appointment.findMany({
      where: {
        businessId: this.businessId,
        endTime: { lte: this.prisma.appointment.fields.startTime },
      },
    });

    if (invalidTimeAppointments.length > 0) {
      errors.push({
        field: 'appointments',
        message: `${invalidTimeAppointments.length} appointments have invalid time ranges`,
        code: 'INVALID_TIME_RANGE',
      });
    }

    // Check for appointments without services
    const appointments = await this.prisma.appointment.findMany({
      where: {
        businessId: this.businessId,
      },
    });

    const appointmentServices = await this.prisma.appointmentService.findMany({
      where: {
        appointment: {
          businessId: this.businessId,
        },
      },
    });

    const emptyAppointments = appointments.filter(
      apt => !appointmentServices.some(as => as.appointmentId === apt.id)
    );

    if (emptyAppointments.length > 0) {
      warnings.push({
        field: 'appointments',
        message: `${emptyAppointments.length} appointments have no services`,
        code: 'APPOINTMENTS_WITHOUT_SERVICES',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate staff-service relationships
   */
  async validateStaffServiceIntegrity(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for staff without any services
    const staff = await this.prisma.staff.findMany({
      where: {
        businessId: this.businessId,
        isActive: true,
      },
    });

    const staffServices = await this.prisma.staffService.findMany({
      where: {
        staff: {
          businessId: this.businessId,
        },
      },
    });

    const emptyStaff = staff.filter(
      s => !staffServices.some(ss => ss.staffId === s.id)
    );

    if (emptyStaff.length > 0) {
      warnings.push({
        field: 'staff',
        message: `${emptyStaff.length} active staff members have no assigned services`,
        code: 'STAFF_WITHOUT_SERVICES',
      });
    }

    // Check for services without any staff
    const services = await this.prisma.service.findMany({
      where: {
        businessId: this.businessId,
        isActive: true,
      },
    });

    const allStaffServices = await this.prisma.staffService.findMany({
      where: {
        staff: {
          businessId: this.businessId,
        },
      },
    });

    const orphanedServices = services.filter(
      service => !allStaffServices.some(ss => ss.serviceId === service.id)
    );

    if (orphanedServices.length > 0) {
      warnings.push({
        field: 'services',
        message: `${orphanedServices.length} active services have no assigned staff`,
        code: 'SERVICES_WITHOUT_STAFF',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
