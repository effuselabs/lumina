'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { BusinessSettings, businessSettingsSchema } from '@/lib/validations/business';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

interface SettingsStepProps {
  data: Partial<BusinessSettings>;
  onNext: (data: BusinessSettings) => void;
  onPrevious: () => void;
}

export function SettingsStep({ data, onNext, onPrevious }: SettingsStepProps) {
  const form = useForm<BusinessSettings>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      bookingEnabled: data.bookingEnabled ?? true,
      onlineBooking: data.onlineBooking ?? true,
      requireDeposit: data.requireDeposit ?? false,
      depositAmount: data.depositAmount || 0,
      cancellationPolicy: data.cancellationPolicy || '',
      primaryColor: data.primaryColor || '#FFD25A',
    },
  });

  const handleSubmit = (formData: BusinessSettings) => {
    onNext(formData);
  };

  const requireDeposit = form.watch('requireDeposit');

  return (
    <div className="mx-auto max-w-2xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="bookingEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Booking System</FormLabel>
                    <FormDescription>
                      Allow clients to book appointments through your system
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="onlineBooking"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Online Booking</FormLabel>
                    <FormDescription>
                      Allow clients to book appointments online 24/7
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requireDeposit"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Require Deposit</FormLabel>
                    <FormDescription>
                      Require clients to pay a deposit when booking
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {requireDeposit && (
              <FormField
                control={form.control}
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="25.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className="focus:ring-2 focus:ring-orange-500"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </div>

          <FormField
            control={form.control}
            name="cancellationPolicy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cancellation Policy (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., 24-hour cancellation notice required..."
                    className="min-h-[100px] resize-none focus:ring-2 focus:ring-orange-500"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  This will be shown to clients when they book appointments
                </FormDescription>
              </FormItem>
            )}
          />

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
            >
              Previous
            </Button>

            <Button
              type="submit"
              className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600"
            >
              Continue
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}