'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const createClientSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  preferredStaff: z.string().optional(),
  notes: z.string().optional(),
  emailMarketing: z.boolean().default(true),
  smsMarketing: z.boolean().default(true),
});

type CreateClientFormData = z.infer<typeof createClientSchema>;

interface Staff {
  id: string;
  displayName: string;
}

interface ClientCreateDialogProps {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ClientCreateDialog({
  businessId,
  open,
  onOpenChange,
  onSuccess,
}: ClientCreateDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);

  const form = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      preferredStaff: 'none',
      notes: '',
      emailMarketing: true,
      smsMarketing: true,
    },
  });

  // Load staff members
  useEffect(() => {
    const loadStaff = async () => {
      if (!businessId) return;

      try {
        const response = await fetch(`/api/staff?businessId=${businessId}`);
        if (response.ok) {
          const data = await response.json();
          setStaff(data.staff || []);
        }
      } catch (_error) {
        // Error loading staff - continue without staff options
      }
    };

    if (open) {
      loadStaff();
    }
  }, [businessId, open]);

  const onSubmit = async (data: CreateClientFormData) => {
    setIsLoading(true);
    try {
      // Clean up empty strings
      const cleanData = {
        ...data,
        businessId,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zipCode: data.zipCode || undefined,
        preferredStaff:
          data.preferredStaff === '' || data.preferredStaff === 'none'
            ? undefined
            : data.preferredStaff,
        notes: data.notes || undefined,
      };

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.details) {
          // Validation error details available
        }
        const errorMessage = errorData.details
          ? `Validation error: ${JSON.stringify(errorData.details)}`
          : errorData.error || 'Failed to create client';
        throw new Error(errorMessage);
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      alert(
        `Error creating client: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="lumina-dialog-title flex items-center gap-2">
            <Plus className="text-lumina-primary h-5 w-5" />
            Add New Client
          </DialogTitle>
          <DialogDescription className="lumina-dialog-description">
            Create a new client profile with contact information and
            preferences.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lumina-primary text-lg font-medium">
                Personal Information
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="lumina-form-label">
                        First Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter first name"
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
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="lumina-form-label">
                        Last Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter last name"
                          className="lumina-form-input"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="lumina-form-label">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="client@example.com"
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="lumina-form-label">Phone</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          className="lumina-form-input"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lumina-primary text-lg font-medium">
                Address (Optional)
              </h3>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="lumina-form-label">
                      Street Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Main Street"
                        className="lumina-form-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="lumina-form-label">City</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="City"
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
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="lumina-form-label">State</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="State"
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
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="lumina-form-label">
                        ZIP Code
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="12345"
                          className="lumina-form-input"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-4">
              <h3 className="text-lumina-primary text-lg font-medium">
                Preferences
              </h3>

              <FormField
                control={form.control}
                name="preferredStaff"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="lumina-form-label">
                      Preferred Staff Member
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="lumina-form-input">
                          <SelectValue placeholder="Select preferred staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No preference</SelectItem>
                        {staff.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.displayName}
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="lumina-form-label">Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes about this client..."
                        className="lumina-form-input"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Marketing Preferences */}
            <div className="space-y-4">
              <h3 className="text-lumina-primary text-lg font-medium">
                Marketing Preferences
              </h3>

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="emailMarketing"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="lumina-form-label">
                          Send email marketing and appointment reminders
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="smsMarketing"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="lumina-form-label">
                          Send SMS marketing and appointment reminders
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
                Create Client
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
