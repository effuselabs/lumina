import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    staffId: string;
  };
}

// GET /api/availability/staff/:staffId
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 401 }
      );
    }

    const businessId = session.user.businessId;
    const { staffId } = params;
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Verify staff belongs to the business
    const staff = await prisma.staff.findFirst({
      where: {
        id: staffId,
        businessId,
      },
      select: {
        id: true,
        displayName: true,
        workingHours: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found or not authorized' },
        { status: 404 }
      );
    }

    // Get structured availability data
    let availability = await prisma.staffAvailability.findMany({
      where: {
        staffId,
        businessId,
        ...(startDate && endDate
          ? {
              OR: [
                { isRecurring: true },
                {
                  AND: [
                    { effectiveDate: { lte: new Date(endDate) } },
                    {
                      OR: [
                        { expiryDate: null },
                        { expiryDate: { gte: new Date(startDate) } },
                      ],
                    },
                  ],
                },
              ],
            }
          : {}),
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // If no structured data, try to get from JSON field
    if (availability.length === 0 && staff.workingHours) {
      const jsonHours = staff.workingHours as any;
      const days = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];

      availability = days.flatMap((day, index) => {
        const dayData = jsonHours[day];
        if (!dayData?.isWorking || !dayData.startTime || !dayData.endTime) {
          return [];
        }

        return [
          {
            id: `temp-${index}`,
            staffId,
            businessId,
            dayOfWeek: index,
            startTime: dayData.startTime,
            endTime: dayData.endTime,
            isRecurring: true,
            effectiveDate: null,
            expiryDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      });
    }

    // Get availability overrides for the date range if specified
    let overrides: any[] = [];
    if (startDate && endDate) {
      overrides = await prisma.staffAvailabilityOverride.findMany({
        where: {
          staffId,
          businessId,
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        orderBy: { date: 'asc' },
      });
    }

    return NextResponse.json({
      staff: {
        id: staff.id,
        name: staff.displayName,
      },
      availability,
      overrides,
    });
  } catch (error) {
    console.error('Error fetching staff availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff availability' },
      { status: 500 }
    );
  }
}
