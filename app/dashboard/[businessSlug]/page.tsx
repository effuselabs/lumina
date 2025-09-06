import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { BusinessDashboard } from './business-dashboard';

interface BusinessDashboardPageProps {
    params: {
        businessSlug: string;
    };
}

/**
 * Business Dashboard Page
 * 
 * Handles /dashboard/[businessSlug] routes with:
 * 1. Authentication verification
 * 2. Business access validation
 * 3. Multi-tenant data isolation
 * 4. Role-based access control
 * 
 * Security: All queries include businessId scoping
 */
export default async function BusinessDashboardPage({
    params
}: BusinessDashboardPageProps) {
    const session = await auth();

    // Enforce authentication
    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    console.log('🏢 Business dashboard accessed:', {
        businessSlug: params.businessSlug,
        userId: session.user.id,
        userEmail: session.user.email,
        timestamp: new Date().toISOString(),
    });

    try {
        // Get business with user access validation
        const business = await prisma.business.findFirst({
            where: {
                slug: params.businessSlug,
            },
            include: {
                users: {
                    where: {
                        userId: session.user.id,
                    },
                    select: {
                        role: true,
                        userId: true,
                    },
                },
                _count: {
                    select: {
                        staff: true,
                        services: true,
                        clients: true,
                        appointments: true,
                    },
                },
            },
        });

        // Verify user has access to this business
        const userHasAccess = business?.users && business.users.length > 0;

        console.log('🔍 Business lookup result:', {
            businessSlug: params.businessSlug,
            businessFound: !!business,
            businessName: business?.name,
            userHasAccess,
            userRole: business?.users?.[0]?.role,
            usersCount: business?.users?.length || 0,
        });

        // Handle business not found or no access
        if (!business || !userHasAccess) {
            console.log('❌ Business not found or access denied, redirecting to onboarding', {
                businessFound: !!business,
                userHasAccess,
                businessSlug: params.businessSlug,
            });
            redirect('/onboarding');
        }

        const userRole = business.users[0]?.role;

        console.log('Rendering business dashboard:', {
            businessName: business.name,
            userRole,
            statsCount: business._count,
        });

        return (
            <BusinessDashboard
                business={business}
                userRole={userRole}
                userName={session.user.name || 'User'}
                businessSlug={params.businessSlug}
            />
        );
    } catch (error) {
        console.error('Business dashboard error:', error);
        // Fallback to onboarding on any error
        redirect('/onboarding');
    }
}