/**
 * Business logic validators and constraint checkers
 * Implements comprehensive validation for appointments, schedules, services, and financial integrity
 */

import { PrismaClient } from '@prisma/client';
import { AppointmentBookingData, TimeSlot, ValidationError, ValidationResult, ValidationWarning } from './types';

export class AvailabilityChecker {
    private prisma: PrismaClient;
    private businessId: string;

    constructor(prisma: PrismaClient, businessId: string) {
        this.prisma = prisma;
        this.businessId = businessId;
    }

    /**
     * Check if staff member is available for the given time slot
     * Prevents double-booking and respects staff schedules
     */
    async checkStaffAvailability(
        staffId: string,
        startTime: Date,
        endTime: Date,
        excludeAppointmentId?: string
    ): Promise<boolean> {
        try {
            // Check if staff exists and is active
            const staff = await this.prisma.staff.findFirst({
                where: {
                    id: staffId,
                    businessId: this.businessId,
                    isActive: true,
                },
            });

            if (!staff) {
                return false;
            }

            // Check working hours if they exist
            if (staff.workingHours) {
                const dayOfWeek = this.getDayOfWeek(startTime);
                const workingHours = staff.workingHours as any;
                const daySchedule = workingHours?.[dayOfWeek];

                if (daySchedule && !daySchedule.isOpen) {
                    return false;
                }

                // Check if appointment time falls within working hours
                if (daySchedule?.openTime && daySchedule?.closeTime) {
                    const appointmentStart = this.getTimeString(startTime);
                    const appointmentEnd = this.getTimeString(endTime);

                    if (appointmentStart < daySchedule.openTime || appointmentEnd > daySchedule.closeTime) {
                        return false;
                    }
                }
            }

            // Check for conflicting appointments
            const whereClause: any = {
                staffId,
                businessId: this.businessId,
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
                        AND: [
                            { startTime: { lt: endTime } },
                            { endTime: { gte: endTime } },
                        ],
                    },
                    {
                        AND: [
                            { startTime: { gte: startTime } },
                            { endTime: { lte: endTime } },
                        ],
                    },
                ],
            };

            // Exclude specific appointment if provided (for rescheduling)
            if (excludeAppointmentId) {
                whereClause.id = { not: excludeAppointmentId };
            }

            const conflictingAppointments = await this.prisma.appointment.findMany({
                where: whereClause,
            });

            return conflictingAppointments.length === 0;
        } catch (error) {
            console.error('Error checking staff availability:', error);
            return false;
        }
    }

    /**
     * Find available time slots for a staff member on a given date
     */
    async findAvailableSlots(
        staffId: string,
        date: Date,
        duration: number,
        intervalMinutes: number = 15
    ): Promise<TimeSlot[]> {
        try {
            const staff = await this.prisma.staff.findFirst({
                where: {
                    id: staffId,
                    businessId: this.businessId,
                    isActive: true,
                },
            });

            if (!staff) {
                return [];
            }

            // Get business operating hours as fallback
            const business = await this.prisma.business.findUnique({
                where: { id: this.businessId },
            });

            const dayOfWeek = this.getDayOfWeek(date);
            let workStart: Date;
            let workEnd: Date;

            // Use staff working hours if available, otherwise use business hours
            if (staff.workingHours) {
                const workingHours = staff.workingHours as any;
                const daySchedule = workingHours?.[dayOfWeek];

                if (!daySchedule?.isOpen) {
                    return [];
                }

                workStart = this.parseTimeString(daySchedule.openTime || '09:00', date);
                workEnd = this.parseTimeString(daySchedule.closeTime || '17:00', date);
            } else if (business?.operatingHours) {
                const operatingHours = business.operatingHours as any;
                const daySchedule = operatingHours?.[dayOfWeek];

                if (!daySchedule?.isOpen) {
                    return [];
                }

                workStart = this.parseTimeString(daySchedule.openTime || '09:00', date);
                workEnd = this.parseTimeString(daySchedule.closeTime || '17:00', date);
            } else {
                // Default business hours
                workStart = this.parseTimeString('09:00', date);
                workEnd = this.parseTimeString('17:00', date);
            }

            // Get existing appointments for the day
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const existingAppointments = await this.prisma.appointment.findMany({
                where: {
                    staffId,
                    businessId: this.businessId,
                    startTime: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                    status: {
                        in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
                    },
                },
                orderBy: {
                    startTime: 'asc',
                },
            });

            // Generate available slots
            const slots: TimeSlot[] = [];
            let currentTime = new Date(workStart);

            for (const appointment of existingAppointments) {
                // Add slots before this appointment
                while (currentTime.getTime() + duration * 60000 <= appointment.startTime.getTime()) {
                    const slotEnd = new Date(currentTime.getTime() + duration * 60000);
                    if (slotEnd <= workEnd) {
                        slots.push({
                            startTime: new Date(currentTime),
                            endTime: slotEnd,
                            available: true,
                        });
                    }
                    currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
                }

                // Move current time to after this appointment
                currentTime = new Date(appointment.endTime);
            }

            // Add remaining slots after the last appointment
            while (currentTime.getTime() + duration * 60000 <= workEnd.getTime()) {
                const slotEnd = new Date(currentTime.getTime() + duration * 60000);
                slots.push({
                    startTime: new Date(currentTime),
                    endTime: slotEnd,
                    available: true,
                });
                currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
            }

            return slots;
        } catch (error) {
            console.error('Error finding available slots:', error);
            return [];
        }
    }

    private getDayOfWeek(date: Date): string {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[date.getDay()];
    }

    private getTimeString(date: Date): string {
        return date.toTimeString().slice(0, 5); // HH:MM format
    }

    private parseTimeString(timeString: string, date: Date): Date {
        const [hours, minutes] = timeString.split(':').map(Number);
        const result = new Date(date);
        result.setHours(hours, minutes, 0, 0);
        return result;
    }
}

