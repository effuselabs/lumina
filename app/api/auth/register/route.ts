import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { UserRole } from '@prisma/client';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters').optional(),
  role: z.enum(['OWNER', 'STAFF', 'CLIENT']).default('OWNER'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, businessName, role } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as UserRole,
      },
    });

    // If registering as owner and business name provided, create business
    if (role === 'OWNER' && businessName) {
      const businessSlug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Ensure unique slug
      let uniqueSlug = businessSlug;
      let counter = 1;
      while (await prisma.business.findUnique({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${businessSlug}-${counter}`;
        counter++;
      }

      const business = await prisma.business.create({
        data: {
          name: businessName,
          slug: uniqueSlug,
          users: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Account and business created successfully',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          business: {
            id: business.id,
            name: business.name,
            slug: business.slug,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}