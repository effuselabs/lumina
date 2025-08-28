import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateSlug } from '@/lib/utils';
import { businessProfileSchema } from '@/lib/validations/business';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's businesses
    const businesses = await prisma.business.findMany({
      where: {
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        users: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ businesses });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
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
    const validatedData = businessProfileSchema.parse(body);

    // Generate unique slug
    const baseSlug = generateSlug(validatedData.name);
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.business.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create business with transaction
    const business = await prisma.$transaction(async tx => {
      // Create business
      const newBusiness = await tx.business.create({
        data: {
          ...validatedData,
          slug,
          operatingHours: validatedData.operatingHours || {},
          description: validatedData.description || null,
          email: validatedData.email || null,
          phone: validatedData.phone || null,
          website: validatedData.website || null,
          cancellationPolicy: validatedData.cancellationPolicy || null,
        },
      });

      // Add user as owner
      await tx.businessUser.create({
        data: {
          businessId: newBusiness.id,
          userId: session.user.id,
          role: 'OWNER',
        },
      });

      return newBusiness;
    });

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error creating business:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid data provided', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create business' },
      { status: 500 }
    );
  }
}
