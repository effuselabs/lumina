import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const inviteSchema = z.object({
  businessId: z.string(),
  email: z.string().email(),
  displayName: z.string().min(1).max(100),
  title: z.string().optional(),
  role: z.enum(['STAFF', 'MANAGER']).default('STAFF'),
  employmentType: z.enum(['COMMISSION', 'CHAIR_RENTAL', 'HYBRID']),
  commissionRate: z.number().min(0).max(100).optional(),
  chairRentalAmount: z.number().min(0).optional(),
  chairRentalPeriod: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  baseSalary: z.number().min(0).optional(),
  message: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = inviteSchema.parse(body);

    // Verify user has access to this business and can invite staff
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId: validatedData.businessId,
        userId: session.user.id,
        role: { in: ['OWNER', 'MANAGER'] },
      },
      include: {
        business: true,
      },
    });

    if (!businessUser) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      // Check if they're already part of this business
      const existingBusinessUser = await prisma.businessUser.findFirst({
        where: {
          businessId: validatedData.businessId,
          userId: existingUser.id,
        },
      });

      if (existingBusinessUser) {
        return NextResponse.json(
          { error: 'User is already part of this business' },
          { status: 409 }
        );
      }
    }

    // Check for existing pending invitations
    const existingInvitation = await prisma.staffInvitation.findFirst({
      where: {
        businessId: validatedData.businessId,
        email: validatedData.email,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        {
          error:
            'A pending invitation already exists for this email address. Please wait for them to accept or contact support to resend.',
        },
        { status: 409 }
      );
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Prepare staff data as JSON
    const staffData = {
      displayName: validatedData.displayName,
      title: validatedData.title,
      employmentType: validatedData.employmentType,
      commissionRate: validatedData.commissionRate,
      chairRentalAmount: validatedData.chairRentalAmount,
      chairRentalPeriod: validatedData.chairRentalPeriod,
      baseSalary: validatedData.baseSalary,
    };

    // Create staff invitation
    const invitation = await prisma.staffInvitation.create({
      data: {
        businessId: validatedData.businessId,
        email: validatedData.email,
        role: validatedData.role,
        staffData,
        message: validatedData.message,
        token,
        expiresAt,
        invitedBy: session.user.id,
        status: 'PENDING',
      },
    });

    // TODO: Send invitation email
    console.log('Staff invitation created:', {
      id: invitation.id,
      email: validatedData.email,
      businessName: businessUser.business.name,
      token,
    });

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
      },
    });
  } catch (error) {
    console.error('Error creating staff invitation:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    // Handle Prisma unique constraint errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        // Unique constraint failed
        const meta = (error as any).meta;
        if (meta?.target?.includes('email')) {
          return NextResponse.json(
            {
              error:
                'An invitation has already been sent to this email address for this business',
            },
            { status: 409 }
          );
        }
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
