import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateClientSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    preferredStaff: z.string().optional(),
    notes: z.string().optional(),
    emailMarketing: z.boolean().default(true),
    smsMarketing: z.boolean().default(true),
});

export async function GET(
    request: NextRequest,
    { params }: { params: { clientId: string } }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's business
        const userBusiness = await prisma.businessUser.findFirst({
            where: { userId: session.user.id },
            include: { business: true },
        });

        if (!userBusiness) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        // Get client with appointment history
        const client = await prisma.client.findFirst({
            where: {
                id: params.clientId,
                businessId: userBusiness.businessId,
            },
            include: {
                _count: {
                    select: {
                        appointments: true,
                    },
                },
                appointments: {
                    orderBy: { startTime: 'desc' },
                    include: {
                        staff: {
                            select: {
                                id: true,
                                displayName: true,
                                avatar: true,
                            },
                        },
                        services: {
                            include: {
                                service: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                        transactions: {
                            select: {
                                amount: true,
                                paymentMethod: true,
                                status: true,
                            },
                        },
                    },
                },
            },
        });

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...client,
            appointmentCount: client._count.appointments,
        });
    } catch (error) {
        console.error('Error fetching client:', error);
        return NextResponse.json(
            { error: 'Failed to fetch client' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { clientId: string } }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's business
        const userBusiness = await prisma.businessUser.findFirst({
            where: { userId: session.user.id },
            include: { business: true },
        });

        if (!userBusiness) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        // Verify client exists and belongs to business
        const existingClient = await prisma.client.findFirst({
            where: {
                id: params.clientId,
                businessId: userBusiness.businessId,
            },
        });

        if (!existingClient) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        const body = await request.json();
        const data = updateClientSchema.parse(body);

        // Check for duplicate email or phone (excluding current client)
        if (data.email) {
            const duplicateEmail = await prisma.client.findFirst({
                where: {
                    businessId: userBusiness.businessId,
                    email: data.email,
                    id: { not: params.clientId },
                },
            });

            if (duplicateEmail) {
                return NextResponse.json(
                    { error: 'A client with this email already exists' },
                    { status: 400 }
                );
            }
        }

        if (data.phone) {
            const duplicatePhone = await prisma.client.findFirst({
                where: {
                    businessId: userBusiness.businessId,
                    phone: data.phone,
                    id: { not: params.clientId },
                },
            });

            if (duplicatePhone) {
                return NextResponse.json(
                    { error: 'A client with this phone number already exists' },
                    { status: 400 }
                );
            }
        }

        // Update client
        const updatedClient = await prisma.client.update({
            where: { id: params.clientId },
            data: {
                ...data,
                email: data.email || null,
            },
            include: {
                _count: {
                    select: {
                        appointments: true,
                    },
                },
            },
        });

        return NextResponse.json({
            ...updatedClient,
            appointmentCount: updatedClient._count.appointments,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error updating client:', error);
        return NextResponse.json(
            { error: 'Failed to update client' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { clientId: string } }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's business
        const userBusiness = await prisma.businessUser.findFirst({
            where: { userId: session.user.id },
            include: { business: true },
        });

        if (!userBusiness) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        // Verify client exists and belongs to business
        const existingClient = await prisma.client.findFirst({
            where: {
                id: params.clientId,
                businessId: userBusiness.businessId,
            },
            include: {
                _count: {
                    select: {
                        appointments: true,
                    },
                },
            },
        });

        if (!existingClient) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        // Check if client has appointments
        if (existingClient._count.appointments > 0) {
            return NextResponse.json(
                { error: 'Cannot delete client with existing appointments' },
                { status: 400 }
            );
        }

        // Delete client
        await prisma.client.delete({
            where: { id: params.clientId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting client:', error);
        return NextResponse.json(
            { error: 'Failed to delete client' },
            { status: 500 }
        );
    }
}