import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId } = params;

    // Verify user has access to this business
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId,
        userId: session.user.id,
      },
      include: {
        business: true,
      },
    });

    if (!businessUser) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Get basic business statistics
    const [clientCount, appointmentCount, serviceCount, todayAppointments] =
      await Promise.all([
        prisma.client.count({
          where: { businessId },
        }),
        prisma.appointment.count({
          where: { businessId },
        }),
        prisma.service.count({
          where: { businessId, active: true },
        }),
        prisma.appointment.count({
          where: {
            businessId,
            startTime: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }),
      ]);

    // Calculate monthly revenue (simplified)
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const monthlyRevenue = await prisma.transaction.aggregate({
      where: {
        businessId,
        status: 'COMPLETED',
        createdAt: {
          gte: monthStart,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return NextResponse.json({
      clients: clientCount,
      appointments: appointmentCount,
      services: serviceCount,
      todayAppointments,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Business stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
