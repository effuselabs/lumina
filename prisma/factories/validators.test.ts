/**
 * Tests for business logic validators and constraint checkers
 */

import { PrismaClient } from '@prisma/client';
import { AppointmentBookingData } from './types';
import {
    AvailabilityChecker,
    BusinessLogicValidator,
    FinancialIntegrityValidator,
    ServiceCompatibilityValidator
} from './validators';

// Mock Prisma Client for testing
const mockPrisma = {
    business: {
        findUnique: jest.fn(),
    },
    staff: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
    },
    service: {
        findMany: jest.fn(),
    },
    client: {
        findUnique: jest.fn(),
    },
    appointment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
    },
    staffService: {
        findMany: jest.fn(),
    },
    appointmentService: {
        findMany: jest.fn(),
    },
    transaction: {
        findMany: jest.fn(),
    },
} as unknown as PrismaClient;

const businessId = 'test-business-id';
const staffId = 'test-staff-id';
const clientId = 'test-client-id';
const serviceId = 'test-service-id';

describe('AvailabilityChecker', () => {
    let availabilityChecker: AvailabilityChecker;

    beforeEach(() => {
        availabilityChecker = new AvailabilityChecker(mockPrisma, businessId);
        jest.clearAllMocks();
    });

    describe('checkStaffAvailability', () => {
        it('should return false if staff not found', async () => {
            (mockPrisma.staff.findFirst as jest.Mock).mockResolvedValue(null);

            const result = await availabilityChecker.checkStaffAvailability(
                staffId,
                new Date('2025-01-15T10:00:00Z'),
                new Date('2025-01-15T11:00:00Z')
            );

            expect(result).toBe(false);
        });

        it('should return false if staff has conflicting appointment', async () => {
            (mockPrisma.staff.findFirst as jest.Mock).mockResolvedValue({
                id: staffId,
                businessId,
                isActive: true,
                workingHours: {
                    wednesday: {
                        isOpen: true,
                        openTime: '09:00',
                        closeTime: '17:00',
                    },
                },
            });

            (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([
                {
                    id: 'existing-appointment',
                    startTime: new Date('2025-01-15T10:30:00Z'),
                    endTime: new Date('2025-01-15T11:30:00Z'),
                },
            ]);

            const result = await availabilityChecker.checkStaffAvailability(
                staffId,
                new Date('2025-01-15T10:00:00Z'),
                new Date('2025-01-15T11:00:00Z')
            );

            expect(result).toBe(false);
        });

        it('should return true if staff is available', async () => {
            (mockPrisma.staff.findFirst as jest.Mock).mockResolvedValue({
                id: staffId,
                businessId,
                isActive: true,
                workingHours: {
                    wednesday: {
                        isOpen: true,
                        openTime: '09:00',
                        closeTime: '17:00',
                    },
                },
            });

            (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

            const result = await availabilityChecker.checkStaffAvailability(
                staffId,
                new Date('2025-01-15T10:00:00Z'),
                new Date('2025-01-15T11:00:00Z')
            );

            expect(result).toBe(true);
        });
    });

    describe('findAvailableSlots', () => {
        it('should return empty array if staff not found', async () => {
            (mockPrisma.staff.findFirst as jest.Mock).mockResolvedValue(null);

            const result = await availabilityChecker.findAvailableSlots(
                staffId,
                new Date('2025-01-15'),
                60
            );

            expect(result).toEqual([]);
        });

        it('should return available slots when staff has no appointments', async () => {
            (mockPrisma.staff.findFirst as jest.Mock).mockResolvedValue({
                id: staffId,
                businessId,
                isActive: true,
                workingHours: {
                    wednesday: {
                        isOpen: true,
                        openTime: '09:00',
                        closeTime: '12:00',
                    },
                },
            });

            (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
                id: businessId,
                operatingHours: null,
            });

            (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

            const result = await availabilityChecker.findAvailableSlots(
                staffId,
                new Date('2025-01-15'),
                60
            );

            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('startTime');
            expect(result[0]).toHaveProperty('endTime');
            expect(result[0]).toHaveProperty('available', true);
        });
    });
});

describe('ServiceCompatibilityValidator', () => {
    let serviceValidator: ServiceCompatibilityValidator;

    beforeEach(() => {
        serviceValidator = new ServiceCompatibilityValidator(mockPrisma, businessId);
        jest.clearAllMocks();
    });

    describe('validateStaffServiceCompatibility', () => {
        it('should return error if staff not found', async () => {
            (mockPrisma.staff.findFirst as jest.Mock).mockResolvedValue(null);

            const result = await serviceValidator.validateStaffServiceCompatibility(
                staffId,
                [serviceId]
            );

            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].code).toBe('STAFF_NOT_FOUND');
        });

        it('should return error if staff cannot perform service', async () => {
            (mockPrisma.staff.findFirst as jest.Mock).mockResolvedValue({
                id: staffId,
                businessId,
                isActive: true,
            });

            (mockPrisma.service.findMany as jest.Mock).mockResolvedValue([
                {
                    id: serviceId,
                    name: 'Test Service',
                    businessId,
                    isActive: true,
                    duration: 60,
                },
            ]);

            (mockPrisma.staffService.findMany as jest.Mock).mockResolvedValue([]);

            const result = await serviceValidator.validateStaffServiceCompatibility(
                staffId,
                [serviceId]
            );

            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].code).toBe('STAFF_CANNOT_PERFORM_SERVICE');
        });

        it('should return valid if staff can perform all services', async () => {
            (mockPrisma.staff.findFirst as jest.Mock).mockResolvedValue({
                id: staffId,
                businessId,
                isActive: true,
            });

            (mockPrisma.service.findMany as jest.Mock).mockResolvedValue([
                {
                    id: serviceId,
                    name: 'Test Service',
                    businessId,
                    isActive: true,
                    duration: 60,
                    category: 'Hair',
                },
            ]);

            (mockPrisma.staffService.findMany as jest.Mock).mockResolvedValue([
                {
                    staffId,
                    serviceId,
                    service: {
                        id: serviceId,
                        name: 'Test Service',
                    },
                },
            ]);

            const result = await serviceValidator.validateStaffServiceCompatibility(
                staffId,
                [serviceId]
            );

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });
});

