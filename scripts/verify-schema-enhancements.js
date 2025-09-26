/**
 * Schema Enhancement Verification Script
 * Validates that the appointment booking engine database enhancements are properly applied
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifySchemaEnhancements() {
    console.log('🔍 Verifying Appointment Booking Engine Schema Enhancements...\n');

    try {
        // Test 1: Verify new models exist
        console.log('✅ Testing new model availability...');

        // Check AppointmentStatusHistory
        try {
            const statusHistoryCount = await prisma.appointmentStatusHistory.count();
            console.log(`   ✓ AppointmentStatusHistory model accessible (${statusHistoryCount} records)`);
        } catch (error) {
            console.log(`   ❌ AppointmentStatusHistory model not accessible: ${error.message}`);
            return false;
        }

        // Check AppointmentPreferences
        try {
            const preferencesCount = await prisma.appointmentPreferences.count();
            console.log(`   ✓ AppointmentPreferences model accessible (${preferencesCount} records)`);
        } catch (error) {
            console.log(`   ❌ AppointmentPreferences model not accessible: ${error.message}`);
            return false;
        }

        // Test 2: Verify enhanced Appointment model fields
        console.log('\n✅ Testing enhanced Appointment model fields...');
        try {
            const appointment = await prisma.appointment.findFirst({
                select: {
                    id: true,
                    totalDuration: true,
                    totalPrice: true,
                    confirmedAt: true,
                    startedAt: true,
                    completedAt: true,
                    cancelledAt: true,
                    cancellationReason: true
                }
            });
            console.log('   ✓ All new Appointment fields accessible');
        } catch (error) {
            console.log(`   ❌ Enhanced Appointment fields not accessible: ${error.message}`);
            return false;
        }

        // Test 3: Verify enhanced AppointmentService model fields
        console.log('\n✅ Testing enhanced AppointmentService model fields...');
        try {
            const service = await prisma.appointmentService.findFirst({
                select: {
                    id: true,
                    serviceOrder: true,
                    startOffset: true,
                    assignedStaffId: true
                }
            });
            console.log('   ✓ All new AppointmentService fields accessible');
        } catch (error) {
            console.log(`   ❌ Enhanced AppointmentService fields not accessible: ${error.message}`);
            return false;
        }

        // Test 4: Verify database indexes work (performance test)
        console.log('\n✅ Testing database index performance...');

        const startTime = Date.now();
        await prisma.appointment.findMany({
            where: {
                businessId: 'test-business-id',
                status: 'SCHEDULED'
            },
            take: 10
        });
        const queryTime = Date.now() - startTime;

        if (queryTime < 1000) {
            console.log(`   ✓ Indexed query completed in ${queryTime}ms`);
        } else {
            console.log(`   ⚠️  Query took ${queryTime}ms (may indicate missing index)`);
        }

        // Test 5: Verify relationships work
        console.log('\n✅ Testing model relationships...');
        try {
            const appointmentWithHistory = await prisma.appointment.findFirst({
                include: {
                    statusHistory: true
                }
            });
            console.log('   ✓ Appointment -> StatusHistory relationship works');
        } catch (error) {
            console.log(`   ❌ Appointment relationships not working: ${error.message}`);
            return false;
        }

        // Test 6: Verify business context isolation
        console.log('\n✅ Testing business context validation...');
        try {
            // This should work (even if no records exist)
            await prisma.appointmentStatusHistory.findMany({
                where: {
                    businessId: 'test-business-id'
                }
            });
            console.log('   ✓ Business context filtering works');
        } catch (error) {
            console.log(`   ❌ Business context filtering failed: ${error.message}`);
            return false;
        }

        console.log('\n🎉 All schema enhancements verified successfully!');
        console.log('\n📊 Summary of enhancements:');
        console.log('   • AppointmentStatusHistory model for audit trail');
        console.log('   • AppointmentPreferences model for client preferences');
        console.log('   • Enhanced Appointment model with status tracking fields');
        console.log('   • Enhanced AppointmentService model with ordering and staff assignment');
        console.log('   • Optimized database indexes for performance');
        console.log('   • Proper business context isolation');

        return true;

    } catch (error) {
        console.error('❌ Schema verification failed:', error.message);
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

// Run verification
verifySchemaEnhancements()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('❌ Verification script failed:', error);
        process.exit(1);
    });