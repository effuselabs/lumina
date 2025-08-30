import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for service updates
const updateServiceSchema = z.object({
    name: z.string().min(1, 'Service name is required').max(255).optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    price: z.number().min(0, 'Price must be positive').optional(),
    duration: z.number().min(1, 'Duration must be at least 1 minute').optional(),
    isActive: z.boolean().optional(),
    isOnline: z.boolean().optional(),
});

// GET /api/services/[id] - Get a specific service
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const serviceId = params.id;

        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: {
                business: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                staff: {
                    include: {
                        staff: {
                            select: {
                                id: true,
                                displayName: true,
                                avatar: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        appointments: true,
                    },
                },
            },
        });

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        // Verify user has access to this business
        const businessUser = await prisma.businessUser.findFirst({
            where: {
                businessId: service.businessId,
                userId: session.user.id,
            },
        });

        if (!businessUser) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json({ service });
    } catch (error) {
        console.error('Error fetching service:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT /api/services/[id] - Update a service
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const serviceId = params.id;
        const body = await request.json();

        // Get the existing service to verify access
        const existingService = await prisma.service.findUnique({
            where: { id: serviceId },
            select: { businessId: true },
        });

        if (!existingService) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        // Verify user has access to this business
        const businessUser = await prisma.businessUser.findFirst({
            where: {
                businessId: existingService.businessId,
                userId: session.user.id,
                role: { in: ['OWNER', 'MANAGER'] }, // Only owners and managers can update services
            },
        });

        if (!businessUser) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Validate update data
        const validatedData = updateServiceSchema.parse(body);

        // Update the service
        const service = await prisma.service.update({
            where: { id: serviceId },
            data: validatedData,
            include: {
                staff: {
                    include: {
                        staff: {
                            select: {
                                id: true,
                                displayName: true,
                                avatar: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        appointments: true,
                    },
                },
            },
        });

        return NextResponse.json({ service });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error updating service:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/services/[id] - Soft delete a service
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const serviceId = params.id;

        // Get the existing service to verify access
        const existingService = await prisma.service.findUnique({
            where: { id: serviceId },
            select: {
                businessId: true,
                _count: {
                    select: {
                        appointments: {
                            where: {
                                status: { in: ['SCHEDULED', 'CONFIRMED'] }
                            }
                        }
                    }
                }
            },
        });

        if (!existingService) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        // Verify user has access to this business
        const businessUser = await prisma.businessUser.findFirst({
            where: {
                businessId: existingService.businessId,
                userId: session.user.id,
                role: { in: ['OWNER', 'MANAGER'] }, // Only owners and managers can delete services
            },
        });

        if (!businessUser) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Check if service has active appointments
        if (existingService._count.appointments > 0) {
            return NextResponse.json(
                {
                    error: 'Cannot delete service with active appointments. Please deactivate instead.',
                    hasActiveAppointments: true
                },
                { status: 400 }
            );
        }

        // Soft delete by setting isActive to false
        const service = await prisma.service.update({
            where: { id: serviceId },
            data: {
                isActive: false,
                isOnline: false
            },
        });

        return NextResponse.json({
            message: 'Service deactivated successfully',
            service
        });
    } catch (error) {
        console.error('Error deleting service:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}