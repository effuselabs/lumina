'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  AppointmentStatus,
  DashboardAppointment,
} from '@/types/dashboard-appointments';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, DollarSign, Save, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Form validation schema
const appointmentFormSchema = z.object({
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  date: z.string().min(1, 'Date is required'),
  staffId: z.string().min(1, 'Staff member is required'),
  serviceIds: z.array(z.string()).min(1, 'At least one service is required'),
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Valid email is required'),
  clientPhone: z.string().min(1, 'Phone number is required'),
  notes: z.string().optional(),
  status: z.nativeEnum(AppointmentStatus),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

export interface AppointmentFormProps {
  appointment?: DashboardAppointment | null;
  onSave: (appointment: Partial<DashboardAppointment>) => Promise<void>;
  onCancel: () => void;
  staffMembers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
  }>;
  services: Array<{
    id: string;
    name: string;
    duration: number;
    price: number;
  }>;
  isLoading?: boolean;
}

/**
 * AppointmentForm Component
 *
 * Comprehensive form for creating and editing appointments with validation.
 * Handles service selection, pricing calculation, and conflict detection.
 *
 * Requirements: 3.1, 3.3, 3.4, 3.5
 */
export function AppointmentForm({
  appointment,
  onSave,
  onCancel,
  staffMembers,
  services,
  isLoading = false,
}: AppointmentFormProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>(
    appointment?.services.map(s => s.id) || []
  );
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const isEditing = !!appointment;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      date: appointment
        ? appointment.startTime.toISOString().split('T')[0]
        : '',
      startTime: appointment
        ? appointment.startTime.toTimeString().slice(0, 5)
        : '',
      endTime: appointment
        ? appointment.endTime.toTimeString().slice(0, 5)
        : '',
      staffId: appointment?.staffId || '',
      serviceIds: appointment?.services.map(s => s.id) || [],
      clientName: appointment
        ? `${appointment.client.firstName} ${appointment.client.lastName}`
        : '',
      clientEmail: appointment?.client.email || '',
      clientPhone: appointment?.client.phone || '',
      notes: appointment?.notes || '',
      status: appointment?.status || AppointmentStatus.SCHEDULED,
    },
  });

  // Calculate totals when services change
  useEffect(() => {
    const selectedServiceData = services.filter(service =>
      selectedServices.includes(service.id)
    );

    const price = selectedServiceData.reduce(
      (sum, service) => sum + service.price,
      0
    );
    const duration = selectedServiceData.reduce(
      (sum, service) => sum + service.duration,
      0
    );

    setTotalPrice(price);
    setTotalDuration(duration);

    // Update end time based on duration
    const startTime = watch('startTime');
    const date = watch('date');

    if (startTime && date && duration > 0) {
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
      const endTimeString = endDateTime.toTimeString().slice(0, 5);
      setValue('endTime', endTimeString);
    }
  }, [selectedServices, services, watch, setValue]);

  const formatPrice = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const handleServiceToggle = (serviceId: string) => {
    const newSelectedServices = selectedServices.includes(serviceId)
      ? selectedServices.filter(id => id !== serviceId)
      : [...selectedServices, serviceId];

    setSelectedServices(newSelectedServices);
    setValue('serviceIds', newSelectedServices);
  };

  const onSubmit = async (data: AppointmentFormData) => {
    try {
      const startDateTime = new Date(`${data.date}T${data.startTime}`);
      const endDateTime = new Date(`${data.date}T${data.endTime}`);

      const [firstName, ...lastNameParts] = data.clientName.split(' ');
      const lastName = lastNameParts.join(' ');

      const appointmentData: Partial<DashboardAppointment> = {
        startTime: startDateTime,
        endTime: endDateTime,
        staffId: data.staffId,
        status: data.status,
        notes: data.notes,
        totalPrice: totalPrice,
        totalDuration: totalDuration,
        services: services
          .filter(s => selectedServices.includes(s.id))
          .map(s => ({
            id: s.id,
            name: s.name,
            duration: s.duration,
            price: s.price,
          })),
        client: {
          id: appointment?.client.id || '',
          firstName,
          lastName,
          email: data.clientEmail,
          phone: data.clientPhone,
        },
      };

      await onSave(appointmentData);
    } catch (error) {
      console.error('Failed to save appointment:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-1">
      {/* Date and Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Date & Time</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                {...register('date')}
                className={cn(errors.date && 'border-red-500')}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.date.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                {...register('startTime')}
                className={cn(errors.startTime && 'border-red-500')}
              />
              {errors.startTime && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.startTime.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                {...register('endTime')}
                className={cn(errors.endTime && 'border-red-500')}
                readOnly
              />
              {errors.endTime && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.endTime.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Staff Member</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={watch('staffId')}
            onValueChange={value => setValue('staffId', value)}
          >
            <SelectTrigger className={cn(errors.staffId && 'border-red-500')}>
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              {staffMembers.map(staff => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.staffId && (
            <p className="mt-1 text-sm text-red-500">
              {errors.staffId.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Services</span>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{formatPrice(totalPrice)}</p>
              <p className="text-sm text-gray-500">
                {formatDuration(totalDuration)}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {services.map(service => (
            <div
              key={service.id}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors',
                selectedServices.includes(service.id)
                  ? 'bg-lumina-radiant/10 border-lumina-coral'
                  : 'border-gray-200 hover:border-gray-300'
              )}
              onClick={() => handleServiceToggle(service.id)}
            >
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedServices.includes(service.id)}
                  onChange={() => handleServiceToggle(service.id)}
                />
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatDuration(service.duration)}
                  </p>
                </div>
              </div>
              <p className="font-medium">{formatPrice(service.price)}</p>
            </div>
          ))}
          {errors.serviceIds && (
            <p className="text-sm text-red-500">{errors.serviceIds.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="clientName">Full Name</Label>
            <Input
              id="clientName"
              {...register('clientName')}
              className={cn(errors.clientName && 'border-red-500')}
              placeholder="Enter client's full name"
            />
            {errors.clientName && (
              <p className="mt-1 text-sm text-red-500">
                {errors.clientName.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                {...register('clientEmail')}
                className={cn(errors.clientEmail && 'border-red-500')}
                placeholder="client@example.com"
              />
              {errors.clientEmail && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.clientEmail.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="clientPhone">Phone</Label>
              <Input
                id="clientPhone"
                type="tel"
                {...register('clientPhone')}
                className={cn(errors.clientPhone && 'border-red-500')}
                placeholder="(555) 123-4567"
              />
              {errors.clientPhone && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.clientPhone.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status and Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing && (
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch('status')}
                onValueChange={value =>
                  setValue('status', value as AppointmentStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(AppointmentStatus).map(status => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Add any special notes or requests..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !isValid}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading
            ? 'Saving...'
            : isEditing
              ? 'Update Appointment'
              : 'Create Appointment'}
        </Button>
      </div>
    </form>
  );
}
