'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { DollarSign, Loader2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const editStaffSchema = z
  .object({
    displayName: z.string().min(1, 'Display name is required').max(100),
    title: z.string().optional(),
    role: z.enum(['STAFF', 'MANAGER']),
    employmentType: z.enum(['COMMISSION', 'CHAIR_RENTAL', 'HYBRID']),
    commissionRate: z.coerce.number().min(0).max(100).optional(),
    chairRentalAmount: z.coerce.number().min(0).optional(),
    chairRentalPeriod: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
    baseSalary: z.coerce.number().min(0).optional(),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    // Commission employment validation
    if (data.employmentType === 'COMMISSION') {
      if (!data.commissionRate || data.commissionRate <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Commission rate is required and must be greater than 0',
          path: ['commissionRate'],
        });
      }
    }

    // Chair rental employment validation
    if (data.employmentType === 'CHAIR_RENTAL') {
      if (!data.chairRentalAmount || data.chairRentalAmount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Chair rental amount is required and must be greater than 0',
          path: ['chairRentalAmount'],
        });
      }
      if (!data.chairRentalPeriod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Rental period is required',
          path: ['chairRentalPeriod'],
        });
      }
    }

    // Hybrid employment validation
    if (data.employmentType === 'HYBRID') {
      if (!data.commissionRate || data.commissionRate <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Commission rate is required and must be greater than 0',
          path: ['commissionRate'],
        });
      }
      if (!data.baseSalary || data.baseSalary <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Base salary is required and must be greater than 0',
          path: ['baseSalary'],
        });
      }
    }
  });

type EditStaffFormData = z.infer<typeof editStaffSchema>;

interface StaffEditDialogProps {
  staff: any; // We'll type this properly based on the actual staff object
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function StaffEditDialog({
  staff,
  open,
  onOpenChange,
  onSuccess,
}: StaffEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditStaffFormData>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: {
      displayName: staff?.displayName || '',
      title: staff?.title || '',
      role: staff?.role || 'STAFF',
      employmentType: staff?.employmentType || 'COMMISSION',
      commissionRate: staff?.commissionRate || undefined,
      chairRentalAmount: staff?.chairRentalAmount || undefined,
      chairRentalPeriod: staff?.chairRentalPeriod || undefined,
      baseSalary: staff?.baseSalary || undefined,
      isActive: staff?.isActive ?? true,
    },
  });

  // Watch for employment type changes and clear irrelevant fields
  const employmentType = form.watch('employmentType');
  useEffect(() => {
    // Clear fields that don't apply to the current employment type
    if (employmentType === 'COMMISSION') {
      form.setValue('chairRentalAmount', undefined);
      form.setValue('chairRentalPeriod', undefined);
      form.setValue('baseSalary', undefined);
    } else if (employmentType === 'CHAIR_RENTAL') {
      form.setValue('commissionRate', undefined);
      form.setValue('baseSalary', undefined);
    } else if (employmentType === 'HYBRID') {
      form.setValue('chairRentalAmount', undefined);
      form.setValue('chairRentalPeriod', undefined);
    }
  }, [employmentType, form]);

  const onSubmit = async (data: EditStaffFormData) => {
    console.log('Form submission started', { data, staffId: staff?.id });

    if (!staff?.id) {
      console.error('No staff ID available');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Sending PUT request to:', `/api/staff/${staff.id}`);
      const response = await fetch(`/api/staff/${staff.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to update staff member');
      }

      const result = await response.json();
      console.log('Update successful:', result);

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating staff:', error);
      // TODO: Add toast notification for user feedback
      alert(
        `Error updating staff: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!staff) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="lumina-dialog-title flex items-center gap-2">
            <User className="text-lumina-primary h-5 w-5" />
            Edit Staff Member
          </DialogTitle>
          <DialogDescription className="lumina-dialog-description">
            Update {staff.displayName}&apos;s information and employment
            details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, errors => {
              console.log('Form validation errors:', errors);
              alert('Please fix the form errors before submitting');
            })}
            className="space-y-6"
          >
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lumina-primary text-lg font-semibold">
                Basic Information
              </h3>

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="lumina-form-label">
                      Display Name *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter display name"
                        className="lumina-form-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="lumina-form-label">
                      Job Title
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Senior Stylist"
                        className="lumina-form-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="lumina-form-label">Role *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="lumina-form-input">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="STAFF">Staff</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Employment Information */}
            <div className="space-y-4">
              <h3 className="text-lumina-primary flex items-center gap-2 text-lg font-semibold">
                <DollarSign className="text-lumina-primary h-5 w-5" />
                Employment Details
              </h3>

              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="lumina-form-label">
                      Employment Type *
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="lumina-form-input">
                          <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="COMMISSION">Commission</SelectItem>
                        <SelectItem value="CHAIR_RENTAL">
                          Chair Rental
                        </SelectItem>
                        <SelectItem value="HYBRID">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Commission Rate - Only for Commission employment */}
              {form.watch('employmentType') === 'COMMISSION' && (
                <FormField
                  control={form.control}
                  name="commissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="lumina-form-label">
                        Commission Rate (%)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="e.g., 50"
                          className="lumina-form-input"
                          value={field.value?.toString() || ''}
                          onChange={e => {
                            const value = e.target.value;
                            field.onChange(
                              value === '' ? undefined : parseFloat(value)
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Chair Rental Fields - Only for Chair Rental employment */}
              {form.watch('employmentType') === 'CHAIR_RENTAL' && (
                <>
                  <FormField
                    control={form.control}
                    name="chairRentalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="lumina-form-label">
                          Chair Rental Amount ($)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="e.g., 150.00"
                            className="lumina-form-input"
                            value={field.value?.toString() || ''}
                            onChange={e => {
                              const value = e.target.value;
                              field.onChange(
                                value === '' ? undefined : parseFloat(value)
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="chairRentalPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="lumina-form-label">
                          Rental Period
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="lumina-form-input">
                              <SelectValue placeholder="Select rental period" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DAILY">Daily</SelectItem>
                            <SelectItem value="WEEKLY">Weekly</SelectItem>
                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Hybrid Employment Fields - Commission + Base Salary */}
              {form.watch('employmentType') === 'HYBRID' && (
                <>
                  <FormField
                    control={form.control}
                    name="commissionRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="lumina-form-label">
                          Commission Rate (%)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="e.g., 30"
                            className="lumina-form-input"
                            value={field.value?.toString() || ''}
                            onChange={e => {
                              const value = e.target.value;
                              field.onChange(
                                value === '' ? undefined : parseFloat(value)
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="baseSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="lumina-form-label">
                          Base Salary ($)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="e.g., 2000.00"
                            className="lumina-form-input"
                            value={field.value?.toString() || ''}
                            onChange={e => {
                              const value = e.target.value;
                              field.onChange(
                                value === '' ? undefined : parseFloat(value)
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            {/* Services Section with Null Safety */}
            <div className="space-y-4">
              <h3 className="text-lumina-primary text-lg font-semibold">
                Service Assignments
              </h3>
              <div className="text-lumina-secondary text-sm">
                {staff.services &&
                Array.isArray(staff.services) &&
                staff.services.length > 0 ? (
                  <p>
                    Currently assigned to {staff.services.length} service
                    {staff.services.length !== 1 ? 's' : ''}
                  </p>
                ) : (
                  <p>No services currently assigned</p>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Staff Member
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
