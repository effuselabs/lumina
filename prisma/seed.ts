import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

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

  // Create staff profiles
  const staff1 = await prisma.staff.upsert({
    where: { userId: staffUser1.id },
    update: {},
    create: {
      businessId: demoBusiness.id,
      userId: staffUser1.id,
      displayName: 'Mike Rodriguez',
      title: 'Senior Hair Stylist',
      bio: 'Specializing in modern cuts and color with 8+ years of experience.',
      commissionRate: 60.0,
      isActive: true,
      acceptsOnlineBookings: true,
      workingHours: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        saturday: { isOpen: true, openTime: '08:00', closeTime: '16:00' },
        sunday: { isOpen: false, openTime: '10:00', closeTime: '15:00' },
      },
    },
  });

  const staff2 = await prisma.staff.upsert({
    where: { userId: staffUser2.id },
    update: {},
    create: {
      businessId: demoBusiness.id,
      userId: staffUser2.id,
      displayName: 'Emma Chen',
      title: 'Nail Technician & Colorist',
      bio: 'Expert in nail art and advanced color techniques.',
      commissionRate: 55.0,
      isActive: true,
      acceptsOnlineBookings: true,
      workingHours: {
        monday: { isOpen: false, openTime: '10:00', closeTime: '16:00' },
        tuesday: { isOpen: true, openTime: '10:00', closeTime: '18:00' },
        wednesday: { isOpen: true, openTime: '10:00', closeTime: '18:00' },
        thursday: { isOpen: true, openTime: '10:00', closeTime: '19:00' },
        friday: { isOpen: true, openTime: '10:00', closeTime: '19:00' },
        saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        sunday: { isOpen: true, openTime: '10:00', closeTime: '16:00' },
      },
    },
  });

  console.log('✅ Created staff profiles');

  // Create services
  const services = [
    {
      name: 'Haircut & Style',
      description: 'Professional haircut with wash and style',
      category: 'Hair',
      price: 65.0,
      duration: 60,
    },
    {
      name: 'Hair Color',
      description: 'Full hair coloring service',
      category: 'Hair',
      price: 120.0,
      duration: 120,
    },
    {
      name: 'Highlights',
      description: 'Partial or full highlights',
      category: 'Hair',
      price: 95.0,
      duration: 90,
    },
    {
      name: 'Manicure',
      description: 'Classic manicure with polish',
      category: 'Nails',
      price: 35.0,
      duration: 45,
    },
    {
      name: 'Pedicure',
      description: 'Relaxing pedicure with polish',
      category: 'Nails',
      price: 45.0,
      duration: 60,
    },
    {
      name: 'Gel Manicure',
      description: 'Long-lasting gel manicure',
      category: 'Nails',
      price: 50.0,
      duration: 60,
    },
    {
      name: 'Eyebrow Shaping',
      description: 'Professional eyebrow shaping and trimming',
      category: 'Beauty',
      price: 25.0,
      duration: 30,
    },
  ];

  const createdServices = [];
  for (const serviceData of services) {
    // Check if service already exists
    let service = await prisma.service.findFirst({
      where: {
        businessId: demoBusiness.id,
        name: serviceData.name,
      },
    });

    if (!service) {
      service = await prisma.service.create({
        data: {
          ...serviceData,
          businessId: demoBusiness.id,
          isActive: true,
          isOnline: true,
        },
      });
    }

    createdServices.push(service);
  }

  console.log('✅ Created services');

  // Assign services to staff
  const hairServices = createdServices.filter(s => s.category === 'Hair');
  const nailServices = createdServices.filter(s => s.category === 'Nails');
  const beautyServices = createdServices.filter(s => s.category === 'Beauty');

  // Mike does hair and beauty services
  for (const service of [...hairServices, ...beautyServices]) {
    await prisma.staffService.upsert({
      where: {
        staffId_serviceId: {
          staffId: staff1.id,
          serviceId: service.id,
        },
      },
      update: {},
      create: {
        staffId: staff1.id,
        serviceId: service.id,
      },
    });
  }

  // Emma does nails and color services
  const colorService = createdServices.find(s => s.name === 'Hair Color');
  const highlightsService = createdServices.find(s => s.name === 'Highlights');

  for (const service of [
    ...nailServices,
    colorService,
    highlightsService,
  ].filter(Boolean)) {
    await prisma.staffService.upsert({
      where: {
        staffId_serviceId: {
          staffId: staff2.id,
          serviceId: service!.id,
        },
      },
      update: {},
      create: {
        staffId: staff2.id,
        serviceId: service!.id,
      },
    });
  }

  console.log('✅ Assigned services to staff');

  // Create demo clients
  const clients = [
    {
      firstName: 'Jessica',
      lastName: 'Williams',
      email: 'jessica.williams@example.com',
      phone: '(555) 234-5678',
    },
    {
      firstName: 'David',
      lastName: 'Brown',
      email: 'david.brown@example.com',
      phone: '(555) 345-6789',
    },
    {
      firstName: 'Maria',
      lastName: 'Garcia',
      email: 'maria.garcia@example.com',
      phone: '(555) 456-7890',
    },
    {
      firstName: 'James',
      lastName: 'Miller',
      email: 'james.miller@example.com',
      phone: '(555) 567-8901',
    },
  ];

  const createdClients = [];
  for (const clientData of clients) {
    const client = await prisma.client.upsert({
      where: {
        businessId_email: {
          businessId: demoBusiness.id,
          email: clientData.email,
        },
      },
      update: {},
      create: {
        ...clientData,
        businessId: demoBusiness.id,
        emailMarketing: true,
        smsMarketing: true,
      },
    });
    createdClients.push(client);
  }

  console.log('✅ Created demo clients');

  // Create some sample appointments (past and future)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const appointments = [
    {
      clientId: createdClients[0]!.id,
      staffId: staff1.id,
      startTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
      endTime: new Date(tomorrow.setHours(11, 0, 0, 0)),
      status: 'SCHEDULED' as const,
      serviceIds: [createdServices.find(s => s.name === 'Haircut & Style')!.id],
    },
    {
      clientId: createdClients[1]!.id,
      staffId: staff2.id,
      startTime: new Date(nextWeek.setHours(14, 0, 0, 0)),
      endTime: new Date(nextWeek.setHours(15, 0, 0, 0)),
      status: 'SCHEDULED' as const,
      serviceIds: [createdServices.find(s => s.name === 'Gel Manicure')!.id],
    },
  ];

  for (const appointmentData of appointments) {
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

  console.log('✅ Created sample appointments');

  console.log('🎉 Database seed completed successfully!');
  console.log('\n📋 Demo Accounts:');
  console.log('Owner: owner@lumina-demo.com / demo123');
  console.log('Staff 1: mike@lumina-demo.com / demo123');
  console.log('Staff 2: emma@lumina-demo.com / demo123');
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
