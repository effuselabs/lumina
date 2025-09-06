import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const staffQuerySchema = z.object({
    businessId: z.string(),
    includeInactive: z.string().optional().transform(val => val === 'true'),
    employmentType: z.enum(['COMMISSION', 'CHAIR_RENTAL', 'HYBRID']).optional()
});

export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const queryParams = Object.fromEntries(searchParams.entries());

        const { businessId, includeInactive, employmentType } = staffQuerySchema.parse(queryParams);

        // Verify user has access to this business
        const businessUser = await prisma.businessUser.findFirst({
            where: {
                businessId,
                userId: session.user.id
            }
        });

        if (!businessUser) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Build where clause for staff query
        const whereClause: any = {
            businessId
        };

        if (!includeInactive) {
            whereClause.isActive = true;
        }

        if (employmentType) {
            whereClause.employmentType = employmentType;
        }

        // Fetch staff with related data
        const staff = await prisma.staff.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        image: true
                    }
                },
                paymentCalculations: {
                    select: {
                        id: true,
                        calculationPeriodStart: true,
                        calculationPeriodEnd: true
                    },
                    orderBy: {
                        calculationPeriodStart: 'desc'
                    },
                    take: 5
                },
                _count: {
                    select: {
                        appointments: {
                            where: {
                                startTime: {
                                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                                }
                            }
                        }
                    }
                }
            },
            orderBy: [
                { isActive: 'desc' },
                { displayName: 'asc' }
            ]
        });

        console.log('Staff API Debug:', {
            businessId,
            whereClause,
            staffCount: staff.length,
            staff: staff.map(s => ({ id: s.id, displayName: s.displayName, isActive: s.isActive }))
        });

        return NextResponse.json({ staff });

    } catch (error) {
        console.error('Error fetching staff:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid query parameters', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}