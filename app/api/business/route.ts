import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for business creation
const businessSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters').max(255),
  description: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().default('US'),
  timezone: z.string().default('America/New_York'),
  financialModel: z.enum(['COMMISSION', 'CHAIR_RENTAL', 'HOURLY', 'HYBRID']).default('COMMISSION'),
  currency: z.string().default('USD'),
  bookingEnabled: z.boolean().default(true),
  onlineBooking: z.boolean().default(true),
  requireDeposit: z.boolean().default(false),
  depositAmount: z.number().optional(),
  cancellationPolicy: z.string().optional(),
  operatingHours: z.any().optional(),
  logo: z.string().optional(),
  primaryColor: z.string().default('#FFD25A'),
});

// POST /api/business - Create a new business
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate business data
    const validatedData = businessSchema.parse(body);

    // Generate a unique slug from the business name
    const baseSlug = validatedData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;

    // Ensure slug is unique
    while (await prisma.business.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create the business
    const business = await prisma.business.create({
      data: {
        ...validatedData,
        slug,
        // Convert empty strings to null for optional fields
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        website: validatedData.website || null,
        address: validatedData.address || null,
        city: validatedData.city || null,
        state: validatedData.state || null,
        zipCode: validatedData.zipCode || null,
        description: validatedData.description || null,
        cancellationPolicy: validatedData.cancellationPolicy || null,
        depositAmount: validatedData.depositAmount || null,
        logo: validatedData.logo || null,
      },
    });

    // Create the business-user relationship with owner role
    await prisma.businessUser.create({
      data: {
        businessId: business.id,
        userId: session.user.id,
        role: 'OWNER',
      },
    });

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating business:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/business - Get current user's businesses
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businesses = await prisma.businessUser.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        business: true,
      },
    });

    return NextResponse.json({ businesses });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}