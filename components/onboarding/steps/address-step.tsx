'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  BusinessAddress,
  businessAddressSchema,
} from '@/lib/validations/business';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@radix-ui/react-select';
import { useForm } from 'react-hook-form';

const countries = [
  {
    code: 'US',
    name: 'United States',
    stateLabel: 'State',
    postalLabel: 'ZIP Code',
  },
  {
    code: 'CA',
    name: 'Canada',
    stateLabel: 'Province',
    postalLabel: 'Postal Code',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    stateLabel: 'County',
    postalLabel: 'Postal Code',
  },
  {
    code: 'AU',
    name: 'Australia',
    stateLabel: 'State',
    postalLabel: 'Postal Code',
  },
];

interface AddressStepProps {
  data: Partial<BusinessAddress>;
  onNext: (data: BusinessAddress) => void;
  onPrevious: () => void;
}

export function AddressStep({ data, onNext, onPrevious }: AddressStepProps) {
  const form = useForm<BusinessAddress>({
    resolver: zodResolver(businessAddressSchema),
    defaultValues: {
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      zipCode: data.zipCode || '',
      country: data.country || 'US',
      timezone: data.timezone || 'America/New_York',
    },
  });

  const selectedCountry = form.watch('country');
  const countryInfo =
    countries.find(c => c.code === selectedCountry) || countries[0];

  const handleSubmit = (formData: BusinessAddress) => {
    onNext(formData);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="focus:ring-2 focus:ring-orange-500">
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {countries.map(country => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123 Main Street"
                    {...field}
                    className="focus:ring-2 focus:ring-orange-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        selectedCountry === 'CA' ? 'Toronto' : 'New York'
                      }
                      {...field}
                      className="focus:ring-2 focus:ring-orange-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{countryInfo.stateLabel} *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        selectedCountry === 'CA'
                          ? 'ON'
                          : selectedCountry === 'GB'
                            ? 'London'
                            : 'NY'
                      }
                      {...field}
                      className="focus:ring-2 focus:ring-orange-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="zipCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{countryInfo.postalLabel} *</FormLabel>
                <FormControl>
                  <Input
                    placeholder={
                      selectedCountry === 'CA'
                        ? 'K1A 0A6'
                        : selectedCountry === 'GB'
                          ? 'SW1A 1AA'
                          : '10001'
                    }
                    {...field}
                    className="focus:ring-2 focus:ring-orange-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onPrevious}>
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
