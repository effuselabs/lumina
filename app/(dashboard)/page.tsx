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

    if (!userBusiness) {
        redirect('/onboarding');
    }

    // Redirect to the business dashboard
    redirect(`/dashboard/${userBusiness.business.slug}`);
}