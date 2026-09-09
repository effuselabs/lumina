import { decideSignup, isOpenSignupEnabled } from '@/lib/auth/signup-policy';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  businessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .optional(),
  // No `role`. It used to be accepted from the request body and defaulted to
  // OWNER, so a caller could name their own privileges. Registration creates
  // the owner of a new business and nothing else; staff arrive through
  // /api/staff/invite/accept, which carries a single-use token.
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = registerSchema.parse(body);

    // Is anyone allowed to create an account here at all?
    const decision = decideSignup({
      openSignupEnabled: isOpenSignupEnabled(),
      existingUserCount: await prisma.user.count(),
    });

    if (!decision.allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Registration is closed on this instance. Ask an owner for an invitation.',
        },
        { status: 403 }
      );
    }

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
        role: 'OWNER',
      },
    });

    // Note: Business creation is handled during the onboarding process
    // Users will be redirected to onboarding after successful registration

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