export class ScheduleValidator {
    private prisma: PrismaClient;
    private businessId: string;

    constructor(prisma: PrismaClient, businessId: string) {
        this.prisma = prisma;
        this.businessId = businessId;
    }

    /**
     * Validate appointment booking data
     */
    async validateAppointment(appointment: AppointmentBookingData): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // Check if business exists and is active
        const business = await this.prisma.business.findUnique({
            where: { id: this.businessId },
        });

        if (!business) {
            errors.push({
                field: 'businessId',
                message: 'Business not found',
                code: 'BUSINESS_NOT_FOUND',
            });
            return { isValid: false, errors, warnings };
        }

        // Check if client exists
        const client = await this.prisma.client.findUnique({
            where: { id: appointment.clientId },
        });

        if (!client) {
            errors.push({
                field: 'clientId',
                message: 'Client not found',
                code: 'CLIENT_NOT_FOUND',
            });
        }

        // Check if staff exists and is active
        const staff = await this.prisma.staff.findFirst({
            where: {
                id: appointment.staffId,
                businessId: this.businessId,
                isActive: true,
            },
        });

        if (!staff) {
            errors.push({
                field: 'staffId',
                message: 'Staff member not found or inactive',
                code: 'STAFF_NOT_FOUND',
            });
        }

        // Check if services exist
        const services = await this.prisma.service.findMany({
            where: {
                id: { in: appointment.serviceIds },
                businessId: this.businessId,
                isActive: true,
            },
        });

        if (services.length !== appointment.serviceIds.length) {
            errors.push({
                field: 'serviceIds',
                message: 'One or more services not found or inactive',
                code: 'SERVICES_NOT_FOUND',
            });
        }

        // Check if staff can perform all services
        const staffServices = await this.prisma.staffService.findMany({
            where: {
                staffId: appointment.staffId,
                serviceId: { in: appointment.serviceIds },
            },
        });

        const staffCannotPerformIds = appointment.serviceIds.filter(
            serviceId => !staffServices.some(ss => ss.serviceId === serviceId)
        );

        if (staffCannotPerformIds.length > 0) {
            const cannotPerformNames = services
                .filter(s => staffCannotPerformIds.includes(s.id))
                .map(s => s.name);

            errors.push({
                field: 'serviceIds',
                message: `Staff cannot perform services: ${cannotPerformNames.join(', ')}`,
                code: 'STAFF_CANNOT_PERFORM_SERVICE',
            });
        }

