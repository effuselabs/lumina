import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

/**
 * Dashboard Redirect Handler
 * 
 * Handles /dashboard route by:
 * 1. Verifying user authentication
 * 2. Looking up user's business relationship
 * 3. Redirecting to appropriate destination
 * 
 * Security: All database queries are user-scoped
 */
export default async function DashboardRedirect() {
    const session = await auth();

    // Enforce authentication
    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    console.log('🔄 Dashboard redirect: Authenticated user', {
        userId: session.user.id,
        email: session.user.email,
        timestamp: new Date().toISOString(),
    });

    try {
        // Get user's business relationship with proper scoping
        const userBusiness = await prisma.businessUser.findFirst({
            where: {
                userId: session.user.id,
            },
            include: {
                business: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc', // Use first business if multiple
            },
        });

        if (!userBusiness) {
            console.log('No business relationship found, redirecting to onboarding');
            redirect('/onboarding');
        }

        console.log('Business found, redirecting to dashboard', {
            businessId: userBusiness.business.id,
            businessName: userBusiness.business.name,
            businessSlug: userBusiness.business.slug,
            userRole: userBusiness.role,
        });

        // Redirect to business-specific dashboard
        redirect(`/dashboard/${userBusiness.business.slug}`);
    } catch (error) {
        console.error('Dashboard redirect error:', error);
        // Fallback to onboarding on any database error
        redirect('/onboarding');
    }
}