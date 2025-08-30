import { signOut } from '@/auth';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    await signOut();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 });
  }
}

export async function GET() {
  try {
    await signOut();
    return NextResponse.redirect(
      new URL('/', process.env.NEXTAUTH_URL || 'http://localhost:3000')
    );
  } catch {
    return NextResponse.redirect(
      new URL('/', process.env.NEXTAUTH_URL || 'http://localhost:3000')
    );
  }
}
