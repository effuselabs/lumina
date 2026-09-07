import { bookingErrorTracker } from '@/lib/monitoring/booking-error-tracker';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const trackErrorSchema = z.object({
  businessId: z.string(),
  errorType: z.enum([
    'validation',
    'availability',
    'payment',
    'system',
    'network',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: z.string(),
  stack: z.string().optional(),
  context: z.record(z.any()).optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = trackErrorSchema.parse(body);

    await bookingErrorTracker.trackError({
      ...validatedData,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking booking error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
