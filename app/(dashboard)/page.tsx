import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // Get user's first business and redirect to it
  const userBusiness = await prisma.businessUser.findFirst({
    where: {
      userId: session.user.id,
    },
    include: {
      business: true,
    },
  });

  // Debug logging
  // eslint-disable-next-line no-console
  console.log('Dashboard redirect debug:', {
    userId: session.user.id,
    userEmail: session.user.email,
    userBusiness: userBusiness
      ? {
          businessId: userBusiness.business.id,
          businessName: userBusiness.business.name,
          businessSlug: userBusiness.business.slug,
          userRole: userBusiness.role,
        }
      : null,
  });

  if (!userBusiness) {
    // eslint-disable-next-line no-console
    console.log('No business found, redirecting to onboarding');
    redirect('/onboarding');
  }

  const redirectUrl = `/dashboard/${userBusiness.business.slug}`;
  // eslint-disable-next-line no-console
  console.log('Redirecting to:', redirectUrl);

  // Redirect to the business dashboard
  redirect(redirectUrl);
}
