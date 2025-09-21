/**
 * Integration test script for ClientFactory
 * Run with: npx tsx prisma/factories/test-client-factory.ts
 */

import { PrismaClient } from '@prisma/client';
import { ClientFactory } from './client-factory';
import { DEFAULT_SEED_CONFIG } from './seed-config';

async function testClientFactory() {
    const prisma = new PrismaClient();

    try {
        console.log('🧪 Testing ClientFactory...');

        // Find or create a test business
        let business = await prisma.business.findFirst({
            where: { slug: 'test-salon' }
        });

        if (!business) {
            console.log('Creating test business...');
            business = await prisma.business.create({
                data: {
                    name: 'Test Salon',
                    slug: 'test-salon',
                    email: 'test@testsalon.com',
                    phone: '(555) 123-4567',
                    address: '123 Test St',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345',
                }
            });
        }

        console.log(`Using business: ${business.name} (${business.id})`);

        // Create some test staff and services for preferences
        const staff = await prisma.staff.findMany({
            where: { businessId: business.id }
        });

        if (staff.length === 0) {
            console.log('Creating test staff...');
            // Create a test user first
            const testUser = await prisma.user.create({
                data: {
                    email: 'teststaff@testsalon.com',
                    name: 'Test Staff',
                    role: 'STAFF'
                }
            });

            await prisma.staff.create({
                data: {
                    businessId: business.id,
                    userId: testUser.id,
                    displayName: 'Test Stylist',
                    title: 'Senior Stylist',
                    employmentType: 'COMMISSION',
                    commissionRate: 50.0,
                    isActive: true
                }
            });
        }

        const services = await prisma.service.findMany({
            where: { businessId: business.id }
        });

        if (services.length === 0) {
            console.log('Creating test services...');
            await prisma.service.createMany({
                data: [
                    {
                        businessId: business.id,
                        name: 'Haircut & Style',
                        description: 'Professional haircut with wash and style',
                        price: 65.00,
                        duration: 60,
                        category: 'Hair',
                        isActive: true,
                        isOnline: true
                    },
                    {
                        businessId: business.id,
                        name: 'Hair Color',
                        description: 'Full hair coloring service',
                        price: 120.00,
                        duration: 120,
                        category: 'Hair',
                        isActive: true,
                        isOnline: true
                    }
                ]
            });
        }

        // Initialize ClientFactory
        const clientFactory = new ClientFactory(
            prisma,
            business.id,
            DEFAULT_SEED_CONFIG.clients.demographics
        );

        await clientFactory.initialize();
        console.log('✅ ClientFactory initialized');

        // Test generating a single client
        console.log('\n📝 Generating single client...');
        const singleClient = await clientFactory.generate();
        console.log(`✅ Generated client: ${singleClient.firstName} ${singleClient.lastName}`);
        console.log(`   Email: ${singleClient.email}`);
        console.log(`   Phone: ${singleClient.phone}`);
        console.log(`   Location: ${singleClient.city}, ${singleClient.state}`);
        console.log(`   Notes: ${singleClient.notes?.substring(0, 100)}...`);

        // Test generating multiple clients
        console.log('\n📝 Generating batch of clients...');
        const batchClients = await clientFactory.generateClients(5, {}, (processed, total) => {
            console.log(`   Progress: ${processed}/${total}`);
        });

        console.log(`✅ Generated ${batchClients.length} clients in batch`);

        // Display some statistics
        const totalClients = await prisma.client.count({
            where: { businessId: business.id }
        });

        console.log(`\n📊 Total clients in database: ${totalClients}`);

        // Show sample of generated clients
        const sampleClients = await prisma.client.findMany({
            where: { businessId: business.id },
            take: 3,
            orderBy: { createdAt: 'desc' }
        });

        console.log('\n👥 Sample clients:');
        sampleClients.forEach((client, index) => {
            console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} - ${client.email}`);
            console.log(`      ${client.city}, ${client.state} | Marketing: Email=${client.emailMarketing}, SMS=${client.smsMarketing}`);
        });

        console.log('\n✅ ClientFactory test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testClientFactory()
        .then(() => {
            console.log('🎉 All tests passed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Test failed:', error);
            process.exit(1);
        });
}

export { testClientFactory };
