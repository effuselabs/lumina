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
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const createServiceSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(255),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be positive'),
  duration: z.coerce.number().min(1, 'Duration must be at least 1 minute'),
});

type CreateServiceFormData = z.infer<typeof createServiceSchema>;

interface ServiceCreateDialogProps {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ServiceCreateDialog({
  businessId,
  open,
  onOpenChange,
  onSuccess,
}: ServiceCreateDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateServiceFormData>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      price: undefined,
      duration: undefined,
    },
  });

  const onSubmit = async (data: CreateServiceFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          businessId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create service');
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error creating service
      alert(
        `Error creating service: ${error instanceof Error ? error.message : 'Unknown error'}`
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
            <Plus className="text-lumina-primary h-5 w-5" />
            Add New Service
          </DialogTitle>
          <DialogDescription className="lumina-dialog-description">
            Create a new service for your business with pricing and duration.
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
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
                Create Service
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
