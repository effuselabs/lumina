'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardAppointment } from '@/types/dashboard-appointments';
import { addDays, format, setHours, setMinutes } from 'date-fns';
import { AlertTriangle, Calendar as CalendarIcon, Clock } from 'lucide-react';
import React, { useState } from 'react';
import { BulkConflictResolution } from './bulk-conflict-resolution';

interface BulkRescheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newDateTime: Date) => Promise<void>;
  appointments: DashboardAppointment[];
}

interface ConflictInfo {
  appointmentId: string;
  type: 'staff_unavailable' | 'time_overlap' | 'business_closed';
  message: string;
  suggestedAlternatives: Date[];
}

export function BulkRescheduleDialog({
  isOpen,
  onClose,
  onConfirm,
  appointments,
}: BulkRescheduleDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [isLoading, setIsLoading] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [showConflictResolution, setShowConflictResolution] = useState(false);

  // Generate time slots for selection
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const getNewDateTime = () => {
    const [hours, minutes] = selectedTime.split(':').map(Number);
    return setMinutes(setHours(selectedDate, hours), minutes);
  };

  const checkForConflicts = async (
    newDateTime: Date
  ): Promise<ConflictInfo[]> => {
    // Simulate conflict checking - in real implementation, this would call an API
    const mockConflicts: ConflictInfo[] = [];

    // Check for business hours (example: 9 AM - 6 PM)
    const hour = newDateTime.getHours();
    if (hour < 9 || hour >= 18) {
      mockConflicts.push({
        appointmentId: 'business-hours',
        type: 'business_closed',
        message: 'Selected time is outside business hours (9 AM - 6 PM)',
        suggestedAlternatives: [
          setHours(newDateTime, 9),
          setHours(newDateTime, 10),
          setHours(newDateTime, 14),
        ],
      });
    }

    // Check for staff availability conflicts
    const staffIds = [...new Set(appointments.map(apt => apt.staffId))];
    if (staffIds.length > 1) {
      mockConflicts.push({
        appointmentId: 'staff-conflict',
        type: 'staff_unavailable',
        message:
          'Multiple staff members may not be available at the selected time',
        suggestedAlternatives: [
          addDays(newDateTime, 1),
          addDays(newDateTime, 2),
        ],
      });
    }

    return mockConflicts;
  };

  const handleDateTimeChange = async () => {
    const newDateTime = getNewDateTime();
    const detectedConflicts = await checkForConflicts(newDateTime);
    setConflicts(detectedConflicts);

    if (detectedConflicts.length > 0) {
      setShowConflictResolution(true);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const newDateTime = getNewDateTime();
      await onConfirm(newDateTime);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleConflictResolution = async (resolvedDateTime: Date) => {
    setSelectedDate(resolvedDateTime);
    setSelectedTime(format(resolvedDateTime, 'HH:mm'));
    setShowConflictResolution(false);
    setConflicts([]);
  };

  React.useEffect(() => {
    if (selectedDate && selectedTime) {
      handleDateTimeChange();
    }
  }, [selectedDate, selectedTime]);

  if (showConflictResolution) {
    return (
      <BulkConflictResolution
        isOpen={isOpen}
        onClose={onClose}
        onResolve={handleConflictResolution}
        conflicts={conflicts}
        originalDateTime={getNewDateTime()}
        appointments={appointments}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-500" />
            Reschedule {appointments.length} Appointment
            {appointments.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Select a new date and time for all selected appointments.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] grid-cols-1 gap-6 overflow-hidden lg:grid-cols-2">
          {/* Date and Time Selection */}
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 font-medium">Select Date</h4>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={date => date && setSelectedDate(date)}
                disabled={date => date < new Date()}
                className="rounded-md border"
              />
            </div>

            <div>
              <h4 className="mb-2 font-medium">Select Time</h4>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-48">
                    {timeSlots.map(time => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {conflicts.length > 0 && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <div className="mb-2 flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Conflicts Detected</span>
                </div>
                <ul className="space-y-1 text-sm text-yellow-700">
                  {conflicts.map((conflict, index) => (
                    <li key={index}>• {conflict.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Appointment Preview */}
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 font-medium">Appointments to Reschedule</h4>
              <ScrollArea className="h-64 rounded-lg border">
                <div className="space-y-2 p-3">
                  {appointments.map(appointment => (
                    <div
                      key={appointment.id}
                      className="rounded-lg bg-gray-50 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="font-medium">
                          {appointment.client.firstName}{' '}
                          {appointment.client.lastName}
                        </div>
                        <Badge variant="outline">{appointment.status}</Badge>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span className="line-through">
                            {format(appointment.startTime, 'PPP p')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-3 w-3" />
                          <span className="font-medium text-green-600">
                            {format(getNewDateTime(), 'PPP p')}
                          </span>
                        </div>
                        <div>Staff: {appointment.staff.displayName}</div>
                        <div>
                          Services:{' '}
                          {appointment.services.map(s => s.name).join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="text-sm">
                <div className="mb-1 font-medium text-blue-800">
                  New Schedule:
                </div>
                <div className="text-blue-700">
                  {format(getNewDateTime(), 'EEEE, MMMM d, yyyy')} at{' '}
                  {selectedTime}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || conflicts.length > 0}
          >
            {isLoading ? 'Rescheduling...' : 'Reschedule Appointments'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
