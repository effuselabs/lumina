import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for client creation
const createClientSchema = z
  .object({
    businessId: z.string().cuid(),
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    preferredStaff: z
      .string()
      .optional()
      .refine(
        val => {
          if (!val || val === '' || val === 'none') return true;
          return /^c[a-z0-9]{24}$/.test(val);
        },
        { message: 'preferredStaff must be a valid CUID when provided' }
      ),
    notes: z.string().optional(),
    emailMarketing: z.boolean().default(true),
    smsMarketing: z.boolean().default(true),
  })
  .transform(data => ({
    ...data,
    email: data.email || undefined,
    preferredStaff:
      data.preferredStaff &&
      data.preferredStaff !== '' &&
      data.preferredStaff !== 'none'
        ? data.preferredStaff
        : undefined,
    address: data.address || undefined,
    city: data.city || undefined,
    state: data.state || undefined,
    zipCode: data.zipCode || undefined,
    notes: data.notes || undefined,
  }));

// GET /api/clients - List clients for a business
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const search = searchParams.get('search');
    const staffId = searchParams.get('staffId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'firstName';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this business
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId,
        userId: session.user.id,
      },
    });

    if (!businessUser) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build where clause
    const where: {
      businessId: string;
      OR?: Array<{
        firstName?: { contains: string; mode: 'insensitive' };
        lastName?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
        phone?: { contains: string; mode: 'insensitive' };
      }>;
      preferredStaff?: string;
    } = {
      businessId,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (staffId && staffId !== 'all') {
      where.preferredStaff = staffId;
    }

    // Build order by clause
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    if (
      sortBy === 'firstName' ||
      sortBy === 'lastName' ||
      sortBy === 'createdAt'
    ) {
      orderBy[sortBy] = sortOrder as 'asc' | 'desc';
    }

    // Get total count
    const totalCount = await prisma.client.count({ where });

    // Get clients with pagination
    const clients = await prisma.client.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        appointments: {
          orderBy: { startTime: 'desc' },
          take: 1,
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
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    });

    // Transform data for frontend
    const transformedClients = clients.map(client => ({
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      preferredStaff: client.preferredStaff,
      appointmentCount: client._count.appointments,
      lastAppointment: client.appointments[0] || null,
      createdAt: client.createdAt.toISOString(),
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      clients: transformedClients,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/clients - Create a new client
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createClientSchema.parse(body);

    // Verify user has access to this business
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId: validatedData.businessId,
        userId: session.user.id,
        role: { in: ['OWNER', 'MANAGER', 'STAFF'] }, // All roles can create clients
      },
    });

    if (!businessUser) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create the client
    const client = await prisma.client.create({
      data: validatedData,
      include: {
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
