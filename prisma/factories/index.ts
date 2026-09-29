/**
 * Main factory exports and initialization
 */

export * from './base-factory';
export * from './performance-monitor';
export * from './seed-config';
export * from './validators';

// Business operations and communication factories (products, gift cards,
// promotions, marketing campaigns, loyalty, reviews) were removed along with
// the parked feature surface they generated data for. Their models remain in
// schema.prisma under the PARKED section.

import { PrismaClient } from '@prisma/client';
import { BatchProcessor } from './batch-processor';
import { PerformanceMonitor } from './performance-monitor';
import { loadSeedConfig, validateSeedConfig } from './seed-config';

/**
 * Initialize the seed system with configuration validation
 */
export async function initializeSeedSystem(
  prisma: PrismaClient,
  businessId: string
) {
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

  console.log(
    '✅ Enhanced batch processor and performance monitor initialized'
  );

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
 * Verify data integrity after seeding
 */
export async function verifyDataIntegrity(
  prisma: PrismaClient,
  businessId: string
) {
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
