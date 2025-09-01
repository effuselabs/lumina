import { acceptStaffInvitation } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const acceptInviteSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    name: z.string().min(1, 'Name is required').max(100),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validation = acceptInviteSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { token, name, password } = validation.data;

        const result = await acceptStaffInvitation(token, { name, password });

        return NextResponse.json({
            message: 'Invitation accepted successfully',
            user: {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
            },
            business: result.business,
        }, { status: 201 });
    } catch (error) {
        console.error('Error accepting invitation:', error);

        const message = error instanceof Error ? error.message : 'Failed to accept invitation';
        let status = 500;

        if (message.includes('Invalid') || message.includes('expired') || message.includes('used')) {
            status = 400;
        }

        return NextResponse.json(
            { error: message },
            { status }
        );
    }
}