import { auth } from '@/auth';
import { generateInviteToken, requireBusinessAccess } from '@/lib/auth';
import { sendEmail } from '@/lib/email/send-email';
import { StaffInvitationEmail } from '@/lib/email/templates/staff-invitation';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for staff invitation
const inviteStaffSchema = z.object({
    businessId: z.string().uuid(),
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
        const validation = inviteStaffSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { businessId, email, ...inviteData } = validation.data;

        // Verify business access and permissions (only owners and managers can invite)
        const { businessUser } = await requireBusinessAccess(businessId, ['OWNER', 'MANAGER']);

        // Get business details for the invitation
        const business = await prisma.business.findUnique({
            where: { id: businessId },
            select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
            },
        });

        if (!business) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
            include: {
                businesses: {
                    where: { businessId },
                },
                staffProfile: {
                    where: { businessId },
                },
            },
        });

        if (existingUser?.businesses && existingUser.businesses.length > 0) {
            return NextResponse.json(
                { error: 'User is already a member of this business' },
                { status: 409 }
            );
        }

        // Validate employment type configuration
        if (inviteData.employmentType === 'COMMISSION' && !inviteData.commissionRate) {
            return NextResponse.json(
                { error: 'Commission rate is required for commission employees' },
                { status: 400 }
            );
        }

        if (inviteData.employmentType === 'CHAIR_RENTAL') {
            if (!inviteData.chairRentalAmount || !inviteData.chairRentalPeriod) {
                return NextResponse.json(
                    { error: 'Chair rental amount and period are required for chair rental contractors' },
                    { status: 400 }
                );
            }
        }

        if (inviteData.employmentType === 'HYBRID') {
            if (!inviteData.commissionRate || !inviteData.chairRentalAmount || !inviteData.chairRentalPeriod) {
                return NextResponse.json(
                    { error: 'Commission rate, chair rental amount, and period are required for hybrid employees' },
                    { status: 400 }
                );
            }
        }

        // Generate invitation token
        const inviteToken = generateInviteToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create staff invitation record
        const invitation = await prisma.staffInvitation.create({
            data: {
                businessId,
                email,
                invitedBy: session.user.id,
                token: inviteToken,
                expiresAt,
                role: inviteData.role,
                staffData: {
                    displayName: inviteData.displayName,
                    title: inviteData.title,
                    employmentType: inviteData.employmentType,
                    commissionRate: inviteData.commissionRate,
                    chairRentalAmount: inviteData.chairRentalAmount,
                    chairRentalPeriod: inviteData.chairRentalPeriod,
                    baseSalary: inviteData.baseSalary,
                },
                message: inviteData.message,
            },
        });

        // Send invitation email
        const inviteUrl = `${process.env.NEXTAUTH_URL}/auth/staff-invite?token=${inviteToken}`;

        await sendEmail({
            to: email,
            subject: `You're invited to join ${business.name} on Lumina`,
            react: StaffInvitationEmail({
                businessName: business.name,
                inviterName: session.user.name || 'Team member',
                inviteUrl,
                displayName: inviteData.displayName,
                title: inviteData.title,
                employmentType: inviteData.employmentType,
                message: inviteData.message,
                expiresAt,
            }),
        });

        return NextResponse.json({
            message: 'Staff invitation sent successfully',
            invitation: {
                id: invitation.id,
                email: invitation.email,
                expiresAt: invitation.expiresAt,
                status: invitation.status,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Error sending staff invitation:', error);
        return NextResponse.json(
            { error: 'Failed to send staff invitation' },
            { status: 500 }
        );
    }
}