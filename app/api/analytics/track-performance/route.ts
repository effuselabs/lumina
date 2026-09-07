import { createPerformanceMonitor } from '@/lib/monitoring/booking-performance-monitor';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const trackPerformanceSchema = z.object({
  businessId: z.string(),
  eventType: z.enum(['page_load', 'api_response', 'error', 'user_interaction']),
  duration: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  errorDetails: z
    .object({
      message: z.string(),
      stack: z.string().optional(),
      code: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = trackPerformanceSchema.parse(body);

    const performanceMonitor = createPerformanceMonitor(
      validatedData.businessId
    );

    await performanceMonitor.trackPerformance({
      ...validatedData,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking performance metric:', error);

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
