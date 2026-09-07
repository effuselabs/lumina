import { bookingAnalytics } from '@/lib/analytics/booking-analytics';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const trackEventSchema = z.object({
  businessId: z.string(),
  eventType: z.enum([
    'booking_started',
    'service_selected',
    'time_selected',
    'form_submitted',
    'booking_completed',
    'booking_abandoned',
  ]),
  sessionId: z.string(),
  metadata: z.record(z.any()).optional(),
  userId: z.string().optional(),
  clientId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = trackEventSchema.parse(body);

    await bookingAnalytics.trackEvent({
      ...validatedData,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking analytics event:', error);

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
