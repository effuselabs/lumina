import { authConfig } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { businessProfileSchema } from '@/lib/validations/business';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    businessId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const business = await prisma.business.findFirst({
      where: {
        id: params.businessId,
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        users: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
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

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ business });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching business:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to update this business
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId: params.businessId,
        userId: session.user.id,
        role: {
          in: ['OWNER', 'MANAGER'],
        },
      },
    });

    if (!businessUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = businessProfileSchema.partial().parse(body);

    const business = await prisma.business.update({
      where: {
        id: params.businessId,
      },
      data: {
        ...validatedData,
        operatingHours: validatedData.operatingHours || undefined,
      },
    });

    return NextResponse.json({ business });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error updating business:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid data provided', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update business' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is owner of this business
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId: params.businessId,
        userId: session.user.id,
        role: 'OWNER',
      },
    });

    if (!businessUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete business (cascade will handle related records)
    await prisma.business.delete({
      where: {
        id: params.businessId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error deleting business:', error);
    return NextResponse.json(
      { error: 'Failed to delete business' },
      { status: 500 }
    );
  }
}
