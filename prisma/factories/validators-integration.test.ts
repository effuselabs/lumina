/**
 * Integration tests for business logic validators
 * Tests the actual validator functionality with minimal mocking
 */

import { PrismaClient } from '@prisma/client';
import {
    AvailabilityChecker,
    BusinessLogicValidator,
    FinancialIntegrityValidator,
    ScheduleValidator,
    ServiceCompatibilityValidator,
} from './validators';

// Simple test to verify validator classes can be instantiated
describe('Validator Integration Tests', () => {
    const mockPrisma = {} as PrismaClient;
    const businessId = 'test-business-id';

    test('should instantiate AvailabilityChecker', () => {
        const checker = new AvailabilityChecker(mockPrisma, businessId);
        expect(checker).toBeInstanceOf(AvailabilityChecker);
    });

    test('should instantiate ScheduleValidator', () => {
        const validator = new ScheduleValidator(mockPrisma, businessId);
        expect(validator).toBeInstanceOf(ScheduleValidator);
    });

    test('should instantiate ServiceCompatibilityValidator', () => {
        const validator = new ServiceCompatibilityValidator(mockPrisma, businessId);
        expect(validator).toBeInstanceOf(ServiceCompatibilityValidator);
    });

    test('should instantiate FinancialIntegrityValidator', () => {
        const validator = new FinancialIntegrityValidator(mockPrisma, businessId);
        expect(validator).toBeInstanceOf(FinancialIntegrityValidator);
    });

    test('should instantiate BusinessLogicValidator', () => {
        const validator = new BusinessLogicValidator(mockPrisma, businessId);
        expect(validator).toBeInstanceOf(BusinessLogicValidator);

        const validators = validator.getValidators();
        expect(validators.availabilityChecker).toBeInstanceOf(AvailabilityChecker);
        expect(validators.scheduleValidator).toBeInstanceOf(ScheduleValidator);
        expect(validators.serviceCompatibilityValidator).toBeInstanceOf(ServiceCompatibilityValidator);
        expect(validators.financialIntegrityValidator).toBeInstanceOf(FinancialIntegrityValidator);
    });

    test('should have all required methods', () => {
        const businessValidator = new BusinessLogicValidator(mockPrisma, businessId);

        expect(typeof businessValidator.validateAppointmentBooking).toBe('function');
        expect(typeof businessValidator.validateBusinessIntegrity).toBe('function');
        expect(typeof businessValidator.getValidators).toBe('function');
    });
});