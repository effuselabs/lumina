import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createClientSchema = z.object({
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

const searchClientsSchema = z.object({
    search: z.string().optional(),
    staffId: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sortBy: z.enum(['firstName', 'lastName', 'email', 'createdAt']).default('firstName'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export async function GET(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const params = Object.fromEntries(searchParams.entries());

        const {
            search,
            staffId,
            page,
            limit,
            sortBy,
            sortOrder,
        } = searchClientsSchema.parse(params);

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {
            businessId: userBusiness.businessId,
        };

        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (staffId) {
            where.preferredStaff = staffId;
        }

        // Get clients with appointment count
        const [clients, totalCount] = await Promise.all([
            prisma.client.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            appointments: true,
                        },
                    },
                    appointments: {
                        take: 1,
                        orderBy: { startTime: 'desc' },
                        include: {
                            staff: {
                                select: {
                                    displayName: true,
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
                        },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
            }),
            prisma.client.count({ where }),
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        return NextResponse.json({
            clients: clients.map(client => ({
                ...client,
                appointmentCount: client._count.appointments,
                lastAppointment: client.appointments[0] || null,
            })),
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        });
    } catch (error) {
        console.error('Error fetching clients:', error);
        return NextResponse.json(
            { error: 'Failed to fetch clients' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const data = createClientSchema.parse(body);

        // Check for duplicate email or phone
        if (data.email) {
            const existingClient = await prisma.client.findFirst({
                where: {
                    businessId: userBusiness.businessId,
                    email: data.email,
                },
            });

            if (existingClient) {
                return NextResponse.json(
                    { error: 'A client with this email already exists' },
                    { status: 400 }
                );
            }
        }

        if (data.phone) {
            const existingClient = await prisma.client.findFirst({
                where: {
                    businessId: userBusiness.businessId,
                    phone: data.phone,
                },
            });

            if (existingClient) {
                return NextResponse.json(
                    { error: 'A client with this phone number already exists' },
                    { status: 400 }
                );
            }
        }

        // Create client
        const client = await prisma.client.create({
            data: {
                ...data,
                businessId: userBusiness.businessId,
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
            ...client,
            appointmentCount: client._count.appointments,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error creating client:', error);
        return NextResponse.json(
            { error: 'Failed to create client' },
            { status: 500 }
        );
    }
}