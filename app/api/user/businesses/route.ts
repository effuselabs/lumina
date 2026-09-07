import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/user/businesses - Get current user's businesses
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businesses = await prisma.businessUser.findMany({
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
    });

    const formattedBusinesses = businesses.map(businessUser => ({
      businessId: businessUser.business.id,
      businessName: businessUser.business.name,
      businessSlug: businessUser.business.slug,
      role: businessUser.role,
    }));

    return NextResponse.json({ businesses: formattedBusinesses });
  } catch (error) {
    console.error('Error fetching user businesses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
