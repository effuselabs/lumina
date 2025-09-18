import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowRight, Calendar, Clock, Plus } from 'lucide-react';
import Link from 'next/link';
import { ScheduleItem, ScheduleItemData } from './schedule-item';

interface TodaysScheduleCardProps {
  businessSlug: string;
  appointments: ScheduleItemData[];
  isLoading?: boolean;
  className?: string;
}

export function TodaysScheduleCard({
  businessSlug,
  appointments,
  isLoading = false,
  className,
}: TodaysScheduleCardProps) {
  const upcomingAppointments = appointments.filter(
    apt => apt.status === 'upcoming'
  );
  const inProgressAppointments = appointments.filter(
    apt => apt.status === 'in-progress'
  );

  const displayAppointments = [
    ...inProgressAppointments,
    ...upcomingAppointments,
  ].slice(0, 4); // Show max 4 appointments

  if (isLoading) {
    return (
      <Card className={cn('schedule-card h-fit', className)}>
        <div className="schedule-card-header">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" style={{ color: '#ff7a5a' }} />
            <h3 className="stat-card-title">Today&apos;s Schedule</h3>
          </div>
        </div>
        <div className="schedule-card-content">
          <div className="schedule-items">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="schedule-item-skeleton animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-300" />
                  <div>
                    <div className="mb-1 h-3 w-20 rounded bg-gray-300" />
                    <div className="h-2 w-16 rounded bg-gray-300" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-1 h-3 w-12 rounded bg-gray-300" />
                  <div className="h-2 w-10 rounded bg-gray-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('schedule-card h-fit', className)}>
      <div className="schedule-card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" style={{ color: '#ff7a5a' }} />
            <h3 className="stat-card-title">Today&apos;s Schedule</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="schedule-card-count-badge">
              <span className="schedule-card-count-number">
                {appointments.length}
              </span>
              <span className="schedule-card-count-label">
                {appointments.length === 1 ? 'appointment' : 'appointments'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-6 w-6 p-0 hover:bg-lumina-peach/20"
            >
              <Link href={`/dashboard/${businessSlug}/appointments/new`}>
                <Plus className="h-3 w-3" />
                <span className="sr-only">Add appointment</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="schedule-card-content">
        {displayAppointments.length === 0 ? (
          <div className="schedule-empty-state">
            <Calendar
              className="mx-auto mb-2 h-8 w-8"
              style={{ color: 'rgba(128, 130, 133, 0.4)' }}
            />
            <p className="schedule-empty-title">No appointments</p>
            <p className="schedule-empty-subtitle">Schedule is clear today</p>
          </div>
        ) : (
          <>
            <div className="schedule-items">
              {displayAppointments.map(appointment => (
                <ScheduleItem
                  key={appointment.id}
                  item={appointment}
                  variant="compact"
                />
              ))}
            </div>

            {appointments.length > 4 && (
              <div className="schedule-overflow">
                <span className="schedule-overflow-text">
                  +{appointments.length - 4} more today
                </span>
              </div>
            )}

            <div className="schedule-card-footer">
              <Link
                href={`/dashboard/${businessSlug}/appointments`}
                className="link-stat-card-action"
              >
                View Full Schedule
                <ArrowRight className="stat-card-action-icon h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
