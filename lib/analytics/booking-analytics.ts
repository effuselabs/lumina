import { prisma } from '@/lib/prisma';

export interface BookingAnalyticsEvent {
  businessId: string;
  eventType:
    | 'booking_started'
    | 'service_selected'
    | 'time_selected'
    | 'form_submitted'
    | 'booking_completed'
    | 'booking_abandoned';
  sessionId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  userId?: string;
  clientId?: string;
}

export interface BookingConversionMetrics {
  totalSessions: number;
  completedBookings: number;
  conversionRate: number;
  averageTimeToComplete: number;
  abandonmentPoints: {
    serviceSelection: number;
    timeSelection: number;
    formSubmission: number;
  };
}

export interface BookingPerformanceMetrics {
  averagePageLoadTime: number;
  averageApiResponseTime: number;
  errorRate: number;
  mobileUsagePercentage: number;
  peakBookingHours: Array<{ hour: number; count: number }>;
}

export class BookingAnalyticsService {
  async trackEvent(event: BookingAnalyticsEvent): Promise<void> {
    try {
      await prisma.bookingAnalyticsEvent.create({
        data: {
          businessId: event.businessId,
          eventType: event.eventType,
          sessionId: event.sessionId,
          timestamp: event.timestamp,
          metadata: event.metadata || {},
          userId: event.userId,
          clientId: event.clientId,
        },
      });
    } catch (error) {
      console.error('Failed to track booking analytics event:', error);
      // Don't throw - analytics failures shouldn't break booking flow
    }
  }

  async getConversionMetrics(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BookingConversionMetrics> {
    const events = await prisma.bookingAnalyticsEvent.findMany({
      where: {
        businessId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Group events by session
    const sessionMap = new Map<string, BookingAnalyticsEvent[]>();
    events.forEach(event => {
      if (!sessionMap.has(event.sessionId)) {
        sessionMap.set(event.sessionId, []);
      }
      sessionMap.get(event.sessionId)!.push(event as BookingAnalyticsEvent);
    });

    const totalSessions = sessionMap.size;
    let completedBookings = 0;
    let totalCompletionTime = 0;
    const abandonmentPoints = {
      serviceSelection: 0,
      timeSelection: 0,
      formSubmission: 0,
    };

    sessionMap.forEach(sessionEvents => {
      const hasCompleted = sessionEvents.some(
        e => e.eventType === 'booking_completed'
      );

      if (hasCompleted) {
        completedBookings++;

        // Calculate completion time
        const startEvent = sessionEvents.find(
          e => e.eventType === 'booking_started'
        );
        const endEvent = sessionEvents.find(
          e => e.eventType === 'booking_completed'
        );

        if (startEvent && endEvent) {
          const completionTime =
            endEvent.timestamp.getTime() - startEvent.timestamp.getTime();
          totalCompletionTime += completionTime;
        }
      } else {
        // Track abandonment points
        const lastEvent = sessionEvents[sessionEvents.length - 1];
        switch (lastEvent.eventType) {
          case 'service_selected':
            abandonmentPoints.serviceSelection++;
            break;
          case 'time_selected':
            abandonmentPoints.timeSelection++;
            break;
          case 'form_submitted':
            abandonmentPoints.formSubmission++;
            break;
        }
      }
    });

    return {
      totalSessions,
      completedBookings,
      conversionRate:
        totalSessions > 0 ? (completedBookings / totalSessions) * 100 : 0,
      averageTimeToComplete:
        completedBookings > 0 ? totalCompletionTime / completedBookings : 0,
      abandonmentPoints,
    };
  }

  async getPerformanceMetrics(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BookingPerformanceMetrics> {
    const performanceEvents = await prisma.bookingPerformanceEvent.findMany({
      where: {
        businessId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const pageLoadTimes = performanceEvents
      .filter(e => e.eventType === 'page_load')
      .map(e => e.duration || 0);

    const apiResponseTimes = performanceEvents
      .filter(e => e.eventType === 'api_response')
      .map(e => e.duration || 0);

    const errorEvents = performanceEvents.filter(e => e.eventType === 'error');
    const mobileEvents = performanceEvents.filter(
      e => (e.metadata as any)?.isMobile === true
    );

    // Calculate peak booking hours
    const bookingEvents = await prisma.bookingAnalyticsEvent.findMany({
      where: {
        businessId,
        eventType: 'booking_completed',
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const hourCounts = new Map<number, number>();
    bookingEvents.forEach(event => {
      const hour = event.timestamp.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const peakBookingHours = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      averagePageLoadTime:
        pageLoadTimes.length > 0
          ? pageLoadTimes.reduce((a, b) => a + b, 0) / pageLoadTimes.length
          : 0,
      averageApiResponseTime:
        apiResponseTimes.length > 0
          ? apiResponseTimes.reduce((a, b) => a + b, 0) /
            apiResponseTimes.length
          : 0,
      errorRate:
        performanceEvents.length > 0
          ? (errorEvents.length / performanceEvents.length) * 100
          : 0,
      mobileUsagePercentage:
        performanceEvents.length > 0
          ? (mobileEvents.length / performanceEvents.length) * 100
          : 0,
      peakBookingHours,
    };
  }
}

export const bookingAnalytics = new BookingAnalyticsService();
