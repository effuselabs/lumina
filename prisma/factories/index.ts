/**
 * Main factory exports and initialization
 */

export * from './base-factory';
export * from './batch-processor';
export * from './performance-monitor';
export * from './seed-config';
export * from './types';
export * from './validators';

// Export specific validator classes
export {
    AvailabilityChecker, BusinessLogicValidator, DataIntegrityValidator, FinancialIntegrityValidator, ScheduleValidator,
    ServiceCompatibilityValidator
} from './validators';

// Factory classes will be exported here as they are created
export { AppointmentFactory } from './appointment-factory';
export { ClientFactory } from './client-factory';
export { ServiceFactory } from './service-factory';
export { StaffFactory } from './staff-factory';
export { TransactionFactory } from './transaction-factory';

// Business Operations Factories
export { BusinessOperationsFactory } from './business-operations-factory';
export { GiftCardFactory } from './gift-card-factory';
export { LoyaltyProgramFactory } from './loyalty-program-factory';
export { MarketingCampaignFactory } from './marketing-campaign-factory';
export { ProductFactory } from './product-factory';
export { PromotionFactory } from './promotion-factory';

// Communication and Loyalty Factories
export { ClientCommunicationFactory } from './client-communication-factory';
export { ComprehensiveCommunicationFactory } from './comprehensive-communication-factory';

import { PrismaClient } from '@prisma/client';
import { BatchProcessor } from './batch-processor';
import { PerformanceMonitor } from './performance-monitor';
import { loadSeedConfig, validateSeedConfig } from './seed-config';

/**
 * Initialize the seed system with configuration validation
 */
export async function initializeSeedSystem(prisma: PrismaClient, businessId: string) {
    console.log('🔧 Initializing enhanced seed system...');

    // Load and validate configuration
    const config = loadSeedConfig();
    const validation = validateSeedConfig(config);

    if (!validation.isValid) {
        console.error('❌ Seed configuration validation failed:');
        validation.errors.forEach(error => console.error(`  - ${error}`));
        throw new Error('Invalid seed configuration');
    }

    console.log('✅ Seed configuration validated');

    // Initialize enhanced batch processor with performance monitoring
    const batchProcessor = new BatchProcessor(prisma, {
        batchSize: 50,
        maxConcurrency: 5,
        enableMemoryMonitoring: true,
        memoryThresholdMB: 512,
        enableProgressLogging: true,
        logInterval: 10,
        enableRollback: true,
        rollbackOnError: false, // Continue processing despite errors
        progressCallback: (processed, total) => {
            if (total > 0) {
                const percentage = Math.round((processed / total) * 100);
                console.log(`  Progress: ${processed}/${total} (${percentage}%)`);
            } else {
                console.log(`  Processed: ${processed} items`);
            }
        },
    });

    // Initialize performance monitor
    const performanceMonitor = new PerformanceMonitor();

    console.log('✅ Enhanced batch processor and performance monitor initialized');

    return {
        config,
        batchProcessor,
        performanceMonitor,
        // Factories will be initialized here as they are created
        // clientFactory: new ClientFactory(prisma, businessId),
        // staffFactory: new StaffFactory(prisma, businessId),
        // serviceFactory: new ServiceFactory(prisma, businessId),
        // appointmentFactory: new AppointmentFactory(prisma, businessId),
        // transactionFactory: new TransactionFactory(prisma, businessId),
    };
}

/**
 * Validate business context before seeding
 */
export async function validateBusinessContext(prisma: PrismaClient, businessId: string) {
    console.log('🔍 Validating business context...');

    const business = await prisma.business.findUnique({
        where: { id: businessId },
    });

    if (!business) {
        throw new Error(`Business with ID ${businessId} not found`);
    }

    console.log(`✅ Business context validated: ${business.name} (${business.slug})`);
    return business;
}

/**
 * Clean existing seed data for fresh start
 */
