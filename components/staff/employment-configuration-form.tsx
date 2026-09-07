'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type EmploymentConfiguration,
  type EmploymentType,
  createEmploymentValidationSchema,
  employmentTypeDescriptions,
  rentalPeriodDescriptions,
} from '@/lib/validations/employment';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarIcon,
  DollarSignIcon,
  InfoIcon,
  PercentIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { EmploymentCalculationPreview } from './employment-calculation-preview';

interface EmploymentConfigurationFormProps {
  initialData?: Partial<EmploymentConfiguration>;
  onSubmit: (data: EmploymentConfiguration) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  showPreview?: boolean;
}

export function EmploymentConfigurationForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  showPreview = true,
}: EmploymentConfigurationFormProps) {
  const [selectedType, setSelectedType] = useState<EmploymentType>(
    initialData?.employmentType || 'COMMISSION'
  );

  const form = useForm<EmploymentConfiguration>({
    resolver: zodResolver(createEmploymentValidationSchema(selectedType)),
    defaultValues: {
      employmentType: 'COMMISSION',
      commissionRate: undefined,
      chairRentalAmount: undefined,
      chairRentalPeriod: undefined,
      baseSalary: undefined,
      ...initialData,
    },
  });

  // Update validation schema when employment type changes
  useEffect(() => {
    const newSchema = createEmploymentValidationSchema(selectedType);
    form.clearErrors();

    // Reset fields that are not applicable to the new type
    if (selectedType === 'COMMISSION') {
      form.setValue('chairRentalAmount', undefined);
      form.setValue('chairRentalPeriod', undefined);
    } else if (selectedType === 'CHAIR_RENTAL') {
      form.setValue('commissionRate', undefined);
      form.setValue('baseSalary', undefined);
    }
  }, [selectedType, form]);

  const watchedValues = form.watch();
  const typeInfo = employmentTypeDescriptions[selectedType];

  const handleEmploymentTypeChange = (value: EmploymentType) => {
    setSelectedType(value);
    form.setValue('employmentType', value);
  };

  const handleSubmit = (data: EmploymentConfiguration) => {
    onSubmit(data);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Employment Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSignIcon className="h-5 w-5" />
                Employment Type
              </CardTitle>
              <CardDescription>
                Choose how this staff member will be compensated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Model *</FormLabel>
                    <Select
                      onValueChange={handleEmploymentTypeChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(employmentTypeDescriptions).map(
                          ([key, info]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <span>{info.title}</span>
                                <Badge variant="outline" className="text-xs">
                                  {key.toLowerCase().replace('_', ' ')}
                                </Badge>
                              </div>
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Employment Type Information */}
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">{typeInfo.title}</p>
                    <p className="text-sm">{typeInfo.description}</p>
                    <p className="text-xs italic text-muted-foreground">
                      Example: {typeInfo.example}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Dynamic Configuration Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration Details</CardTitle>
              <CardDescription>
                Set the specific parameters for this employment type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Commission Rate Field */}
              {(selectedType === 'COMMISSION' || selectedType === 'HYBRID') && (
                <FormField
                  control={form.control}
                  name="commissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <PercentIcon className="h-4 w-4" />
                        Commission Rate *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="50"
                            min="0"
                            max="100"
                            step="0.1"
                            {...field}
                            onChange={e =>
                              field.onChange(
                                parseFloat(e.target.value) || undefined
                              )
                            }
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Percentage of service revenue the staff member earns
                        {selectedType === 'HYBRID' &&
                          ' (typically lower in hybrid model)'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Chair Rental Fields */}
              {(selectedType === 'CHAIR_RENTAL' ||
                selectedType === 'HYBRID') && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="chairRentalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <DollarSignIcon className="h-4 w-4" />
                          Rental Amount *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              placeholder="200"
                              min="0"
                              step="0.01"
                              {...field}
                              onChange={e =>
                                field.onChange(
                                  parseFloat(e.target.value) || undefined
                                )
                              }
                              className="pl-8"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Fixed rental fee per period
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="chairRentalPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          Rental Period *
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(rentalPeriodDescriptions).map(
                              ([key, info]) => (
                                <SelectItem key={key} value={key}>
                                  {info.title} - {info.description}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How often the rental fee is charged
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Base Salary Field */}
              {(selectedType === 'COMMISSION' || selectedType === 'HYBRID') && (
                <FormField
                  control={form.control}
                  name="baseSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSignIcon className="h-4 w-4" />
                        Base Salary (Optional)
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            placeholder="0"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={e =>
                              field.onChange(
                                parseFloat(e.target.value) || undefined
                              )
                            }
                            className="pl-8"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Fixed amount paid regardless of performance (per period)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Calculation Preview */}
          {showPreview && (
            <EmploymentCalculationPreview
              configuration={watchedValues}
              className="mt-6"
            />
          )}

          {/* Form Actions */}
          <div className="flex justify-between">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600"
            >
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
