import { verifyInviteToken } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    const invitation = await verifyInviteToken(token);

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error('Error verifying invitation:', error);

    const message =
      error instanceof Error ? error.message : 'Invalid invitation token';
    const status = message.includes('expired') ? 410 : 404;

    return NextResponse.json({ error: message }, { status });
  }
}
