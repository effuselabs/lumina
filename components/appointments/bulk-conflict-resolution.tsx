'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardAppointment } from '@/types/dashboard-appointments';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Building,
  CheckCircle,
  Clock,
  Users,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

interface ConflictInfo {
  appointmentId: string;
  type: 'staff_unavailable' | 'time_overlap' | 'business_closed';
  message: string;
  suggestedAlternatives: Date[];
}

interface BulkConflictResolutionProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolvedDateTime: Date) => Promise<void>;
  conflicts: ConflictInfo[];
  originalDateTime: Date;
  appointments: DashboardAppointment[];
}

export function BulkConflictResolution({
  isOpen,
  onClose,
  onResolve,
  conflicts,
  originalDateTime,
  appointments,
}: BulkConflictResolutionProps) {
  const [selectedResolution, setSelectedResolution] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const getConflictIcon = (type: ConflictInfo['type']) => {
    switch (type) {
      case 'staff_unavailable':
        return <Users className="h-4 w-4 text-orange-500" />;
      case 'time_overlap':
        return <Clock className="h-4 w-4 text-red-500" />;
      case 'business_closed':
        return <Building className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getConflictSeverity = (type: ConflictInfo['type']) => {
    switch (type) {
      case 'business_closed':
        return 'high';
      case 'staff_unavailable':
        return 'medium';
      case 'time_overlap':
        return 'high';
      default:
        return 'low';
    }
  };

  // Collect all suggested alternatives from conflicts
  const allAlternatives = conflicts.flatMap(conflict =>
    conflict.suggestedAlternatives.map(date => ({
      date,
      conflictType: conflict.type,
      conflictMessage: conflict.message,
    }))
  );

  // Remove duplicates and sort by date
  const uniqueAlternatives = allAlternatives
    .filter(
      (alt, index, self) =>
        index === self.findIndex(a => a.date.getTime() === alt.date.getTime())
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const handleResolve = async () => {
    if (!selectedResolution) return;

    setIsLoading(true);
    try {
      if (selectedResolution === 'force') {
        await onResolve(originalDateTime);
      } else {
        const selectedDate = new Date(selectedResolution);
        await onResolve(selectedDate);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canForceSchedule = conflicts.every(c => c.type !== 'business_closed');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Resolve Scheduling Conflicts
          </DialogTitle>
          <DialogDescription>
            There are conflicts with your selected time. Choose how to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] grid-cols-1 gap-6 overflow-auto lg:grid-cols-2">
          {/* Conflicts Summary */}
          <div className="space-y-4">
            <div>
              <h4 className="mb-3 font-medium">Detected Conflicts</h4>
              <div className="space-y-3">
                {conflicts.map((conflict, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border p-3 ${
                      getConflictSeverity(conflict.type) === 'high'
                        ? 'border-red-200 bg-red-50'
                        : getConflictSeverity(conflict.type) === 'medium'
                          ? 'border-orange-200 bg-orange-50'
                          : 'border-yellow-200 bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {getConflictIcon(conflict.type)}
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {conflict.type.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {conflict.message}
                        </div>
                      </div>
                      <Badge
                        variant={
                          getConflictSeverity(conflict.type) === 'high'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {getConflictSeverity(conflict.type)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="text-sm">
                <div className="mb-1 font-medium text-blue-800">
                  Original Request:
                </div>
                <div className="text-blue-700">
                  {format(originalDateTime, 'EEEE, MMMM d, yyyy')} at{' '}
                  {format(originalDateTime, 'h:mm a')}
                </div>
                <div className="mt-1 text-blue-600">
                  {appointments.length} appointment
                  {appointments.length > 1 ? 's' : ''} affected
                </div>
              </div>
            </div>
          </div>

          {/* Resolution Options */}
          <div className="space-y-4">
            <div>
              <h4 className="mb-3 font-medium">Resolution Options</h4>
              <RadioGroup
                value={selectedResolution}
                onValueChange={setSelectedResolution}
              >
                <div className="space-y-3">
                  {/* Suggested alternatives */}
                  {uniqueAlternatives.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-green-700">
                        Suggested Alternative Times
                      </Label>
                      {uniqueAlternatives
                        .slice(0, 3)
                        .map((alternative, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 rounded border border-green-200 bg-green-50 p-2"
                          >
                            <RadioGroupItem
                              value={alternative.date.toISOString()}
                              id={`alt-${index}`}
                            />
                            <Label
                              htmlFor={`alt-${index}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-green-800">
                                    {format(alternative.date, 'EEEE, MMMM d')}
                                  </div>
                                  <div className="text-sm text-green-600">
                                    {format(alternative.date, 'h:mm a')}
                                  </div>
                                </div>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </div>
                            </Label>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Force schedule option */}
                  {canForceSchedule && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-orange-700">
                        Override Options
                      </Label>
                      <div className="flex items-center space-x-2 rounded border border-orange-200 bg-orange-50 p-2">
                        <RadioGroupItem value="force" id="force" />
                        <Label
                          htmlFor="force"
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-orange-800">
                                Force Schedule Anyway
                              </div>
                              <div className="text-sm text-orange-600">
                                Schedule despite conflicts (not recommended)
                              </div>
                            </div>
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          </div>
                        </Label>
                      </div>
                    </div>
                  )}

                  {/* Cancel option */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Other Options
                    </Label>
                    <div className="flex items-center space-x-2 rounded border border-gray-200 bg-gray-50 p-2">
                      <RadioGroupItem value="cancel" id="cancel" />
                      <Label htmlFor="cancel" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-800">
                              Cancel Operation
                            </div>
                            <div className="text-sm text-gray-600">
                              Return to date/time selection
                            </div>
                          </div>
                          <XCircle className="h-4 w-4 text-gray-500" />
                        </div>
                      </Label>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Affected appointments preview */}
            <div>
              <h4 className="mb-2 font-medium">Affected Appointments</h4>
              <ScrollArea className="h-32 rounded-lg border">
                <div className="space-y-1 p-2">
                  {appointments.map(appointment => (
                    <div
                      key={appointment.id}
                      className="flex justify-between rounded bg-gray-50 p-2 text-xs"
                    >
                      <span>
                        {appointment.client.firstName}{' '}
                        {appointment.client.lastName}
                      </span>
                      <span className="text-gray-500">
                        {appointment.staff.displayName}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={selectedResolution === 'cancel' ? onClose : handleResolve}
            disabled={!selectedResolution || isLoading}
            variant={
              (selectedResolution === 'force' ? 'destructive' : 'primary') as
                | 'destructive'
                | 'outline'
                | 'secondary'
                | 'ghost'
                | 'link'
                | 'primary'
                | 'premium-glass'
                | 'premium-glow'
                | 'premium-floating'
            }
          >
            {isLoading
              ? 'Processing...'
              : selectedResolution === 'cancel'
                ? 'Go Back'
                : selectedResolution === 'force'
                  ? 'Force Schedule'
                  : 'Apply Resolution'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
