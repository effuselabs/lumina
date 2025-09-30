'use client';

import { highlightText } from '@/lib/search-utils';
import { cn } from '@/lib/utils';

interface SearchResultHighlightProps {
    text: string;
    searchTerms: string[];
    className?: string;
    highlightClassName?: string;
}

export function SearchResultHighlight({
    text,
    searchTerms,
    className,
    highlightClassName = "bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded"
}: SearchResultHighlightProps) {
    const highlights = highlightText(text, searchTerms);

    return (
        <span className={className}>
            {highlights.map((highlight, index) => (
                <span
                    key={index}
                    className={cn(
                        highlight.isHighlighted && highlightClassName
                    )}
                >
                    {highlight.text}
                </span>
            ))}
        </span>
    );
}

interface AppointmentSearchResultProps {
    appointment: any; // DashboardAppointment type
    searchTerms: string[];
    onClick?: () => void;
    className?: string;
}

export function AppointmentSearchResult({
    appointment,
    searchTerms,
    onClick,
    className
}: AppointmentSearchResultProps) {
    const clientName = `${appointment.client.firstName} ${appointment.client.lastName}`;
    const serviceNames = appointment.services.map((s: any) => s.name).join(', ');

    return (
        <div
            className={cn(
                "p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors",
                className
            )}
            onClick={onClick}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <SearchResultHighlight
                            text={clientName}
                            searchTerms={searchTerms}
                            className="font-medium"
                        />
                        <span className="text-sm text-muted-foreground">•</span>
                        <SearchResultHighlight
                            text={appointment.staff.displayName}
                            searchTerms={searchTerms}
                            className="text-sm text-muted-foreground"
                        />
                    </div>

                    <div className="text-sm text-muted-foreground mb-1">
                        <SearchResultHighlight
                            text={serviceNames}
                            searchTerms={searchTerms}
                        />
                    </div>

                    <div className="text-xs text-muted-foreground">
                        {appointment.startTime.toLocaleDateString()} at{' '}
                        {appointment.startTime.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </div>

                    {appointment.notes && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                            <SearchResultHighlight
                                text={appointment.notes}
                                searchTerms={searchTerms}
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: appointment.staff.color }}
                        title={appointment.staff.displayName}
                    />
                    <span className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        appointment.status === 'COMPLETED' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                        appointment.status === 'CONFIRMED' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                        appointment.status === 'SCHEDULED' && "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
                        appointment.status === 'CANCELLED' && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                        appointment.status === 'IN_PROGRESS' && "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                    )}>
                        {appointment.status.replace('_', ' ')}
                    </span>
                </div>
            </div>
        </div>
    );
}