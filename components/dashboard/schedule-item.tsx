import { cn } from '@/lib/utils';
import { Clock, User } from 'lucide-react';

export interface ScheduleItemData {
  id: string;
  clientName: string;
  service: string;
  time: string;
  staffMember: string;
  status: 'upcoming' | 'in-progress' | 'completed';
  duration?: number;
}

interface ScheduleItemProps {
  item: ScheduleItemData;
  variant?: 'default' | 'compact';
  className?: string;
}

export function ScheduleItem({
  item,
  variant = 'default',
  className,
}: ScheduleItemProps) {
  const _getStatusStyles = (status: ScheduleItemData['status']) => {
    switch (status) {
      case 'upcoming':
        return 'bg-gradient-to-r from-lumina-peach/20 to-lumina-peach/10 border-lumina-peach/30';
      case 'in-progress':
        return 'bg-gradient-to-r from-lumina-orange/20 to-lumina-orange/10 border-lumina-orange/30';
      case 'completed':
        return 'bg-gradient-to-r from-emerald-50 to-emerald-25 border-emerald-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const _getStatusIndicator = (status: ScheduleItemData['status']) => {
    switch (status) {
      case 'upcoming':
        return (
          <div className="h-2 w-2 animate-pulse rounded-full bg-lumina-peach" />
        );
      case 'in-progress':
        return (
          <div className="h-2 w-2 animate-pulse rounded-full bg-lumina-orange" />
        );
      case 'completed':
        return <div className="h-2 w-2 rounded-full bg-emerald-500" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'schedule-item-professional',
        variant === 'compact' && 'schedule-item-professional-compact',
        className
      )}
    >
      {/* Status indicator bar */}
      <div
        className={cn('schedule-item-status-bar', {
          'status-upcoming': item.status === 'upcoming',
          'status-in-progress': item.status === 'in-progress',
          'status-completed': item.status === 'completed',
        })}
      />

      {/* Main content */}
      <div className="schedule-item-content">
        <div className="schedule-item-primary">
          <div className="schedule-item-client">
            <span className="schedule-item-client-name">{item.clientName}</span>
            <span className="schedule-item-service">{item.service}</span>
          </div>
          <div className="schedule-item-meta">
            <div className="schedule-item-time-block">
              <Clock className="schedule-item-time-icon" />
              <span className="schedule-item-time">{item.time}</span>
            </div>
            {item.duration && (
              <span className="schedule-item-duration">{item.duration}min</span>
            )}
          </div>
        </div>
        <div className="schedule-item-staff-info">
          <User className="schedule-item-staff-icon" />
          <span className="schedule-item-staff">{item.staffMember}</span>
        </div>
      </div>
    </div>
  );
}
