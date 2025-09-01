import { auth } from '@/auth';
import { requireBusinessAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for staff creation
const createStaffSchema = z.object({
    businessId: z.string().uuid(),
    userId: z.string().uuid(),
    displayName: z.string().min(1).max(100),
    title: z.string().optional(),
    bio: z.string().optional(),
    employmentType: z.enum(['COMMISSION', 'CHAIR_RENTAL', 'HYBRID']),
    commissionRate: z.number().min(0).max(100).optional(),
    chairRentalAmount: z.number().min(0).optional(),
    chairRentalPeriod: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
    baseSalary: z.number().min(0).optional(),
    workingHours: z.record(z.any()).optional(),
});

// Validation schema for staff query parameters
const staffQuerySchema = z.object({
    businessId: z.string().uuid(),
    includeInactive: z.string().optional().transform(val => val === 'true'),
    employmentType: z.enum(['COMMISSION', 'CHAIR_RENTAL', 'HYBRID']).optional(),
});

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const validation = staffQuerySchema.safeParse({
            businessId: searchParams.get('businessId'),
            includeInactive: searchParams.get('includeInactive'),
            employmentType: searchParams.get('employmentType'),
        });

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid parameters', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { businessId, includeInactive, employmentType } = validation.data;

        // Verify business access
        await requireBusinessAccess(businessId);

        // Build where clause
        const whereClause: any = {
            businessId,
        };

        if (!includeInactive) {
            whereClause.isActive = true;
        }

        if (employmentType) {
            whereClause.employmentType = employmentType;
        }

        const staff = await prisma.staff.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                services: {
                    include: {
                        service: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                duration: true,
                            },
                        },
                    },
                },
                paymentCalculations: {
                    orderBy: {
                        calculationPeriodStart: 'desc',
                    },
                    take: 3, // Last 3 calculations for performance metrics
                },
                _count: {
                    select: {
                        appointments: {
                            where: {
                                status: {
                                    in: ['COMPLETED'],
                                },
                                createdAt: {
                                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                                },
                            },
                        },
                    },
                },
            },
            orderBy: [
                { isActive: 'desc' },
                { displayName: 'asc' },
            ],
        });

        return NextResponse.json({ staff });
    } catch (error) {
        console.error('Error fetching staff:', error);
        return NextResponse.json(
            { error: 'Failed to fetch staff' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = createStaffSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { businessId, userId, ...staffData } = validation.data;

        // Verify business access and permissions
        const { businessUser } = await requireBusinessAccess(businessId, ['OWNER', 'MANAGER']);

        // Check if user already has a staff profile for this business
        const existingStaff = await prisma.staff.findFirst({
            where: {
                businessId,
                userId,
            },
        });

        if (existingStaff) {
            return NextResponse.json(
                { error: 'User already has a staff profile for this business' },
                { status: 409 }
            );
        }

        // Validate employment type configuration
        if (staffData.employmentType === 'COMMISSION' && !staffData.commissionRate) {
            return NextResponse.json(
                { error: 'Commission rate is required for commission employees' },
                { status: 400 }
            );
        }

        if (staffData.employmentType === 'CHAIR_RENTAL') {
            if (!staffData.chairRentalAmount || !staffData.chairRentalPeriod) {
                return NextResponse.json(
                    { error: 'Chair rental amount and period are required for chair rental contractors' },
                    { status: 400 }
                );
            }
        }

        if (staffData.employmentType === 'HYBRID') {
            if (!staffData.commissionRate || !staffData.chairRentalAmount || !staffData.chairRentalPeriod) {
                return NextResponse.json(
                    { error: 'Commission rate, chair rental amount, and period are required for hybrid employees' },
                    { status: 400 }
                );
            }
        }

        // Create staff profile
        const newStaff = await prisma.staff.create({
            data: {
                businessId,
                userId,
                ...staffData,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                services: {
                    include: {
                        service: true,
                    },
                },
            },
        });

        return NextResponse.json({ staff: newStaff }, { status: 201 });
    } catch (error) {
        console.error('Error creating staff:', error);
        return NextResponse.json(
            { error: 'Failed to create staff profile' },
            { status: 500 }
        );
    }
}