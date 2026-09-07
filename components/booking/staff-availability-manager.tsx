'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Calendar as CalendarIcon,
  Clock,
  Edit,
  Settings,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface StaffMember {
  id: string;
  displayName: string;
  isActive: boolean;
  acceptsOnlineBookings: boolean;
  workingHours: any;
}

interface WorkingHours {
  [key: number]: {
    enabled: boolean;
    start: string;
    end: string;
  } | null;
}

interface StaffAvailabilityManagerProps {
  businessId: string;
  staffId?: string;
}

export function StaffAvailabilityManager({
  businessId,
  staffId,
}: StaffAvailabilityManagerProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingHours, setEditingHours] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, [businessId]);

  useEffect(() => {
    if (staffId && staff.length > 0) {
      const staffMember = staff.find(s => s.id === staffId);
      if (staffMember) {
        setSelectedStaff(staffMember);
      }
    }
  }, [staffId, staff]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      // This would be a real API call in production
      // For now, we'll simulate the data structure
      const mockStaff: StaffMember[] = [
        {
          id: '1',
          displayName: 'Sarah Johnson',
          isActive: true,
          acceptsOnlineBookings: true,
          workingHours: {
            1: { enabled: true, start: '09:00', end: '17:00' }, // Monday
            2: { enabled: true, start: '09:00', end: '17:00' }, // Tuesday
            3: { enabled: true, start: '09:00', end: '17:00' }, // Wednesday
            4: { enabled: true, start: '09:00', end: '17:00' }, // Thursday
            5: { enabled: true, start: '09:00', end: '17:00' }, // Friday
            6: { enabled: true, start: '10:00', end: '16:00' }, // Saturday
            0: null, // Sunday - not working
          },
        },
        {
          id: '2',
          displayName: 'Mike Chen',
          isActive: true,
          acceptsOnlineBookings: true,
          workingHours: {
            1: { enabled: true, start: '10:00', end: '18:00' },
            2: { enabled: true, start: '10:00', end: '18:00' },
            3: { enabled: true, start: '10:00', end: '18:00' },
            4: { enabled: true, start: '10:00', end: '18:00' },
            5: { enabled: true, start: '10:00', end: '18:00' },
            6: { enabled: true, start: '09:00', end: '15:00' },
            0: { enabled: true, start: '12:00', end: '17:00' }, // Sunday
          },
        },
      ];
      setStaff(mockStaff);
      if (!selectedStaff && mockStaff.length > 0) {
        setSelectedStaff(mockStaff[0]);
      }
    } catch (err) {
      setError('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSelect = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
  };

  const handleToggleOnlineBooking = async (
    staffId: string,
    enabled: boolean
  ) => {
    try {
      // Update staff online booking status
      setStaff(prev =>
        prev.map(s =>
          s.id === staffId ? { ...s, acceptsOnlineBookings: enabled } : s
        )
      );

      if (selectedStaff?.id === staffId) {
        setSelectedStaff(prev =>
          prev ? { ...prev, acceptsOnlineBookings: enabled } : null
        );
      }
    } catch (err) {
      setError('Failed to update staff settings');
    }
  };

  const handleUpdateWorkingHours = async (
    staffId: string,
    workingHours: WorkingHours
  ) => {
    try {
      // Update staff working hours
      setStaff(prev =>
        prev.map(s => (s.id === staffId ? { ...s, workingHours } : s))
      );

      if (selectedStaff?.id === staffId) {
        setSelectedStaff(prev => (prev ? { ...prev, workingHours } : null));
      }

      setEditingHours(false);
    } catch (err) {
      setError('Failed to update working hours');
    }
  };

  const getDayName = (dayIndex: number) => {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[dayIndex];
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="h-3 rounded bg-gray-200" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="mb-4 text-red-600">{error}</p>
        <Button onClick={fetchStaff} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Staff Availability Management
        </h2>
        <p className="text-gray-600">
          Manage staff schedules and availability for online bookings.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Staff List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Staff Members</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {staff.map(staffMember => (
                <div
                  key={staffMember.id}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    selectedStaff?.id === staffMember.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleStaffSelect(staffMember)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{staffMember.displayName}</p>
                      <div className="mt-1 flex items-center space-x-2">
                        <Badge
                          variant={
                            staffMember.isActive ? 'default' : 'secondary'
                          }
                        >
                          {staffMember.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {staffMember.acceptsOnlineBookings && (
                          <Badge variant="outline">Online Booking</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Staff Details */}
        <div className="lg:col-span-2">
          {selectedStaff ? (
            <div className="space-y-6">
              {/* Staff Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>{selectedStaff.displayName} - Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="online-booking">
                        Accept Online Bookings
                      </Label>
                      <p className="text-sm text-gray-600">
                        Allow clients to book appointments with this staff
                        member online
                      </p>
                    </div>
                    <Switch
                      id="online-booking"
                      checked={selectedStaff.acceptsOnlineBookings}
                      onCheckedChange={checked =>
                        handleToggleOnlineBooking(selectedStaff.id, checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Working Hours */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="h-5 w-5" />
                      <span>Working Hours</span>
                    </CardTitle>
                    <Dialog open={editingHours} onOpenChange={setEditingHours}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Hours
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Edit Working Hours</DialogTitle>
                          <DialogDescription>
                            Set the working hours for{' '}
                            {selectedStaff.displayName}
                          </DialogDescription>
                        </DialogHeader>
                        <WorkingHoursEditor
                          workingHours={selectedStaff.workingHours}
                          onSave={hours =>
                            handleUpdateWorkingHours(selectedStaff.id, hours)
                          }
                          onCancel={() => setEditingHours(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6, 0].map(dayIndex => {
                      const dayHours = selectedStaff.workingHours[dayIndex];
                      return (
                        <div
                          key={dayIndex}
                          className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0"
                        >
                          <span className="text-sm font-medium">
                            {getDayName(dayIndex)}
                          </span>
                          {dayHours?.enabled ? (
                            <Badge variant="outline">
                              {dayHours.start} - {dayHours.end}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Closed</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Calendar View */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarIcon className="h-5 w-5" />
                    <span>Schedule Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={date => date && setSelectedDate(date)}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-600">
                  Select a staff member to view their availability settings
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface WorkingHoursEditorProps {
  workingHours: WorkingHours;
  onSave: (hours: WorkingHours) => void;
  onCancel: () => void;
}

function WorkingHoursEditor({
  workingHours,
  onSave,
  onCancel,
}: WorkingHoursEditorProps) {
  const [hours, setHours] = useState<WorkingHours>(workingHours);

  const handleDayToggle = (dayIndex: number, enabled: boolean) => {
    setHours(prev => ({
      ...prev,
      [dayIndex]: enabled
        ? { enabled: true, start: '09:00', end: '17:00' }
        : null,
    }));
  };

  const handleTimeChange = (
    dayIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setHours(prev => ({
      ...prev,
      [dayIndex]: prev[dayIndex]
        ? { ...prev[dayIndex]!, [field]: value }
        : { enabled: true, start: '09:00', end: '17:00', [field]: value },
    }));
  };

  const getDayName = (dayIndex: number) => {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[dayIndex];
  };

  return (
    <div className="space-y-4">
      <div className="max-h-96 space-y-3 overflow-y-auto">
        {[1, 2, 3, 4, 5, 6, 0].map(dayIndex => {
          const dayHours = hours[dayIndex];
          return (
            <div key={dayIndex} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {getDayName(dayIndex)}
                </Label>
                <Switch
                  checked={dayHours?.enabled || false}
                  onCheckedChange={checked =>
                    handleDayToggle(dayIndex, checked)
                  }
                />
              </div>

              {dayHours?.enabled && (
                <div className="ml-4 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-600">Start</Label>
                    <Input
                      type="time"
                      value={dayHours.start}
                      onChange={e =>
                        handleTimeChange(dayIndex, 'start', e.target.value)
                      }
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">End</Label>
                    <Input
                      type="time"
                      value={dayHours.end}
                      onChange={e =>
                        handleTimeChange(dayIndex, 'end', e.target.value)
                      }
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end space-x-2 border-t pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(hours)}>Save Changes</Button>
      </div>
    </div>
  );
}
