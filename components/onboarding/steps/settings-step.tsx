'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type BusinessSettings,
  businessSettingsSchema,
} from '@/lib/validations/business';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, CreditCard, Settings, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { StepContainer } from '../step-container';

interface SettingsStepProps {
  data: Partial<BusinessSettings>;
  onNext: (data: BusinessSettings) => void;
  onPrevious: () => void;
}

export function SettingsStep({ data, onNext, onPrevious }: SettingsStepProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<BusinessSettings>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      bookingEnabled: true,
      onlineBooking: true,
      requireDeposit: false,
      primaryColor: '#FFD25A',
      ...data,
    },
    mode: 'onChange',
  });

  const watchBookingEnabled = watch('bookingEnabled');
  const watchRequireDeposit = watch('requireDeposit');

  const onSubmit = (formData: BusinessSettings) => {
    onNext(formData);
  };

  return (
    <StepContainer
      title="Configure your booking preferences"
      description="Set up how clients can book appointments and your business policies."
      icon={<Settings className="h-8 w-8 text-orange-500" />}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Booking Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-orange-500" />
              Booking Settings
            </CardTitle>
            <CardDescription>
              Control how clients can book appointments with your business.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable Booking */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  Enable Booking System
                </Label>
                <p className="text-sm text-gray-600">
                  Allow clients to book appointments through your system
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  {...register('bookingEnabled')}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-orange-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300"></div>
              </label>
            </div>

            {/* Online Booking */}
            {watchBookingEnabled && (
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Online Booking</Label>
                  <p className="text-sm text-gray-600">
                    Allow clients to book appointments online 24/7
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    {...register('onlineBooking')}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-orange-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300"></div>
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment & Deposit Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-orange-500" />
              Payment Settings
            </CardTitle>
            <CardDescription>
              Configure deposit requirements and payment policies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Require Deposit */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Require Deposit</Label>
                <p className="text-sm text-gray-600">
                  Require clients to pay a deposit when booking
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  {...register('requireDeposit')}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-orange-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300"></div>
              </label>
            </div>

            {/* Deposit Amount */}
            {watchRequireDeposit && (
              <div className="space-y-2">
                <Label htmlFor="depositAmount" className="text-sm font-medium">
                  Deposit Amount ($)
                </Label>
                <Input
                  id="depositAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('depositAmount', { valueAsNumber: true })}
                  placeholder="25.00"
                  className="w-full"
                />
                {errors.depositAmount && (
                  <p className="text-sm text-red-600">
                    {errors.depositAmount.message}
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  Fixed deposit amount required for all bookings
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Policies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-orange-500" />
              Business Policies
            </CardTitle>
            <CardDescription>
              Set your cancellation policy and other business rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cancellation Policy */}
            <div className="space-y-2">
              <Label
                htmlFor="cancellationPolicy"
                className="text-sm font-medium"
              >
                Cancellation Policy (Optional)
              </Label>
              <textarea
                id="cancellationPolicy"
                {...register('cancellationPolicy')}
                placeholder="e.g., 24-hour cancellation notice required. Late cancellations may be charged a fee."
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {errors.cancellationPolicy && (
                <p className="text-sm text-red-600">
                  {errors.cancellationPolicy.message}
                </p>
              )}
              <p className="text-sm text-gray-600">
                This will be shown to clients when they book appointments
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onPrevious}>
            Previous
          </Button>
          <Button
            type="submit"
            disabled={!isValid}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
          >
            Continue
          </Button>
        </div>
      </form>
    </StepContainer>
  );
}
