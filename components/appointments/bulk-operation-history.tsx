'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { format, isToday, isYesterday, subDays } from 'date-fns';
import {
    AlertTriangle,
    Calendar,
    CheckCircle,
    Clock,
    Filter,
    History,
    User,
    XCircle
} from 'lucide-react';
import { useState } from 'react';

interface BulkOperationHistoryEntry {
    id: string;
    operation: 'cancel' | 'status_update' | 'reschedule';
    performedBy: {
        id: string;
        name: string;
        email: string;
    };
    performedAt: Date;
    appointmentCount: number;
    successCount: number;
    errorCount: number;
    warningCount: number;
    details: {
        appointmentIds: string[];
        clientNames: string[];
        originalValues?: any;
        newValues?: any;
        errors?: string[];
    };
    status: 'completed' | 'partial' | 'failed';
}

interface BulkOperationHistoryProps {
    businessId: string;
}

export function BulkOperationHistory({ businessId }: BulkOperationHistoryProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [filterOperation, setFilterOperation] = useState<string>('all');
    const [filterTimeRange, setFilterTimeRange] = useState<string>('7d');
    const [selectedEntry, setSelectedEntry] = useState<BulkOperationHistoryEntry | null>(null);

    // Mock data - in real implementation, this would come from an API
    const mockHistory: BulkOperationHistoryEntry[] = [
        {
            id: '1',
            operation: 'reschedule',
            performedBy: {
                id: 'user1',
                name: 'Sarah Johnson',
                email: 'sarah@salon.com',
            },
            performedAt: new Date(),
            appointmentCount: 5,
            successCount: 4,
            errorCount: 1,
            warningCount: 0,
            details: {
                appointmentIds: ['apt1', 'apt2', 'apt3', 'apt4', 'apt5'],
                clientNames: ['John Doe', 'Jane Smith', 'Bob Wilson', 'Alice Brown', 'Charlie Davis'],
                originalValues: { date: '2024-01-15', time: '10:00' },
                newValues: { date: '2024-01-16', time: '14:00' },
                errors: ['Staff unavailable for Charlie Davis appointment'],
            },
            status: 'partial',
        },
        {
            id: '2',
            operation: 'cancel',
            performedBy: {
                id: 'user2',
                name: 'Mike Chen',
                email: 'mike@salon.com',
            },
            performedAt: subDays(new Date(), 1),
            appointmentCount: 3,
            successCount: 3,
            errorCount: 0,
            warningCount: 0,
            details: {
                appointmentIds: ['apt6', 'apt7', 'apt8'],
                clientNames: ['Emma Wilson', 'David Lee', 'Lisa Garcia'],
            },
            status: 'completed',
        },
        {
            id: '3',
            operation: 'status_update',
            performedBy: {
                id: 'user1',
                name: 'Sarah Johnson',
                email: 'sarah@salon.com',
            },
            performedAt: subDays(new Date(), 2),
            appointmentCount: 8,
            successCount: 7,
            errorCount: 0,
            warningCount: 1,
            details: {
                appointmentIds: ['apt9', 'apt10', 'apt11', 'apt12', 'apt13', 'apt14', 'apt15', 'apt16'],
                clientNames: ['Tom Brown', 'Amy White', 'Chris Green', 'Pat Blue', 'Sam Red', 'Alex Gray', 'Jordan Pink', 'Casey Orange'],
                originalValues: { status: 'pending' },
                newValues: { status: 'confirmed' },
                errors: [],
            },
            status: 'completed',
        },
    ];

    const getOperationIcon = (operation: BulkOperationHistoryEntry['operation']) => {
        switch (operation) {
            case 'cancel':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'status_update':
                return <Clock className="h-4 w-4 text-blue-500" />;
            case 'reschedule':
                return <Calendar className="h-4 w-4 text-green-500" />;
            default:
                return <History className="h-4 w-4 text-gray-500" />;
        }
    };

    const getOperationLabel = (operation: BulkOperationHistoryEntry['operation']) => {
        switch (operation) {
            case 'cancel':
                return 'Bulk Cancel';
            case 'status_update':
                return 'Status Update';
            case 'reschedule':
                return 'Bulk Reschedule';
            default:
                return 'Unknown';
        }
    };

    const getStatusBadge = (entry: BulkOperationHistoryEntry) => {
        if (entry.errorCount > 0 && entry.successCount === 0) {
            return <Badge variant="destructive">Failed</Badge>;
        } else if (entry.errorCount > 0) {
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Partial</Badge>;
        } else if (entry.warningCount > 0) {
            return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Warnings</Badge>;
        } else {
            return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
        }
    };

    const formatDate = (date: Date) => {
        if (isToday(date)) {
            return `Today at ${format(date, 'h:mm a')}`;
        } else if (isYesterday(date)) {
            return `Yesterday at ${format(date, 'h:mm a')}`;
        } else {
            return format(date, 'MMM d, yyyy \'at\' h:mm a');
        }
    };

    const filteredHistory = mockHistory.filter(entry => {
        if (filterOperation !== 'all' && entry.operation !== filterOperation) {
            return false;
        }

        const daysDiff = Math.floor((new Date().getTime() - entry.performedAt.getTime()) / (1000 * 60 * 60 * 24));

        switch (filterTimeRange) {
            case '1d':
                return daysDiff <= 1;
            case '7d':
                return daysDiff <= 7;
            case '30d':
                return daysDiff <= 30;
            default:
                return true;
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <History className="h-4 w-4 mr-2" />
                    History
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Bulk Operation History
                    </DialogTitle>
                    <DialogDescription>
                        View and audit all bulk appointment operations performed in your salon.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <Filter className="h-4 w-4 text-gray-500" />

                        <Select value={filterOperation} onValueChange={setFilterOperation}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Operation" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Operations</SelectItem>
                                <SelectItem value="cancel">Cancellations</SelectItem>
                                <SelectItem value="status_update">Status Updates</SelectItem>
                                <SelectItem value="reschedule">Reschedules</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filterTimeRange} onValueChange={setFilterTimeRange}>
                            <SelectTrigger className="w-32">
                                <SelectValue placeholder="Time Range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1d">Today</SelectItem>
                                <SelectItem value="7d">Last 7 days</SelectItem>
                                <SelectItem value="30d">Last 30 days</SelectItem>
                                <SelectItem value="all">All time</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* History List */}
                    <ScrollArea className="h-96">
                        <div className="space-y-3">
                            {filteredHistory.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No bulk operations found for the selected filters.</p>
                                </div>
                            ) : (
                                filteredHistory.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => setSelectedEntry(entry)}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                {getOperationIcon(entry.operation)}
                                                <div>
                                                    <div className="font-medium">
                                                        {getOperationLabel(entry.operation)}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        {entry.appointmentCount} appointment{entry.appointmentCount > 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                            </div>
                                            {getStatusBadge(entry)}
                                        </div>

                                        <div className="flex items-center justify-between text-sm text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <User className="h-3 w-3" />
                                                <span>{entry.performedBy.name}</span>
                                            </div>
                                            <span>{formatDate(entry.performedAt)}</span>
                                        </div>

                                        <div className="mt-2 flex items-center gap-4 text-xs">
                                            {entry.successCount > 0 && (
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <CheckCircle className="h-3 w-3" />
                                                    <span>{entry.successCount} successful</span>
                                                </div>
                                            )}
                                            {entry.errorCount > 0 && (
                                                <div className="flex items-center gap-1 text-red-600">
                                                    <XCircle className="h-3 w-3" />
                                                    <span>{entry.errorCount} failed</span>
                                                </div>
                                            )}
                                            {entry.warningCount > 0 && (
                                                <div className="flex items-center gap-1 text-yellow-600">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    <span>{entry.warningCount} warnings</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Detailed View Modal */}
                {selectedEntry && (
                    <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    {getOperationIcon(selectedEntry.operation)}
                                    {getOperationLabel(selectedEntry.operation)} Details
                                </DialogTitle>
                                <DialogDescription>
                                    Operation performed on {formatDate(selectedEntry.performedAt)}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="text-sm font-medium">Performed By</div>
                                        <div className="text-sm text-gray-600">{selectedEntry.performedBy.name}</div>
                                        <div className="text-xs text-gray-500">{selectedEntry.performedBy.email}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">Results</div>
                                        <div className="text-sm">
                                            {selectedEntry.successCount}/{selectedEntry.appointmentCount} successful
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium mb-2">Affected Clients</h4>
                                    <ScrollArea className="h-32 border rounded-lg">
                                        <div className="p-2 space-y-1">
                                            {selectedEntry.details.clientNames.map((name, index) => (
                                                <div key={index} className="text-sm p-1">
                                                    {name}
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>

                                {selectedEntry.details.errors && selectedEntry.details.errors.length > 0 && (
                                    <div>
                                        <h4 className="font-medium mb-2 text-red-600">Errors</h4>
                                        <div className="space-y-1">
                                            {selectedEntry.details.errors.map((error, index) => (
                                                <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                                                    {error}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </DialogContent>
        </Dialog>
    );
}