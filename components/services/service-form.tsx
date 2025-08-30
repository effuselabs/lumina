'use client';

import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { CreateServiceData, Service, UpdateServiceData } from '@/hooks/useServices';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const serviceFormSchema = z.object({
    name: z.string().min(1, 'Service name is required').max(255, 'Name is too long'),
    description: z.string().optional(),
    category: z.string().optional(),
    price: z.number().min(0, 'Price must be positive'),
    duration: z.number().min(1, 'Duration must be at least 1 minute'),
    isActive: z.boolean().default(true),
    isOnline: z.boolean().default(true),
});

type ServiceFormData = z.infer<typeof serviceFormSchema>;

interface ServiceFormProps {
    businessId: string;
    service?: Service;
    onSubmit: (data: CreateServiceData | UpdateServiceData) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export function ServiceForm({
    businessId,
    service,
    onSubmit,
    onCancel,
    isLoading = false,
}: ServiceFormProps) {
    const isEditing = !!service;

    const form = useForm<ServiceFormData>({
        resolver: zodResolver(serviceFormSchema),
        defaultValues: {
            name: service?.name || '',
            description: service?.description || '',
            category: service?.category || '',
            price: service?.price || 0,
            duration: service?.duration || 60,
            isActive: service?.isActive ?? true,
            isOnline: service?.isOnline ?? true,
        },
    });

    const handleSubmit = (data: ServiceFormData) => {
        if (isEditing) {
            onSubmit(data);
        } else {
            onSubmit({
                ...data,
                businessId,
            });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Service Name */}
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Service Name *</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="e.g., Haircut, Color Treatment"
                                        {...field}
                                        className="focus:ring-2 focus:ring-orange-500"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Category */}
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="e.g., Hair, Nails, Skincare"
                                        {...field}
                                        className="focus:ring-2 focus:ring-orange-500"
                                    />
                                </FormControl>
                                <FormDescription>
                                    Optional category to group similar services
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Description */}
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Describe what this service includes..."
                                    className="min-h-[100px] resize-none focus:ring-2 focus:ring-orange-500"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                Help clients understand what's included in this service
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Price */}
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Price ($) *</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        className="focus:ring-2 focus:ring-orange-500"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Duration */}
                    <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Duration (minutes) *</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min="1"
                                        placeholder="60"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                                        className="focus:ring-2 focus:ring-orange-500"
                                    />
                                </FormControl>
                                <FormDescription>
                                    How long does this service typically take?
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Settings */}
                <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                    <h3 className="text-lg font-medium text-gray-900">Service Settings</h3>

                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Active Service</FormLabel>
                                        <FormDescription>
                                            Active services can be booked and appear in your service list
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
                            name="isOnline"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Online Booking</FormLabel>
                                        <FormDescription>
                                            Allow clients to book this service online
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
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600"
                    >
                        {isLoading ? (
                            <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                {isEditing ? 'Updating...' : 'Creating...'}
                            </>
                        ) : (
                            <>{isEditing ? 'Update Service' : 'Create Service'}</>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}