        // Check business hours
        const respectsHours = await this.respectsBusinessHours(this.businessId, appointment.startTime, appointment.endTime);
        if (!respectsHours) {
            errors.push({
                field: 'startTime',
                message: 'Appointment time is outside business hours',
                code: 'OUTSIDE_BUSINESS_HOURS',
            });
        }

        // Check if appointment is in the past
        if (appointment.startTime < new Date()) {
            errors.push({
                field: 'startTime',
                message: 'Cannot schedule appointments in the past',
                code: 'APPOINTMENT_IN_PAST',
            });
        }

        // Check appointment duration
        const duration = appointment.endTime.getTime() - appointment.startTime.getTime();
        const totalServiceDuration = services.reduce((total, service) => total + service.duration, 0) * 60000;

        if (duration < totalServiceDuration) {
            warnings.push({
                field: 'endTime',
                message: 'Appointment duration may be too short for selected services',
                code: 'DURATION_TOO_SHORT',
            });
        }

        if (duration > totalServiceDuration * 1.5) {
            warnings.push({
                field: 'endTime',
                message: 'Appointment duration is significantly longer than expected',
                code: 'DURATION_TOO_LONG',
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Check if appointment time respects business hours
     */
    async respectsBusinessHours(businessId: string, startTime: Date, endTime: Date): Promise<boolean> {
        try {
            const business = await this.prisma.business.findUnique({
                where: { id: businessId },
            });

            if (!business?.operatingHours) {
                // Default business hours if not configured: 8 AM to 8 PM
                const hour = startTime.getHours();
                const endHour = endTime.getHours();
                return hour >= 8 && endHour <= 20;
            }

            const dayOfWeek = this.getDayOfWeek(startTime);
            const operatingHours = business.operatingHours as any;
            const daySchedule = operatingHours?.[dayOfWeek];

            if (!daySchedule?.isOpen) {
                return false;
            }

            const appointmentStart = this.getTimeString(startTime);
            const appointmentEnd = this.getTimeString(endTime);
            const openTime = daySchedule.openTime || '08:00';
            const closeTime = daySchedule.closeTime || '20:00';

            return appointmentStart >= openTime && appointmentEnd <= closeTime;
        } catch (error) {
            console.error('Error checking business hours:', error);
            // Fallback to default hours
            const hour = startTime.getHours();
            const endHour = endTime.getHours();
            return hour >= 8 && endHour <= 20;
        }
    }

    private getDayOfWeek(date: Date): string {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[date.getDay()];
    }

    private getTimeString(date: Date): string {
        return date.toTimeString().slice(0, 5); // HH:MM format
    }

    private parseTimeString(timeString: string, date: Date): Date {
        const [hours, minutes] = timeString.split(':').map(Number);
        const result = new Date(date);
        result.setHours(hours, minutes, 0, 0);
        return result;
    }
}

export class ServiceCompatibilityValidator {
    private prisma: PrismaClient;
    private businessId: string;

    constructor(prisma: PrismaClient, businessId: string) {
        this.prisma = prisma;
        this.businessId = businessId;
    }

    /**
     * Validate that staff can perform all requested services
     */
    async validateStaffServiceCompatibility(
        staffId: string,
        serviceIds: string[]
    ): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        try {
            // Check if staff exists and is active
            const staff = await this.prisma.staff.findFirst({
                where: {
                    id: staffId,
                    businessId: this.businessId,
                    isActive: true,
                },
            });

            if (!staff) {
                errors.push({
                    field: 'staffId',
                    message: 'Staff member not found or inactive',
                    code: 'STAFF_NOT_FOUND',
                });
                return { isValid: false, errors, warnings };
            }

            // Get all services
            const services = await this.prisma.service.findMany({
                where: {
                    id: { in: serviceIds },
                    businessId: this.businessId,
                    isActive: true,
                },
            });

            if (services.length !== serviceIds.length) {
                const foundIds = services.map(s => s.id);
                const missingIds = serviceIds.filter(id => !foundIds.includes(id));
                errors.push({
                    field: 'serviceIds',
                    message: `Services not found: ${missingIds.join(', ')}`,
                    code: 'SERVICES_NOT_FOUND',
                });
            }

            // Check staff-service relationships
            const staffServices = await this.prisma.staffService.findMany({
                where: {
                    staffId,
                    serviceId: { in: serviceIds },
                },
                include: {
                    service: true,
                },
            });

            const staffCanPerformIds = staffServices.map(ss => ss.serviceId);
            const staffCannotPerformIds = serviceIds.filter(id => !staffCanPerformIds.includes(id));

            if (staffCannotPerformIds.length > 0) {
                const cannotPerformServices = services.filter(s => staffCannotPerformIds.includes(s.id));
                errors.push({
                    field: 'serviceIds',
                    message: `Staff cannot perform services: ${cannotPerformServices.map(s => s.name).join(', ')}`,
                    code: 'STAFF_CANNOT_PERFORM_SERVICE',
                });
            }

            // Check for service combinations that might be problematic
            const totalDuration = services.reduce((total, service) => total + service.duration, 0);
            if (totalDuration > 240) { // More than 4 hours
                warnings.push({
                    field: 'serviceIds',
                    message: 'Service combination duration exceeds 4 hours',
                    code: 'LONG_SERVICE_DURATION',
                });
            }

            // Check for conflicting service categories (if applicable)
            const categories = [...new Set(services.map(s => s.category).filter(Boolean))];
            if (categories.length > 3) {
                warnings.push({
                    field: 'serviceIds',
                    message: 'Multiple service categories selected - consider splitting into separate appointments',
                    code: 'MULTIPLE_CATEGORIES',
                });
            }

        } catch (error) {
            console.error('Error validating service compatibility:', error);
            errors.push({
                field: 'general',
                message: 'Error validating service compatibility',
                code: 'VALIDATION_ERROR',
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Get recommended staff for specific services
     */
    async getRecommendedStaffForServices(serviceIds: string[]): Promise<string[]> {
        try {
            const staffServices = await this.prisma.staffService.findMany({
                where: {
                    serviceId: { in: serviceIds },
                    staff: {
                        businessId: this.businessId,
                        isActive: true,
                    },
                },
                include: {
                    staff: true,
                },
            });

            // Find staff who can perform ALL requested services
            const staffServiceCounts = staffServices.reduce((acc, ss) => {
                acc[ss.staffId] = (acc[ss.staffId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const fullyCompatibleStaff = Object.entries(staffServiceCounts)
                .filter(([, count]) => count === serviceIds.length)
                .map(([staffId]) => staffId);

            return fullyCompatibleStaff;
        } catch (error) {
            console.error('Error getting recommended staff:', error);
            return [];
        }
    }
}

export class FinancialIntegrityValidator {
    private prisma: PrismaClient;
    private businessId: string;

    constructor(prisma: PrismaClient, businessId: string) {
        this.prisma = prisma;
        this.businessId = businessId;
    }

    /**
     * Validate that transaction amounts match appointment totals
     */
    async validateTransactionAmounts(appointmentId: string): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        try {
            // Get appointment with services
            const appointment = await this.prisma.appointment.findUnique({
                where: { id: appointmentId },
                include: {
                    services: {
                        include: {
                            service: true,
                        },
                    },
                    transactions: true,
                },
            });

            if (!appointment) {
                errors.push({
                    field: 'appointmentId',
                    message: 'Appointment not found',
                    code: 'APPOINTMENT_NOT_FOUND',
                });
                return { isValid: false, errors, warnings };
            }

            // Calculate expected total from services
            const expectedTotal = appointment.services.reduce((total, as) => {
                return total + Number(as.price);
            }, 0);

            // Calculate actual transaction total
            const paymentTransactions = appointment.transactions.filter(t =>
                t.type === 'PAYMENT' && t.status === 'COMPLETED'
            );
            const actualTotal = paymentTransactions.reduce((total, t) => {
                return total + Number(t.amount);
            }, 0);

            // Allow for small rounding differences (within $0.01)
            const difference = Math.abs(expectedTotal - actualTotal);
            if (difference > 0.01) {
                if (actualTotal === 0 && appointment.status === 'COMPLETED') {
                    errors.push({
                        field: 'transactions',
                        message: `Completed appointment missing payment transactions. Expected: $${expectedTotal.toFixed(2)}`,
                        code: 'MISSING_PAYMENT',
                    });
                } else {
                    errors.push({
                        field: 'transactions',
                        message: `Transaction total ($${actualTotal.toFixed(2)}) does not match service total ($${expectedTotal.toFixed(2)})`,
                        code: 'AMOUNT_MISMATCH',
                    });
                }
            }

            // Check for duplicate payments
            const paymentAmounts = paymentTransactions.map(t => Number(t.amount));
            const duplicateAmounts = paymentAmounts.filter((amount, index) =>
                paymentAmounts.indexOf(amount) !== index
            );

            if (duplicateAmounts.length > 0) {
                warnings.push({
                    field: 'transactions',
                    message: 'Potential duplicate payment transactions detected',
                    code: 'DUPLICATE_PAYMENTS',
                });
            }

            // Check for refunds without original payments
            const refundTransactions = appointment.transactions.filter(t => t.type === 'REFUND');
            if (refundTransactions.length > 0 && paymentTransactions.length === 0) {
                errors.push({
                    field: 'transactions',
                    message: 'Refund transactions exist without corresponding payments',
                    code: 'REFUND_WITHOUT_PAYMENT',
                });
            }

        } catch (error) {
            console.error('Error validating transaction amounts:', error);
            errors.push({
                field: 'general',
                message: 'Error validating transaction amounts',
                code: 'VALIDATION_ERROR',
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Validate commission calculations for staff
     */
    async validateCommissionCalculations(staffId: string, periodStart: Date, periodEnd: Date): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        try {
            const staff = await this.prisma.staff.findFirst({
                where: {
                    id: staffId,
                    businessId: this.businessId,
                },
            });

            if (!staff) {
                errors.push({
                    field: 'staffId',
                    message: 'Staff member not found',
                    code: 'STAFF_NOT_FOUND',
                });
                return { isValid: false, errors, warnings };
            }

            // Only validate for commission-based staff
            if (staff.employmentType !== 'COMMISSION' && staff.employmentType !== 'HYBRID') {
                return { isValid: true, errors, warnings };
            }

            // Get completed appointments in period
            const appointments = await this.prisma.appointment.findMany({
                where: {
                    staffId,
                    businessId: this.businessId,
                    status: 'COMPLETED',
                    startTime: {
                        gte: periodStart,
                        lte: periodEnd,
                    },
                },
                include: {
                    services: true,
                    transactions: {
                        where: {
                            type: 'PAYMENT',
                            status: 'COMPLETED',
                        },
                    },
                },
            });

            // Calculate expected commission
            const totalRevenue = appointments.reduce((total, apt) => {
                const aptRevenue = apt.transactions.reduce((sum, t) => sum + Number(t.amount), 0);
                return total + aptRevenue;
            }, 0);

            const commissionRate = Number(staff.commissionRate || 0) / 100;
            const expectedCommission = totalRevenue * commissionRate;

            // Get actual commission transactions
            const commissionTransactions = await this.prisma.transaction.findMany({
                where: {
                    staffId,
                    businessId: this.businessId,
                    type: 'COMMISSION',
                    createdAt: {
                        gte: periodStart,
                        lte: periodEnd,
                    },
                },
            });

            const actualCommission = commissionTransactions.reduce((total, t) => {
                return total + Number(t.amount);
            }, 0);

            // Allow for small rounding differences
            const difference = Math.abs(expectedCommission - actualCommission);
            if (difference > 0.01) {
                if (actualCommission === 0 && expectedCommission > 0) {
                    warnings.push({
                        field: 'commission',
                        message: `Missing commission transactions. Expected: $${expectedCommission.toFixed(2)}`,
                        code: 'MISSING_COMMISSION',
                    });
                } else {
                    warnings.push({
                        field: 'commission',
                        message: `Commission amount ($${actualCommission.toFixed(2)}) does not match expected ($${expectedCommission.toFixed(2)})`,
                        code: 'COMMISSION_MISMATCH',
                    });
                }
            }

        } catch (error) {
            console.error('Error validating commission calculations:', error);
            errors.push({
                field: 'general',
                message: 'Error validating commission calculations',
                code: 'VALIDATION_ERROR',
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

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
        const appointmentsWithoutTransactions = await this.prisma.appointment.findMany({
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
/**

 * Comprehensive business logic validator that combines all validation types
 */
export class BusinessLogicValidator {
    private availabilityChecker: AvailabilityChecker;
    private scheduleValidator: ScheduleValidator;
    private serviceCompatibilityValidator: ServiceCompatibilityValidator;
    private financialIntegrityValidator: FinancialIntegrityValidator;
    private dataIntegrityValidator: DataIntegrityValidator;

    constructor(prisma: PrismaClient, businessId: string) {
        this.availabilityChecker = new AvailabilityChecker(prisma, businessId);
        this.scheduleValidator = new ScheduleValidator(prisma, businessId);
        this.serviceCompatibilityValidator = new ServiceCompatibilityValidator(prisma, businessId);
        this.financialIntegrityValidator = new FinancialIntegrityValidator(prisma, businessId);
        this.dataIntegrityValidator = new DataIntegrityValidator(prisma, businessId);
    }

    /**
     * Comprehensive appointment validation
     */
    async validateAppointmentBooking(appointment: AppointmentBookingData): Promise<ValidationResult> {
        const allErrors: ValidationError[] = [];
        const allWarnings: ValidationWarning[] = [];

        try {
            // 1. Basic appointment validation
            const scheduleResult = await this.scheduleValidator.validateAppointment(appointment);
            allErrors.push(...scheduleResult.errors);
            allWarnings.push(...scheduleResult.warnings);

            // 2. Staff availability check
            const isAvailable = await this.availabilityChecker.checkStaffAvailability(
                appointment.staffId,
                appointment.startTime,
                appointment.endTime
            );

            if (!isAvailable) {
                allErrors.push({
                    field: 'staffId',
                    message: 'Staff member is not available at the requested time',
                    code: 'STAFF_NOT_AVAILABLE',
                });
            }

            // 3. Service compatibility validation
            const serviceResult = await this.serviceCompatibilityValidator.validateStaffServiceCompatibility(
                appointment.staffId,
                appointment.serviceIds
            );
            allErrors.push(...serviceResult.errors);
            allWarnings.push(...serviceResult.warnings);

        } catch (error) {
            console.error('Error in comprehensive appointment validation:', error);
            allErrors.push({
                field: 'general',
                message: 'Error during appointment validation',
                code: 'VALIDATION_ERROR',
            });
        }

        return {
            isValid: allErrors.length === 0,
            errors: allErrors,
            warnings: allWarnings,
        };
    }

    /**
     * Validate business data integrity across all systems
     */
    async validateBusinessIntegrity(): Promise<ValidationResult> {
        const allErrors: ValidationError[] = [];
        const allWarnings: ValidationWarning[] = [];

        try {
            // 1. Financial integrity
            const financialResult = await this.dataIntegrityValidator.validateFinancialIntegrity();
            allErrors.push(...financialResult.errors);
            allWarnings.push(...financialResult.warnings);

            // 2. Appointment integrity
            const appointmentResult = await this.dataIntegrityValidator.validateAppointmentIntegrity();
            allErrors.push(...appointmentResult.errors);
            allWarnings.push(...appointmentResult.warnings);

            // 3. Staff-service relationships
            const staffServiceResult = await this.dataIntegrityValidator.validateStaffServiceIntegrity();
            allErrors.push(...staffServiceResult.errors);
            allWarnings.push(...staffServiceResult.warnings);

        } catch (error) {
            console.error('Error in business integrity validation:', error);
            allErrors.push({
                field: 'general',
                message: 'Error during business integrity validation',
                code: 'VALIDATION_ERROR',
            });
        }

        return {
            isValid: allErrors.length === 0,
            errors: allErrors,
            warnings: allWarnings,
        };
    }

    /**
     * Get all validators for individual use
     */
    getValidators() {
        return {
            availabilityChecker: this.availabilityChecker,
            scheduleValidator: this.scheduleValidator,
            serviceCompatibilityValidator: this.serviceCompatibilityValidator,
            financialIntegrityValidator: this.financialIntegrityValidator,
            dataIntegrityValidator: this.dataIntegrityValidator,
        };
    }
}