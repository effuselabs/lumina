'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type BusinessAddress,
  businessAddressSchema,
} from '@/lib/validations/business';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { StepContainer } from '../step-container';

interface AddressStepProps {
  data: Partial<BusinessAddress>;
  onNext: (data: BusinessAddress) => void;
  onPrevious: () => void;
}

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
];

export function AddressStep({ data, onNext, onPrevious }: AddressStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<BusinessAddress>({
    resolver: zodResolver(businessAddressSchema),
    defaultValues: data,
    mode: 'onChange',
  });

  const watchedState = watch('state');
  const watchedTimezone = watch('timezone');

  const onSubmit = (formData: BusinessAddress) => {
    onNext(formData);
  };

  return (
    <StepContainer
      title="Where are you located?"
      description="Help clients find you by providing your business address and timezone."
      icon={<MapPin className="h-8 w-8 text-orange-500" />}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Street Address */}
        <div className="space-y-2">
          <Label
            htmlFor="address"
            className="text-sm font-medium text-gray-700"
          >
            Street Address *
          </Label>
          <Input
            id="address"
            {...register('address')}
            placeholder="123 Main Street"
            className="w-full"
          />
          {errors.address && (
            <p className="text-sm text-red-600">{errors.address.message}</p>
          )}
        </div>

        {/* City, State, ZIP */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="city" className="text-sm font-medium text-gray-700">
              City *
            </Label>
            <Input id="city" {...register('city')} placeholder="City" />
            {errors.city && (
              <p className="text-sm text-red-600">{errors.city.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="state"
              className="text-sm font-medium text-gray-700"
            >
              State *
            </Label>
            <Select
              value={watchedState}
              onValueChange={value =>
                setValue('state', value, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map(state => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && (
              <p className="text-sm text-red-600">{errors.state.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="zipCode"
              className="text-sm font-medium text-gray-700"
            >
              ZIP Code *
            </Label>
            <Input id="zipCode" {...register('zipCode')} placeholder="12345" />
            {errors.zipCode && (
              <p className="text-sm text-red-600">{errors.zipCode.message}</p>
            )}
          </div>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label
            htmlFor="timezone"
            className="text-sm font-medium text-gray-700"
          >
            Timezone *
          </Label>
          <Select
            value={watchedTimezone}
            onValueChange={value =>
              setValue('timezone', value, { shouldValidate: true })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(timezone => (
                <SelectItem key={timezone.value} value={timezone.value}>
                  {timezone.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.timezone && (
            <p className="text-sm text-red-600">{errors.timezone.message}</p>
          )}
        </div>

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
