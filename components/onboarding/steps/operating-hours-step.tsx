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
  type BusinessOperatingHours,
  businessOperatingHoursSchema,
  defaultOperatingHours,
} from '@/lib/validations/business';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, Copy } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StepContainer } from '../step-container';

interface OperatingHoursStepProps {
  data: Partial<BusinessOperatingHours>;
  onNext: (data: BusinessOperatingHours) => void;
  onPrevious: () => void;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

type DayKey = (typeof DAYS_OF_WEEK)[number]['key'];

export function OperatingHoursStep({
  data,
  onNext,
  onPrevious,
}: OperatingHoursStepProps) {
  const [operatingHours, setOperatingHours] = useState(
    data.operatingHours || defaultOperatingHours
  );

  const {
    handleSubmit,
    formState: { isValid },
  } = useForm<BusinessOperatingHours>({
    resolver: zodResolver(businessOperatingHoursSchema),
    defaultValues: data,
    mode: 'onChange',
  });

  const updateDayHours = (
    day: DayKey,
    field: 'isOpen' | 'openTime' | 'closeTime',
    value: boolean | string
  ) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const copyHoursToAll = (sourceDay: DayKey) => {
    const sourceHours = operatingHours[sourceDay];
    const newHours = { ...operatingHours };

    DAYS_OF_WEEK.forEach(({ key }) => {
      if (key !== sourceDay) {
        newHours[key] = { ...sourceHours };
      }
    });

    setOperatingHours(newHours);
  };

  const onSubmit = () => {
    onNext({ operatingHours });
  };

  return (
    <StepContainer
      title="When are you open?"
      description="Set your business hours so clients know when they can book appointments."
      icon={<Clock className="h-8 w-8 text-orange-500" />}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Operating Hours</CardTitle>
            <CardDescription>
              Configure your business hours for each day of the week. Clients
              will only be able to book during these times.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DAYS_OF_WEEK.map(({ key, label }) => {
              const dayHours = operatingHours[key];

              return (
                <div
                  key={key}
                  className="flex items-center gap-4 rounded-lg border border-gray-200 p-4"
                >
                  {/* Day Label */}
                  <div className="w-24 flex-shrink-0">
                    <Label className="text-sm font-medium">{label}</Label>
                  </div>

                  {/* Open/Closed Toggle */}
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={dayHours.isOpen}
                        onChange={e =>
                          updateDayHours(key, 'isOpen', e.target.checked)
                        }
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-orange-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300"></div>
                    </label>
                    <span className="text-sm text-gray-600">
                      {dayHours.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>

                  {/* Time Inputs */}
                  {dayHours.isOpen && (
                    <>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-gray-600">From:</Label>
                        <Input
                          type="time"
                          value={dayHours.openTime}
                          onChange={e =>
                            updateDayHours(key, 'openTime', e.target.value)
                          }
                          className="w-32"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-gray-600">To:</Label>
                        <Input
                          type="time"
                          value={dayHours.closeTime}
                          onChange={e =>
                            updateDayHours(key, 'closeTime', e.target.value)
                          }
                          className="w-32"
                        />
                      </div>

                      {/* Copy Hours Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyHoursToAll(key)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Copy className="h-3 w-3" />
                        Copy to all
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Quick Presets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Presets</CardTitle>
            <CardDescription>
              Apply common business hour patterns to save time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const businessHours = {
                    monday: {
                      isOpen: true,
                      openTime: '09:00',
                      closeTime: '17:00',
                    },
                    tuesday: {
                      isOpen: true,
                      openTime: '09:00',
                      closeTime: '17:00',
                    },
                    wednesday: {
                      isOpen: true,
                      openTime: '09:00',
                      closeTime: '17:00',
                    },
                    thursday: {
                      isOpen: true,
                      openTime: '09:00',
                      closeTime: '17:00',
                    },
                    friday: {
                      isOpen: true,
                      openTime: '09:00',
                      closeTime: '17:00',
                    },
                    saturday: { isOpen: false, openTime: '', closeTime: '' },
                    sunday: { isOpen: false, openTime: '', closeTime: '' },
                  };
                  setOperatingHours(businessHours);
                }}
                className="text-sm"
              >
                Mon-Fri 9-5
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const businessHours = {
                    monday: {
                      isOpen: true,
                      openTime: '09:00',
                      closeTime: '18:00',
                    },
                    tuesday: {
                      isOpen: true,
                      openTime: '09:00',
                      closeTime: '18:00',
                    },
                    wednesday: {
                      isOpen: true,
                      openTime: '09:00',
                      closeTime: '18:00',
                    },
                    thursday: {
                      isOpen: true,
                      openTime: '09:00',
                      closeTime: '18:00',
                    },
                    friday: {
                      isOpen: true,
                      openTime: '09:00',
                      closeTime: '18:00',
                    },
                    saturday: {
                      isOpen: true,
                      openTime: '09:00',
                      closeTime: '17:00',
                    },
                    sunday: { isOpen: false, openTime: '', closeTime: '' },
                  };
                  setOperatingHours(businessHours);
                }}
                className="text-sm"
              >
                Mon-Sat 9-6
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const businessHours = {
                    monday: { isOpen: false, openTime: '', closeTime: '' },
                    tuesday: {
                      isOpen: true,
                      openTime: '10:00',
                      closeTime: '19:00',
                    },
                    wednesday: {
                      isOpen: true,
                      openTime: '10:00',
                      closeTime: '19:00',
                    },
                    thursday: {
                      isOpen: true,
                      openTime: '10:00',
                      closeTime: '19:00',
                    },
                    friday: {
                      isOpen: true,
                      openTime: '10:00',
                      closeTime: '19:00',
                    },
                    saturday: {
                      isOpen: true,
                      openTime: '09:00',
                      closeTime: '18:00',
                    },
                    sunday: {
                      isOpen: true,
                      openTime: '11:00',
                      closeTime: '17:00',
                    },
                  };
                  setOperatingHours(businessHours);
                }}
                className="text-sm"
              >
                Tue-Sun 10-7
              </Button>
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
            Complete Setup
          </Button>
        </div>
      </form>
    </StepContainer>
  );
}
