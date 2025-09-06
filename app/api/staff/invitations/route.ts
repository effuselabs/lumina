import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const invitationsQuerySchema = z.object({
    businessId: z.string(),
});

export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const queryParams = Object.fromEntries(searchParams.entries());

        const { businessId } = invitationsQuerySchema.parse(queryParams);

        // Verify user has access to this business
        const businessUser = await prisma.businessUser.findFirst({
            where: {
                businessId,
                userId: session.user.id
            }
        });

        if (!businessUser) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Fetch pending invitations
        const invitations = await prisma.staffInvitation.findMany({
            where: {
                businessId,
                status: 'PENDING'
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ invitations });

    } catch (error) {
        console.error('Error fetching staff invitations:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid query parameters', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { invitationId } = await request.json();

        // Get invitation and verify business access
        const invitation = await prisma.staffInvitation.findUnique({
            where: { id: invitationId },
            include: {
                business: {
                    include: {
                        users: {
                            where: { userId: session.user.id },
                            select: { role: true }
                        }
                    }
                }
            }
        });

        if (!invitation) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        if (invitation.business.users.length === 0) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Check if user has permission to cancel invitations (OWNER or MANAGER)
        const userRole = invitation.business.users[0].role;
        if (!['OWNER', 'MANAGER'].includes(userRole)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Delete the invitation
        await prisma.staffInvitation.delete({
            where: { id: invitationId }
        });

        return NextResponse.json({ message: 'Invitation cancelled successfully' });

    } catch (error) {
        console.error('Error cancelling staff invitation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}