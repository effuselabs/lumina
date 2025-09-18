import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

/**
 * Dashboard Redirect Handler
 *
 * This page handles the /dashboard route by:
 * 1. Verifying user authentication (handled by middleware)
 * 2. Looking up the user's business relationships
 * 3. Redirecting to the appropriate destination
 *
 * Security: All database queries are user-scoped for multi-tenant isolation
 */
export default async function DashboardRedirect() {
  const session = await auth();

  // This should not happen due to middleware, but double-check
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  try {
    // Look up user's business relationships
    const userBusinesses = await prisma.businessUser.findMany({
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

    // All businesses are considered active since there's no isActive field
    const activeBusinesses = userBusinesses;

    if (activeBusinesses.length === 0) {
      redirect('/onboarding');
    }

    // Use the first active business
    const primaryBusiness = activeBusinesses[0];

    // Redirect to business-specific dashboard
    redirect(`/dashboard/${primaryBusiness.business.slug}`);
  } catch (error) {
    // NEXT_REDIRECT is not an actual error - it's how Next.js handles redirects
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error; // Re-throw to allow the redirect to complete
    }

    // Log error for monitoring in production

    // Fallback to onboarding only on actual database errors
    redirect('/onboarding');
  }
}