export async function cleanExistingSeedData(
    prisma: PrismaClient,
    businessId: string,
    options: { preserveUsers?: boolean; preserveBusiness?: boolean } = {}
) {
    console.log('🧹 Cleaning existing seed data...');

    const startTime = Date.now();

    try {
        await prisma.$transaction(async (tx) => {
            // Delete in reverse dependency order to maintain referential integrity

            // 1. Delete business operations data first

            // Delete loyalty transactions
            const loyaltyTransactionsDeleted = await tx.loyaltyTransaction.deleteMany({
                where: {
                    membership: {
                        loyaltyProgram: {
                            businessId,
                        },
                    },
                },
            });
            console.log(`  Deleted ${loyaltyTransactionsDeleted.count} loyalty transactions`);

            // Delete loyalty memberships
            const loyaltyMembershipsDeleted = await tx.loyaltyMembership.deleteMany({
                where: {
                    loyaltyProgram: {
                        businessId,
                    },
                },
            });
            console.log(`  Deleted ${loyaltyMembershipsDeleted.count} loyalty memberships`);

            // Delete loyalty programs
            const loyaltyProgramsDeleted = await tx.loyaltyProgram.deleteMany({
                where: { businessId },
            });
            console.log(`  Deleted ${loyaltyProgramsDeleted.count} loyalty programs`);

            // Delete campaign recipients
            const campaignRecipientsDeleted = await tx.campaignRecipient.deleteMany({
                where: {
                    campaign: {
                        businessId,
                    },
                },
            });
            console.log(`  Deleted ${campaignRecipientsDeleted.count} campaign recipients`);

            // Delete marketing campaigns
            const marketingCampaignsDeleted = await tx.marketingCampaign.deleteMany({
                where: { businessId },
            });
            console.log(`  Deleted ${marketingCampaignsDeleted.count} marketing campaigns`);

            // Delete promotion usage
            const promotionUsageDeleted = await tx.promotionUsage.deleteMany({
                where: {
                    promotion: {
                        businessId,
                    },
                },
            });
            console.log(`  Deleted ${promotionUsageDeleted.count} promotion usage records`);

            // Delete promotions
            const promotionsDeleted = await tx.promotion.deleteMany({
                where: { businessId },
            });
            console.log(`  Deleted ${promotionsDeleted.count} promotions`);

            // Delete gift card redemptions
            const giftCardRedemptionsDeleted = await tx.giftCardRedemption.deleteMany({
                where: {
                    giftCard: {
                        businessId,
                    },
                },
            });
            console.log(`  Deleted ${giftCardRedemptionsDeleted.count} gift card redemptions`);

            // Delete gift cards
            const giftCardsDeleted = await tx.giftCard.deleteMany({
                where: { businessId },
            });
            console.log(`  Deleted ${giftCardsDeleted.count} gift cards`);

            // Delete product sales
            const productSalesDeleted = await tx.productSale.deleteMany({
                where: { businessId },
            });
            console.log(`  Deleted ${productSalesDeleted.count} product sales`);

            // Delete products
            const productsDeleted = await tx.product.deleteMany({
                where: { businessId },
            });
            console.log(`  Deleted ${productsDeleted.count} products`);

            // 2. Delete appointment services
            const appointmentServicesDeleted = await tx.appointmentService.deleteMany({
                where: {
                    appointment: {
                        businessId,
                    },
                },
            });
            console.log(`  Deleted ${appointmentServicesDeleted.count} appointment services`);

            // 3. Delete transactions
            const transactionsDeleted = await tx.transaction.deleteMany({
                where: { businessId },
            });
            console.log(`  Deleted ${transactionsDeleted.count} transactions`);

            // 4. Delete appointments
            const appointmentsDeleted = await tx.appointment.deleteMany({
                where: { businessId },
            });
            console.log(`  Deleted ${appointmentsDeleted.count} appointments`);

            // 5. Delete staff services
            const staffServicesDeleted = await tx.staffService.deleteMany({
                where: {
                    staff: {
                        businessId,
                    },
                },
            });
            console.log(`  Deleted ${staffServicesDeleted.count} staff services`);

            // 6. Delete services
            const servicesDeleted = await tx.service.deleteMany({
                where: { businessId },
            });
            console.log(`  Deleted ${servicesDeleted.count} services`);

            // 7. Delete staff
            const staffDeleted = await tx.staff.deleteMany({
                where: { businessId },
            });
            console.log(`  Deleted ${staffDeleted.count} staff members`);

            // 8. Delete clients
            const clientsDeleted = await tx.client.deleteMany({
                where: { businessId },
            });
            console.log(`  Deleted ${clientsDeleted.count} clients`);

            // 9. Optionally delete business users (but preserve the relationships)
            if (!options.preserveUsers) {
                const businessUsersDeleted = await tx.businessUser.deleteMany({
                    where: { businessId },
                });
                console.log(`  Deleted ${businessUsersDeleted.count} business user relationships`);
            }

            // 10. Optionally delete the business itself
            if (!options.preserveBusiness) {
                await tx.business.delete({
                    where: { id: businessId },
                });
                console.log(`  Deleted business`);
            }
        });

        const duration = Date.now() - startTime;
        console.log(`✅ Seed data cleanup completed in ${duration}ms`);

    } catch (error) {
        console.error('❌ Error during seed data cleanup:', error);
        throw error;
    }
}

