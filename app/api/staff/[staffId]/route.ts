import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    staffId: string;
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { staffId } = params;

    // Get staff member and verify business access
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        business: {
          include: {
            users: {
              where: { userId: session.user.id },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    if (staff.business.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user has permission to deactivate staff (OWNER or MANAGER)
    const userRole = staff.business.users[0].role;
    if (!['OWNER', 'MANAGER'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Soft delete - set isActive to false instead of deleting
    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Staff member deactivated successfully',
      staff: updatedStaff,
    });
  } catch (error) {
    console.error('Error deactivating staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { staffId } = params;
    const body = await request.json();

    // Get staff member and verify business access
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        business: {
          include: {
            users: {
              where: { userId: session.user.id },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    if (staff.business.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Separate staff data from role data
    const { role, ...staffData } = body;

    // Update staff member (without role)
    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: {
        ...staffData,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Update role in BusinessUser if provided
    if (role) {
      await prisma.businessUser.update({
        where: {
          businessId_userId: {
            businessId: staff.businessId,
            userId: staff.userId,
          },
        },
        data: { role },
      });
    }

    return NextResponse.json({ staff: updatedStaff });
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
