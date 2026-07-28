import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import {
  initializeSeedSystem,
  loadSeedConfig,
  verifyDataIntegrity
} from './factories/index';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting enhanced database seed...');

  const startTime = Date.now();

  // Load seed configuration
  const config = loadSeedConfig();
  console.log(`📋 Seed configuration loaded:`);
  console.log(`  - Clients: ${config.clients.count}`);
  console.log(`  - Staff: ${config.staff.count}`);
  console.log(`  - Historical months: ${config.appointments.historicalMonths}`);
  console.log(`  - Service categories: ${config.services.categories.length}`);
  console.log(`  - Service packages: ${config.services.packages.length}`);

  // Create demo users
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@lumina-demo.com' },
    update: {},
    create: {
      email: 'owner@lumina-demo.com',
      name: 'Sarah Johnson',
      password: await hash('demo123', 12),
      role: 'OWNER',
      emailVerified: new Date(),
    },
  });

  const staffUser1 = await prisma.user.upsert({
    where: { email: 'mike@lumina-demo.com' },
    update: {},
    create: {
      email: 'mike@lumina-demo.com',
      name: 'Mike Rodriguez',
      password: await hash('demo123', 12),
      role: 'STAFF',
      emailVerified: new Date(),
    },
  });

  const staffUser2 = await prisma.user.upsert({
    where: { email: 'emma@lumina-demo.com' },
    update: {},
    create: {
      email: 'emma@lumina-demo.com',
      name: 'Emma Chen',
      password: await hash('demo123', 12),
      role: 'STAFF',
      emailVerified: new Date(),
    },
  });

  console.log('✅ Created demo users');

  // Create demo business
  const demoBusiness = await prisma.business.upsert({
    where: { slug: 'lumina-demo-salon' },
    update: {},
    create: {
      name: 'Lumina Demo Salon',
      slug: 'lumina-demo-salon',
      description:
        'A modern full-service salon offering cutting-edge hair, nail, and beauty services.',
      email: 'hello@lumina-demo.com',
      phone: '(555) 123-4567',
      website: 'https://lumina-demo.com',
      address: '123 Beauty Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'US',
      timezone: 'America/Los_Angeles',
      financialModel: 'COMMISSION',
      currency: 'USD',
      bookingEnabled: true,
      onlineBooking: true,
      requireDeposit: false,
      operatingHours: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
        saturday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
        sunday: { isOpen: false, openTime: '10:00', closeTime: '16:00' },
      },
      primaryColor: '#FFD25A',
    },
  });

  console.log('✅ Created demo business');

  // Initialize enhanced seed system with optimized batch processing
  const seedSystem = await initializeSeedSystem(prisma, demoBusiness.id);
  console.log('✅ Enhanced seed system initialized');

  // Start overall performance monitoring
  seedSystem.performanceMonitor.startOperation('comprehensive-seed');

  // Optimize database connections for batch operations
  await seedSystem.batchProcessor.optimizeForBatchOperations();

  // Create business-user relationships
  await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: demoBusiness.id,
        userId: ownerUser.id,
      },
    },
    update: {},
    create: {
      businessId: demoBusiness.id,
      userId: ownerUser.id,
      role: 'OWNER',
    },
  });

  await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: demoBusiness.id,
        userId: staffUser1.id,
      },
    },
    update: {},
    create: {
      businessId: demoBusiness.id,
      userId: staffUser1.id,
      role: 'STAFF',
    },
  });

  await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: demoBusiness.id,
        userId: staffUser2.id,
      },
    },
    update: {},
    create: {
      businessId: demoBusiness.id,
      userId: staffUser2.id,
      role: 'STAFF',
    },
  });

  console.log('✅ Created business-user relationships');

  // Create business opening hours.
  // Availability calculation reads these rows; without them every public
  // booking availability query returns no slots, so the booking flow cannot
  // be exercised at all. Mon-Fri 9-6, Sat 10-4, closed Sunday.
  const weeklyHours: Array<{
    dayOfWeek: number;
    openTime: string | null;
    closeTime: string | null;
    isClosed: boolean;
  }> = [
    { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true },
    { dayOfWeek: 1, openTime: '09:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 2, openTime: '09:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 3, openTime: '09:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 4, openTime: '09:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 5, openTime: '09:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 6, openTime: '10:00', closeTime: '16:00', isClosed: false },
  ];

  for (const hours of weeklyHours) {
    await prisma.businessHours.upsert({
      where: {
        businessId_dayOfWeek: {
          businessId: demoBusiness.id,
          dayOfWeek: hours.dayOfWeek,
        },
      },
      update: {
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        isClosed: hours.isClosed,
      },
      create: {
        businessId: demoBusiness.id,
        ...hours,
      },
    });
  }

  console.log('✅ Created business hours (Mon-Fri 9-6, Sat 10-4, closed Sun)');

  // Generate comprehensive staff data using StaffFactory
  console.log('👥 Generating comprehensive staff profiles...');

  const { StaffFactory } = await import('./factories/staff-factory');
  const staffFactory = new StaffFactory(prisma, demoBusiness.id, config.staff.specialties);

  // Generate staff members with progress tracking
  const createdStaff = await staffFactory.generateBatch(
    config.staff.count,
    {},
    {
      batchSize: 2,
      maxConcurrency: 2,
      progressCallback: (processed, total) => {
        console.log(`  Generated ${processed}/${total} staff members`);
      },
    }
  );

  console.log(`✅ Generated ${createdStaff.length} comprehensive staff profiles`);

  // Keep the original staff for backward compatibility with existing appointments
  const staff1 = createdStaff.find(s => s.displayName.includes('Mike')) || createdStaff[0];
  const staff2 = createdStaff.find(s => s.displayName.includes('Emma')) || createdStaff[1];

  // Generate comprehensive service menu using ServiceFactory
  console.log('🎨 Generating comprehensive service menu...');

  const { ServiceFactory } = await import('./factories/service-factory');
  const serviceFactory = new ServiceFactory(prisma, demoBusiness.id);

  // Generate all services (30+ services across 6+ categories)
  const createdServices = await serviceFactory.generateAllServices({
    includeSeasonalServices: true,
    includePricingTiers: true,
    includePackages: true,
  });

  // Generate service packages
  const servicePackages = await serviceFactory.generateServicePackages();

  console.log(`✅ Generated ${createdServices.length} services across ${serviceFactory.getAllCategories().length} categories`);
  console.log(`✅ Generated ${servicePackages.length} service packages`);

  // Assign services to staff based on their specialties
  console.log('🔗 Assigning services to staff based on specialties...');

  for (const staff of createdStaff) {
    // Find matching services for this staff member's title/specialty
    const staffTitle = staff.title?.toLowerCase() || '';
    let assignedServices: typeof createdServices = [];

    if (staffTitle.includes('hair') || staffTitle.includes('stylist')) {
      assignedServices = createdServices.filter(s =>
        s.category === 'Hair' || s.category === 'Brows'
      );
    } else if (staffTitle.includes('nail')) {
      assignedServices = createdServices.filter(s =>
        s.category === 'Nails'
      );
    } else if (staffTitle.includes('colorist')) {
      assignedServices = createdServices.filter(s =>
        s.name.includes('Color') || s.name.includes('Highlights') || s.name.includes('Balayage')
      );
    } else if (staffTitle.includes('esthetician')) {
      assignedServices = createdServices.filter(s =>
        s.category === 'Skincare' || s.category === 'Brows'
      );
    } else if (staffTitle.includes('massage')) {
      assignedServices = createdServices.filter(s =>
        s.category === 'Massage'
      );
    } else if (staffTitle.includes('lash')) {
      assignedServices = createdServices.filter(s =>
        s.category === 'Lashes' || s.category === 'Brows'
      );
    } else {
      // Default assignment for other specialties - assign a few services from different categories
      const hairServices = createdServices.filter(s => s.category === 'Hair').slice(0, 2);
      const nailServices = createdServices.filter(s => s.category === 'Nails').slice(0, 1);
      const browServices = createdServices.filter(s => s.category === 'Brows').slice(0, 1);
      assignedServices = [...hairServices, ...nailServices, ...browServices];
    }

    // Assign services to staff
    for (const service of assignedServices) {
      await prisma.staffService.upsert({
        where: {
          staffId_serviceId: {
            staffId: staff.id,
            serviceId: service.id,
          },
        },
        update: {},
        create: {
          staffId: staff.id,
          serviceId: service.id,
        },
      });
    }

    console.log(`  Assigned ${assignedServices.length} services to ${staff.displayName} (${staff.title})`);
  }

  console.log('✅ Assigned services to staff based on specialties');

  // Generate comprehensive client data using ClientFactory
  console.log('🧑‍🤝‍🧑 Generating comprehensive client data...');

  const { ClientFactory } = await import('./factories/client-factory');
  const clientFactory = new ClientFactory(
    prisma,
    demoBusiness.id,
    config.clients.demographics
  );

  await clientFactory.initialize();

  // Generate clients with progress tracking
  const createdClients = await clientFactory.generateClients(
    config.clients.count,
    {
      historicalMonths: config.appointments.historicalMonths,
      averageVisitsPerClient: 8
    },
    (processed, total) => {
      if (processed % 10 === 0 || processed === total) {
        console.log(`  Generated ${processed}/${total} clients`);
      }
    }
  );

  console.log(`✅ Generated ${createdClients.length} comprehensive client profiles`);

  // Generate 6+ months of historical appointment data using AppointmentFactory
  console.log('📅 Generating 6+ months of historical appointment data...');

  const { AppointmentFactory } = await import('./factories/appointment-factory');
  const appointmentFactory = new AppointmentFactory(
    prisma,
    demoBusiness.id,
    config.appointments.patternsConfig
  );

  await appointmentFactory.initialize();

  // Calculate date range for historical appointments
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - config.appointments.historicalMonths);

  // Target 500+ appointments distributed across the historical period
  const targetAppointmentCount = 500;

  const historicalAppointments = await appointmentFactory.generateHistoricalAppointments(
    startDate,
    now,
    targetAppointmentCount,
    (processed, total) => {
      if (processed % 25 === 0 || processed === total) {
        console.log(`  Generated ${processed}/${total} historical appointments`);
      }
    }
  );

  console.log(`✅ Generated ${historicalAppointments.length} historical appointments`);

  // Create a few future appointments for demo purposes
  console.log('📅 Creating future appointments for demo...');

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const futureAppointments = [
    {
      clientId: createdClients[0]!.id,
      staffId: staff1!.id,
      startTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
      endTime: new Date(tomorrow.setHours(11, 0, 0, 0)),
      totalDuration: 60,
      totalPrice: 85.00,
      status: 'SCHEDULED' as const,
      serviceIds: [createdServices.find(s => s.name === 'Haircut & Style')!.id],
    },
    {
      clientId: createdClients[1]!.id,
      staffId: staff2!.id,
      startTime: new Date(nextWeek.setHours(14, 0, 0, 0)),
      endTime: new Date(nextWeek.setHours(15, 0, 0, 0)),
      totalDuration: 60,
      totalPrice: 45.00,
      status: 'SCHEDULED' as const,
      serviceIds: [createdServices.find(s => s.name === 'Gel Manicure')!.id],
    },
  ];

  for (const appointmentData of futureAppointments) {
    const { serviceIds, ...appointmentInfo } = appointmentData;

    const appointment = await prisma.appointment.create({
      data: {
        ...appointmentInfo,
        businessId: demoBusiness.id,
      },
    });

    // Add services to appointment
    for (const serviceId of serviceIds) {
      const service = createdServices.find(s => s.id === serviceId)!;
      await prisma.appointmentService.create({
        data: {
          appointmentId: appointment.id,
          serviceId: service.id,
          serviceName: service.name,
          price: service.price,
          duration: service.duration,
        },
      });
    }
  }

  console.log('✅ Created future demo appointments');

  // Generate comprehensive financial transaction system using TransactionFactory
  console.log('💰 Generating comprehensive financial transaction system...');

  const { TransactionFactory } = await import('./factories/transaction-factory');
  const transactionFactory = new TransactionFactory(
    prisma,
    demoBusiness.id,
    config.financial.paymentMethods,
    config.financial.transactionTypes
  );

  await transactionFactory.initialize();

  // Target 400+ financial transactions with varied payment methods
  const targetTransactionCount = 400;

  const financialTransactions = await transactionFactory.generateComprehensiveTransactions(
    targetTransactionCount,
    {
      startDate,
      endDate: now
    },
    (processed, total) => {
      if (processed % 25 === 0 || processed === total) {
        console.log(`  Generated ${processed}/${total} financial transactions`);
      }
    }
  );

  console.log(`✅ Generated ${financialTransactions.length} comprehensive financial transactions`);

  // Generate comprehensive business operations data (products, gift cards, promotions, marketing, loyalty)
  console.log('🏪 Generating comprehensive business operations data...');

  const { BusinessOperationsFactory } = await import('./factories/business-operations-factory');
  const businessOperationsFactory = new BusinessOperationsFactory(prisma, demoBusiness.id);

  const businessOperationsData = await businessOperationsFactory.generateWithProgress(
    {
      products: {
        generateProducts: true,
        generateSalesHistory: true,
        salesHistoryMonths: config.appointments.historicalMonths
      },
      giftCards: {
        generateGiftCards: true,
        giftCardCount: 15
      },
      promotions: {
        generatePromotions: true,
        includeSeasonalPromotions: true,
        includeLoyaltyPromotions: true
      },
      marketing: {
        generateCampaigns: true,
        includeEmailCampaigns: true,
        includeSMSCampaigns: true
      },
      loyalty: {
        generateLoyaltyProgram: true,
        generateMemberships: true
      }
    },
    (step, progress, total) => {
      console.log(`  ${step} (${progress}/${total})`);
    }
  );

  console.log(`✅ Generated comprehensive business operations data:`);
  console.log(`  📦 Products: ${businessOperationsData.products.length}`);
  console.log(`  💰 Product Sales: ${businessOperationsData.productSales.length}`);
  console.log(`  🎁 Gift Cards: ${businessOperationsData.giftCards.length}`);
  console.log(`  🎫 Gift Card Redemptions: ${businessOperationsData.giftCardRedemptions.length}`);
  console.log(`  🎯 Promotions: ${businessOperationsData.promotions.length}`);
  console.log(`  📈 Promotion Usage: ${businessOperationsData.promotionUsage.length}`);
  console.log(`  📧 Marketing Campaigns: ${businessOperationsData.marketingCampaigns.length}`);
  console.log(`  👥 Campaign Recipients: ${businessOperationsData.campaignRecipients.length}`);
  console.log(`  ⭐ Loyalty Program: ${businessOperationsData.loyaltyProgram ? 'Generated' : 'Not Generated'}`);
  console.log(`  🏆 Loyalty Memberships: ${businessOperationsData.loyaltyMemberships.length}`);
  console.log(`  💎 Loyalty Transactions: ${businessOperationsData.loyaltyTransactions.length}`);

  // Generate comprehensive client communication and loyalty systems
  console.log('\n💬 Generating client communication and loyalty systems...');

  const { ComprehensiveCommunicationFactory } = await import('./factories/comprehensive-communication-factory');
  const communicationFactory = new ComprehensiveCommunicationFactory(prisma, demoBusiness.id);

  const communicationSystem = await communicationFactory.generateCompleteSystem();

  console.log('📊 Communication System Results:');
  console.log(`  ⭐ Client Reviews: ${communicationSystem.reviews.length}`);
  console.log(`  💬 Communications: ${communicationSystem.communications.length}`);
  console.log(`  📧 Marketing Campaigns: ${communicationSystem.marketingCampaigns.length}`);
  console.log(`  👥 Campaign Recipients: ${communicationSystem.campaignRecipients.length}`);
  console.log(`  🏆 Loyalty Memberships: ${communicationSystem.loyaltyMemberships.length}`);
  console.log(`  💎 Loyalty Transactions: ${communicationSystem.loyaltyTransactions.length}`);

  console.log('\n📈 System Metrics:');
  console.log(`  Average Rating: ${communicationSystem.metrics.averageRating}/5.0`);
  console.log(`  Email Engagement: ${(communicationSystem.metrics.emailEngagementRate * 100).toFixed(1)}%`);
  console.log(`  SMS Engagement: ${(communicationSystem.metrics.smsEngagementRate * 100).toFixed(1)}%`);
  console.log(`  Loyalty Participation: ${(communicationSystem.metrics.loyaltyParticipationRate * 100).toFixed(1)}%`);
  console.log(`  Client Retention: ${(communicationSystem.metrics.clientRetentionRate * 100).toFixed(1)}%`);
  console.log(`  Avg Lifetime Value: $${communicationSystem.metrics.averageLifetimeValue.toFixed(2)}`);

  // Validate business operations data integrity
  console.log('🔍 Validating business operations data integrity...');
  const businessOperationsValidation = await businessOperationsFactory.validateBusinessOperationsData();

  if (businessOperationsValidation.isValid) {
    console.log('✅ Business operations data validation passed');
  } else {
    console.log(`⚠️  Business operations data validation found ${businessOperationsValidation.errors.length} errors`);
    businessOperationsValidation.errors.forEach(error => {
      console.log(`  - ${error.field}: ${error.message}`);
    });
  }

  // Verify data integrity
  const integrityCheck = await verifyDataIntegrity(prisma, demoBusiness.id);

  // End performance monitoring and generate report
  const totalClients = createdClients.length;
  const totalAppointments = historicalAppointments.length;
  const totalTransactions = financialTransactions.length;

  seedSystem.performanceMonitor.updateProgress('comprehensive-seed',
    totalClients + totalAppointments + totalTransactions);

  const seedMetrics = seedSystem.performanceMonitor.endOperation('comprehensive-seed');

  // Generate and display performance report
  console.log('\n' + seedSystem.performanceMonitor.generateReport());

  // Cleanup batch processor resources
  await seedSystem.batchProcessor.cleanup();

  const duration = Date.now() - startTime;
  console.log(`\n🎉 Enhanced database seed completed successfully in ${duration}ms!`);
  console.log('\n📋 Demo Accounts:');
  console.log('Owner: owner@lumina-demo.com / demo123');
  console.log('Staff 1: mike@lumina-demo.com / demo123');
  console.log('Staff 2: emma@lumina-demo.com / demo123');

  console.log('\n🏗️  Enhanced seed infrastructure ready for comprehensive data generation');
  console.log('Next steps: Implement individual factory classes for clients, staff, services, appointments, and transactions');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async e => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