describe('FinancialIntegrityValidator', () => {
    let financialValidator: FinancialIntegrityValidator;

    beforeEach(() => {
        financialValidator = new FinancialIntegrityValidator(mockPrisma, businessId);
        jest.clearAllMocks();
    });

    describe('validateTransactionAmounts', () => {
        it('should return error if appointment not found', async () => {
            (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await financialValidator.validateTransactionAmounts('invalid-id');

            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].code).toBe('APPOINTMENT_NOT_FOUND');
        });

        it('should return error if payment missing for completed appointment', async () => {
            (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
                id: 'appointment-id',
                status: 'COMPLETED',
                services: [
                    {
                        price: 50.00,
                        service: { id: serviceId, name: 'Test Service' },
                    },
                ],
                transactions: [],
            });

            const result = await financialValidator.validateTransactionAmounts('appointment-id');

            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].code).toBe('MISSING_PAYMENT');
        });

        it('should return valid if transaction amounts match', async () => {
            (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
                id: 'appointment-id',
                status: 'COMPLETED',
                services: [
                    {
                        price: 50.00,
                        service: { id: serviceId, name: 'Test Service' },
                    },
                ],
                transactions: [
                    {
                        type: 'PAYMENT',
                        status: 'COMPLETED',
                        amount: 50.00,
                    },
                ],
            });

            const result = await financialValidator.validateTransactionAmounts('appointment-id');

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });
});

describe('BusinessLogicValidator', () => {
    let businessValidator: BusinessLogicValidator;

    beforeEach(() => {
        businessValidator = new BusinessLogicValidator(mockPrisma, businessId);
        jest.clearAllMocks();
    });

    describe('validateAppointmentBooking', () => {
        const appointmentData: AppointmentBookingData = {
            clientId,
            staffId,
            serviceIds: [serviceId],
            startTime: new Date('2025-01-15T10:00:00Z'),
            endTime: new Date('2025-01-15T11:00:00Z'),
        };

        it('should validate appointment booking comprehensively', async () => {
            // Mock all required data for successful validation
            (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
                id: businessId,
                operatingHours: {
                    wednesday: {
                        isOpen: true,
                        openTime: '09:00',
                        closeTime: '17:00',
                    },
                },
            });

            (mockPrisma.client.findUnique as jest.Mock).mockResolvedValue({
                id: clientId,
                businessId,
            });

            (mockPrisma.staff.findFirst as jest.Mock).mockResolvedValue({
                id: staffId,
                businessId,
                isActive: true,
                workingHours: {
                    wednesday: {
                        isOpen: true,
                        openTime: '09:00',
                        closeTime: '17:00',
                    },
                },
            });

            (mockPrisma.service.findMany as jest.Mock).mockResolvedValue([
                {
                    id: serviceId,
                    name: 'Test Service',
                    businessId,
                    isActive: true,
                    duration: 60,
                    category: 'Hair',
                },
            ]);

            (mockPrisma.staffService.findMany as jest.Mock).mockResolvedValue([
                {
                    staffId,
                    serviceId,
                    service: {
                        id: serviceId,
                        name: 'Test Service',
                    },
                },
            ]);

            (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

            const result = await businessValidator.validateAppointmentBooking(appointmentData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return errors for invalid appointment booking', async () => {
            // Mock data that will cause validation failures
            (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await businessValidator.validateAppointmentBooking(appointmentData);

            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
});

describe('Integration Tests', () => {
    it('should handle real-world appointment validation scenario', async () => {
        const businessValidator = new BusinessLogicValidator(mockPrisma, businessId);

        // Mock a realistic scenario
        (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
            id: businessId,
            name: 'Test Salon',
            operatingHours: {
                wednesday: {
                    isOpen: true,
                    openTime: '09:00',
                    closeTime: '18:00',
                },
            },
        });

        (mockPrisma.client.findUnique as jest.Mock).mockResolvedValue({
            id: clientId,
            businessId,
            firstName: 'John',
            lastName: 'Doe',
        });

        (mockPrisma.staff.findFirst as jest.Mock).mockResolvedValue({
            id: staffId,
            businessId,
            isActive: true,
            displayName: 'Jane Smith',
            workingHours: {
                wednesday: {
                    isOpen: true,
                    openTime: '09:00',
                    closeTime: '17:00',
                },
            },
        });

        (mockPrisma.service.findMany as jest.Mock).mockResolvedValue([
            {
                id: serviceId,
                name: 'Haircut',
                businessId,
                isActive: true,
                duration: 60,
                price: 50.00,
                category: 'Hair',
            },
        ]);

        (mockPrisma.staffService.findMany as jest.Mock).mockResolvedValue([
            {
                staffId,
                serviceId,
                service: {
                    id: serviceId,
                    name: 'Haircut',
                },
            },
        ]);

        (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

        const appointmentData: AppointmentBookingData = {
            clientId,
            staffId,
            serviceIds: [serviceId],
            startTime: new Date('2025-01-15T10:00:00Z'),
            endTime: new Date('2025-01-15T11:00:00Z'),
        };

        const result = await businessValidator.validateAppointmentBooking(appointmentData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });
});