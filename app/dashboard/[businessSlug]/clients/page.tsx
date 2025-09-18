import { auth } from '@/auth';
import { ClientsPageContent } from '@/components/clients/clients-page-content';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

interface ClientsPageProps {
  params: {
    businessSlug: string;
  };
}

export default async function ClientsPage({ params }: ClientsPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Get business information and verify access
  const business = await prisma.business.findUnique({
    where: { slug: params.businessSlug },
    include: {
      users: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!business || business.users.length === 0) {
    redirect('/onboarding');
  }

  const userRole = business.users[0]?.role || 'STAFF';

  return (
    <ClientsPageContent
      business={business}
      userRole={userRole}
      userName={session.user.name || session.user.email || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
