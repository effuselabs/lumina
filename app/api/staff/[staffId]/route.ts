import { auth } from '@/auth';
import { requireBusinessAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for staff updates
const updateStaffSchema = z.object({
    displayName: z.string().min(1).max(100).optional(),
    title: z.string().optional(),
    bio: z.string().optional(),
    employmentType: z.enum(['COMMISSION', 'CHAIR_RENTAL', 'HYBRID']).optional(),
    commissionRate: z.number().min(0).max(100).optional(),
    chairRentalAmount: z.number().min(0).optional(),
    chairRentalPeriod: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
    baseSalary: z.number().min(0).optional(),
    workingHours: z.record(z.any()).optional(),
    isActive: z.boolean().optional(),
    acceptsOnlineBookings: z.boolean().optional(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: { staffId: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { staffId } = params;

        // Get staff with business info for access verification
        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            include: {
                business: true,
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
                                category: true,
                            },
                        },
                    },
                },
                appointments: {
                    where: {
                        startTime: {
                            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                        },
                    },
                    include: {
                        client: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                        services: {
                            include: {
                                service: {
                                    select: {
                                        name: true,
                                        price: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: {
                        startTime: 'desc',
                    },
                    take: 10, // Recent appointments for performance overview
                },
                paymentCalculations: {
                    orderBy: {
                        calculationPeriodStart: 'desc',
                    },
                    take: 6, // Last 6 periods for trend analysis
                },
            },
        });

        if (!staff) {
            return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
        }

        // Verify business access
        await requireBusinessAccess(staff.businessId);

        return NextResponse.json({ staff });
    } catch (error) {
        console.error('Error fetching staff:', error);
        return NextResponse.json(
            { error: 'Failed to fetch staff member' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { staffId: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { staffId } = params;
        const body = await request.json();
        const validation = updateStaffSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: validation.error.errors },
                { status: 400 }
            );
        }

        const updateData = validation.data;

        // Get current staff to verify business access
        const currentStaff = await prisma.staff.findUnique({
            where: { id: staffId },
            select: { businessId: true, employmentType: true },
        });

        if (!currentStaff) {
            return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
        }

        // Verify business access and permissions
        await requireBusinessAccess(currentStaff.businessId, ['OWNER', 'MANAGER']);

        // Validate employment type changes
        if (updateData.employmentType) {
            if (updateData.employmentType === 'COMMISSION' && !updateData.commissionRate) {
                return NextResponse.json(
                    { error: 'Commission rate is required for commission employees' },
                    { status: 400 }
                );
            }

            if (updateData.employmentType === 'CHAIR_RENTAL') {
                if (!updateData.chairRentalAmount || !updateData.chairRentalPeriod) {
                    return NextResponse.json(
                        { error: 'Chair rental amount and period are required for chair rental contractors' },
                        { status: 400 }
                    );
                }
            }

            if (updateData.employmentType === 'HYBRID') {
                if (!updateData.commissionRate || !updateData.chairRentalAmount || !updateData.chairRentalPeriod) {
                    return NextResponse.json(
                        { error: 'Commission rate, chair rental amount, and period are required for hybrid employees' },
                        { status: 400 }
                    );
                }
            }
        }

        // Update staff profile
        const updatedStaff = await prisma.staff.update({
            where: { id: staffId },
            data: updateData,
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
                paymentCalculations: {
                    orderBy: {
                        calculationPeriodStart: 'desc',
                    },
                    take: 3,
                },
            },
        });

        return NextResponse.json({ staff: updatedStaff });
    } catch (error) {
        console.error('Error updating staff:', error);
        return NextResponse.json(
            { error: 'Failed to update staff member' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { staffId: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { staffId } = params;

        // Get current staff to verify business access
        const currentStaff = await prisma.staff.findUnique({
            where: { id: staffId },
            select: { businessId: true },
        });

        if (!currentStaff) {
            return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
        }

        // Verify business access and permissions (only owners can delete staff)
        await requireBusinessAccess(currentStaff.businessId, ['OWNER']);

        // Check for active appointments
        const activeAppointments = await prisma.appointment.count({
            where: {
                staffId,
                status: {
                    in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
                },
                startTime: {
                    gte: new Date(),
                },
            },
        });

        if (activeAppointments > 0) {
            return NextResponse.json(
                { error: 'Cannot delete staff member with active future appointments' },
                { status: 409 }
            );
        }

        // Soft delete by setting isActive to false and endDate
        const deletedStaff = await prisma.staff.update({
            where: { id: staffId },
            data: {
                isActive: false,
                endDate: new Date(),
            },
        });

        return NextResponse.json({
            message: 'Staff member deactivated successfully',
            staff: deletedStaff
        });
    } catch (error) {
        console.error('Error deleting staff:', error);
        return NextResponse.json(
            { error: 'Failed to delete staff member' },
            { status: 500 }
        );
    }
}