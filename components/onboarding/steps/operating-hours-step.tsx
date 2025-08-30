'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  BusinessOperatingHours,
  businessOperatingHoursSchema,
  defaultOperatingHours,
} from '@/lib/validations/business';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

interface OperatingHoursStepProps {
  data: Partial<BusinessOperatingHours>;
  onNext: (data: BusinessOperatingHours) => void;
  onPrevious: () => void;
}

const daysOfWeek = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export function OperatingHoursStep({
  data,
  onNext,
  onPrevious,
}: OperatingHoursStepProps) {
  const form = useForm<BusinessOperatingHours>({
    resolver: zodResolver(businessOperatingHoursSchema),
    defaultValues: {
      operatingHours: data.operatingHours || defaultOperatingHours,
    },
  });

  const handleSubmit = (formData: BusinessOperatingHours) => {
    onNext(formData);
  };

  const operatingHours = form.watch('operatingHours') || defaultOperatingHours;

  return (
    <div className="mx-auto max-w-2xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Set Your Operating Hours
            </h3>
            <p className="text-gray-600">
              Configure when your business is open for appointments. You can
              always change these later.
            </p>

            {daysOfWeek.map(day => {
              const dayHours =
                operatingHours[day.key as keyof typeof operatingHours];
              return (
                <div key={day.key} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <FormLabel className="text-base font-medium">
                      {day.label}
                    </FormLabel>
                    <FormField
                      control={form.control}
                      name={`operatingHours.${day.key}.isOpen` as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {dayHours?.isOpen && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`operatingHours.${day.key}.openTime` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Open Time</FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                className="focus:ring-2 focus:ring-orange-500"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`operatingHours.${day.key}.closeTime` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">
                              Close Time
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                className="focus:ring-2 focus:ring-orange-500"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {!dayHours?.isOpen && (
                    <p className="text-sm text-gray-500">Closed</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onPrevious}>
              Previous
            </Button>

            <Button
              type="submit"
              className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600"
            >
              Complete Setup
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
