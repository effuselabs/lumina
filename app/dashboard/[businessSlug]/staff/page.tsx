import { auth } from '@/auth';
import { StaffList } from '@/components/staff/staff-list';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

interface StaffPageProps {
    params: {
        businessSlug: string;
    };
}

export default async function StaffPage({ params }: StaffPageProps) {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    // Get business by slug and verify user access
    const business = await prisma.business.findUnique({
        where: { slug: params.businessSlug },
        include: {
            users: {
                where: { userId: session.user.id },
                select: { role: true }
            }
        }
    });

    if (!business || business.users.length === 0) {
        redirect('/onboarding');
    }

    console.log('Staff Page Debug:', {
        businessId: business.id,
        businessName: business.name,
        userRole: business.users[0]?.role
    });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <div className="border-b bg-white shadow-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center space-x-4">
                            <a
                                href={`/dashboard/${params.businessSlug}`}
                                className="text-sm text-gray-600 hover:text-gray-900"
                            >
                                ← Back to Dashboard
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <StaffList businessId={business.id} />
            </main>
        </div>
    );
}