/**
 * Verify data integrity after seeding
 */
export async function verifyDataIntegrity(prisma: PrismaClient, businessId: string) {
    console.log('🔍 Verifying data integrity...');

    const checks = [];

    // Check business exists
    const business = await prisma.business.findUnique({
        where: { id: businessId },
    });
    checks.push({
        name: 'Business exists',
        passed: !!business,
        details: business ? `Found: ${business.name}` : 'Business not found',
    });

    // Check staff count
    const staffCount = await prisma.staff.count({
        where: { businessId },
    });
    checks.push({
        name: 'Staff members exist',
        passed: staffCount > 0,
        details: `Found ${staffCount} staff members`,
    });

    // Check services count
    const servicesCount = await prisma.service.count({
        where: { businessId },
    });
    checks.push({
        name: 'Services exist',
        passed: servicesCount > 0,
        details: `Found ${servicesCount} services`,
    });

    // Check clients count
    const clientsCount = await prisma.client.count({
        where: { businessId },
    });
    checks.push({
        name: 'Clients exist',
        passed: clientsCount > 0,
        details: `Found ${clientsCount} clients`,
    });

    // Check appointments count
    const appointmentsCount = await prisma.appointment.count({
        where: { businessId },
    });
    checks.push({
        name: 'Appointments exist',
        passed: appointmentsCount > 0,
        details: `Found ${appointmentsCount} appointments`,
    });

    // Check staff-service relationships
    const staffServicesCount = await prisma.staffService.count({
        where: {
            staff: {
                businessId,
            },
        },
    });
    checks.push({
        name: 'Staff-service relationships exist',
        passed: staffServicesCount > 0,
        details: `Found ${staffServicesCount} staff-service relationships`,
    });

    // Check appointment-service relationships
    const appointmentServicesCount = await prisma.appointmentService.count({
        where: {
            appointment: {
                businessId,
            },
        },
    });
    checks.push({
        name: 'Appointment-service relationships exist',
        passed: appointmentServicesCount > 0,
        details: `Found ${appointmentServicesCount} appointment-service relationships`,
    });

    // Report results
    const passedChecks = checks.filter(check => check.passed).length;
    const totalChecks = checks.length;

    console.log(`\n📊 Data Integrity Report:`);
    checks.forEach(check => {
        const status = check.passed ? '✅' : '❌';
        console.log(`  ${status} ${check.name}: ${check.details}`);
    });

    console.log(`\n🎯 Overall: ${passedChecks}/${totalChecks} checks passed`);

    if (passedChecks === totalChecks) {
        console.log('✅ All data integrity checks passed!');
    } else {
        console.log('❌ Some data integrity checks failed');
    }

    return {
        passed: passedChecks === totalChecks,
        checks,
        summary: {
            total: totalChecks,
            passed: passedChecks,
            failed: totalChecks - passedChecks,
        },
    };
}