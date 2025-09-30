'use client';

import { Button } from '@/components/ui/button';
import { addDays, endOfDay, endOfWeek, startOfDay, startOfWeek, subDays } from 'date-fns';
import { AlertTriangle, Calendar, CheckCircle, Clock, Users, XCircle } from 'lucide-react';

import { FilterPreset } from '@/types/appointment-filters';
import { AppointmentStatus } from '@/types/dashboard-appointments';

interface FilterPresetsProps {
    onApplyPreset: (preset: FilterPreset) => void;
}

export function FilterPresets({ onApplyPreset }: FilterPresetsProps) {
    // Define preset filters
    const presets: FilterPreset[] = [
        {
            id: 'today',
            name: 'Today',
            icon: 'calendar',
            filters: {
                dateRange: {
                    start: startOfDay(new Date()),
                    end: endOfDay(new Date())
                }
            }
        },
        {
            id: 'this-week',
            name: 'This Week',
            icon: 'calendar',
            filters: {
                dateRange: {
                    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
                    end: endOfWeek(new Date(), { weekStartsOn: 1 })
                }
            }
        },
        {
            id: 'upcoming',
            name: 'Upcoming',
            icon: 'clock',
            filters: {
                dateRange: {
                    start: startOfDay(new Date()),
                    end: endOfDay(addDays(new Date(), 7))
                },
                status: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]
            }
        },
        {
            id: 'overdue',
            name: 'Overdue',
            icon: 'alert-triangle',
            filters: {
                dateRange: {
                    start: startOfDay(subDays(new Date(), 30)),
                    end: endOfDay(subDays(new Date(), 1))
                },
                status: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]
            }
        },
        {
            id: 'completed',
            name: 'Completed',
            icon: 'check-circle',
            filters: {
                status: [AppointmentStatus.COMPLETED]
            }
        },
        {
            id: 'cancelled',
            name: 'Cancelled',
            icon: 'x-circle',
            filters: {
                status: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]
            }
        },
        {
            id: 'in-progress',
            name: 'In Progress',
            icon: 'users',
            filters: {
                status: [AppointmentStatus.IN_PROGRESS]
            }
        }
    ];

    // Get icon component
    const getIcon = (iconName: string) => {
        const iconProps = { className: "h-4 w-4" };

        switch (iconName) {
            case 'calendar':
                return <Calendar {...iconProps} />;
            case 'clock':
                return <Clock {...iconProps} />;
            case 'alert-triangle':
                return <AlertTriangle {...iconProps} />;
            case 'check-circle':
                return <CheckCircle {...iconProps} />;
            case 'x-circle':
                return <XCircle {...iconProps} />;
            case 'users':
                return <Users {...iconProps} />;
            default:
                return <Calendar {...iconProps} />;
        }
    };

    return (
        <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Quick Filters</div>
            <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                    <Button
                        key={preset.id}
                        variant="ghost"
                        size="sm"
                        className="justify-start h-auto p-2 text-left"
                        onClick={() => onApplyPreset(preset)}
                    >
                        <div className="flex items-center gap-2">
                            {preset.icon && getIcon(preset.icon)}
                            <span className="text-sm">{preset.name}</span>
                        </div>
                    </Button>
                ))}
            </div>
        </div>
    );
}