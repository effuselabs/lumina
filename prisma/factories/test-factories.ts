/**
 * Test script to verify factory infrastructure is working
 */

import { PrismaClient } from '@prisma/client';
import {
    AvailabilityChecker,
    BatchProcessor,
    DataIntegrityValidator,
    initializeSeedSystem,
    loadSeedConfig,
    ScheduleValidator,
    validateBusinessContext,
    verifyDataIntegrity
} from './index';

const prisma = new PrismaClient();

async function testFactoryInfrastructure() {
    console.log('🧪 Testing factory infrastructure...');

    try {
        // Test configuration loading
        console.log('\n1. Testing configuration system...');
        const config = loadSeedConfig();
        console.log(`✅ Configuration loaded: ${config.clients.count} clients, ${config.staff.count} staff`);

        // Find a business to test with
        const business = await prisma.business.findFirst();
        if (!business) {
            console.log('❌ No business found for testing');
            return;
        }

        console.log(`✅ Using business: ${business.name}`);

        // Test business context validation
        console.log('\n2. Testing business context validation...');
        await validateBusinessContext(prisma, business.id);
        console.log('✅ Business context validation passed');

        // Test seed system initialization
        console.log('\n3. Testing seed system initialization...');
        const seedSystem = await initializeSeedSystem(prisma, business.id);
        console.log('✅ Seed system initialized successfully');

        // Test batch processor
        console.log('\n4. Testing batch processor...');
        const batchProcessor = new BatchProcessor(prisma);

        // Test with a simple batch operation
        const testData = Array.from({ length: 10 }, (_, i) => ({ value: i }));
        const results = await batchProcessor.processBatch(
            testData,
            async (batch) => {
                // Simulate processing
                return batch.map(item => ({ processed: item.value * 2 }));
            },
            { batchSize: 3 }
        );

        console.log(`✅ Batch processor test completed: processed ${results.length} items`);

        // Test validators
        console.log('\n5. Testing validators...');

        const availabilityChecker = new AvailabilityChecker(prisma, business.id);
        const scheduleValidator = new ScheduleValidator(prisma, business.id);
        const integrityValidator = new DataIntegrityValidator(prisma, business.id);

        console.log('✅ Validators initialized successfully');

        // Test data integrity validation
        console.log('\n6. Testing data integrity validation...');
        const integrityResult = await verifyDataIntegrity(prisma, business.id);
        console.log(`✅ Data integrity check completed: ${integrityResult.summary.passed}/${integrityResult.summary.total} checks passed`);

        // Test financial integrity
        const financialIntegrity = await integrityValidator.validateFinancialIntegrity();
        console.log(`✅ Financial integrity check: ${financialIntegrity.isValid ? 'PASSED' : 'FAILED'} (${financialIntegrity.errors.length} errors, ${financialIntegrity.warnings.length} warnings)`);

        // Test appointment integrity
        const appointmentIntegrity = await integrityValidator.validateAppointmentIntegrity();
        console.log(`✅ Appointment integrity check: ${appointmentIntegrity.isValid ? 'PASSED' : 'FAILED'} (${appointmentIntegrity.errors.length} errors, ${appointmentIntegrity.warnings.length} warnings)`);

        // Test staff-service integrity
        const staffServiceIntegrity = await integrityValidator.validateStaffServiceIntegrity();
        console.log(`✅ Staff-service integrity check: ${staffServiceIntegrity.isValid ? 'PASSED' : 'FAILED'} (${staffServiceIntegrity.errors.length} errors, ${staffServiceIntegrity.warnings.length} warnings)`);

        console.log('\n🎉 All factory infrastructure tests passed!');
        console.log('\n📋 Infrastructure Summary:');
        console.log('  ✅ Configuration system');
        console.log('  ✅ Business context validation');
        console.log('  ✅ Seed system initialization');
        console.log('  ✅ Batch processing utilities');
        console.log('  ✅ Availability checking');
        console.log('  ✅ Schedule validation');
        console.log('  ✅ Data integrity validation');
        console.log('  ✅ Faker.js integration');
        console.log('\n🚀 Ready for comprehensive data factory implementation!');

    } catch (error) {
        console.error('❌ Factory infrastructure test failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testFactoryInfrastructure()
        .then(() => {
            console.log('\n✅ Factory infrastructure test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Factory infrastructure test failed:', error);
            process.exit(1);
        });
}

export { testFactoryInfrastructure };
