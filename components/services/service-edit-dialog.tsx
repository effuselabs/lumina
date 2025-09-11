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
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const editServiceSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(255),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be positive'),
  duration: z.coerce.number().min(1, 'Duration must be at least 1 minute'),
});

type EditServiceFormData = z.infer<typeof editServiceSchema>;

interface Service {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  duration: number;
  isActive: boolean;
}

interface ServiceEditDialogProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ServiceEditDialog({
  service,
  open,
  onOpenChange,
  onSuccess,
}: ServiceEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditServiceFormData>({
    resolver: zodResolver(editServiceSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      price: undefined,
      duration: undefined,
    },
  });

  // Reset form when service changes
  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        description: service.description || '',
        category: service.category || '',
        price: service.price,
        duration: service.duration,
      });
    }
  }, [service, form]);

  const onSubmit = async (data: EditServiceFormData) => {
    if (!service) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/services/${service.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update service');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      // Error updating service
      alert(
        `Error updating service: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="lumina-dialog-title flex items-center gap-2">
            <Edit className="text-lumina-primary h-5 w-5" />
            Edit Service
          </DialogTitle>
          <DialogDescription className="lumina-dialog-description">
            Update the service details, pricing, and duration.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="lumina-form-label">
                      Service Name *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Haircut & Style"
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="lumina-form-label">
                      Category
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="lumina-form-input">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Hair">Hair</SelectItem>
                        <SelectItem value="Nails">Nails</SelectItem>
                        <SelectItem value="Skincare">Skincare</SelectItem>
                        <SelectItem value="Massage">Massage</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="lumina-form-label">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe this service..."
                      className="lumina-form-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="lumina-form-label">
                      Price ($) *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g., 75.00"
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
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="lumina-form-label">
                      Duration (minutes) *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g., 60"
                        className="lumina-form-input"
                        value={field.value?.toString() || ''}
                        onChange={e => {
                          const value = e.target.value;
                          field.onChange(
                            value === '' ? undefined : parseInt(value)
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                Update Service
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
