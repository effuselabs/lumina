'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { StaffWithRelations } from '@/types/database';
import { zodResolver } from '@hookform/resolvers/zod';
import { DollarSign, Loader2, Settings, User } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmploymentCalculationPreview } from './employment-calculation-preview';
import { EmploymentTransitionDialog } from './employment-transition-dialog';
import { EmploymentTypeSelector } from './employment-type-selector';

const editStaffSchema = z.object({
    displayName: z.string().min(1, 'Display name is required').max(100),
    title: z.string().optional(),
    bio: z.string().optional(),
    employmentType: z.enum(['COMMISSION', 'CHAIR_RENTAL', 'HYBRID']),
    commissionRate: z.number().min(0).max(100).optional(),
    chairRentalAmount: z.number().min(0).optional(),
    chairRentalPeriod: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
    baseSalary: z.number().min(0).optional(),
    isActive: z.boolean(),
    acceptsOnlineBookings: z.boolean(),
}).refine((data) => {
    if (data.employmentType === 'COMMISSION' && !data.commissionRate) {
        return false;
    }
    if (data.employmentType === 'CHAIR_RENTAL' && (!data.chairRentalAmount || !data.chairRentalPeriod)) {
        return false;
    }
    if (data.employmentType === 'HYBRID' && (!data.commissionRate || !data.chairRentalAmount || !data.chairRentalPeriod)) {
        return false;
    }
    return true;
}, {
    message: "Please complete all required fields for the selected employment type",
    path: ["employmentType"],
});

type EditStaffFormData = z.infer<typeof editStaffSchema>;

interface StaffEditDialogProps {
    staff: StaffWithRelations;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function StaffEditDialog({ staff, open, onOpenChange, onSuccess }: StaffEditDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showTransitionDialog, setShowTransitionDialog] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');

    const form = useForm<EditStaffFormData>({
        resolver: zodResolver(editStaffSchema),
        defaultValues: {
            displayName: staff.displayName,
            title: staff.title || '',
            bio: staff.bio || '',
            employmentType: staff.employmentType,
            commissionRate: staff.commissionRate ? Number(staff.commissionRate) : undefined,
            chairRentalAmount: staff.chairRentalAmount ? Number(staff.chairRentalAmount) : undefined,
            chairRentalPeriod: staff.chairRentalPeriod || undefined,
            baseSalary: staff.baseSalary ? Number(staff.baseSalary) : undefined,
            isActive: staff.isActive,
            acceptsOnlineBookings: staff.acceptsOnlineBookings,
        },
    });

    const watchedValues = form.watch();
    const hasEmploymentChanges =
        watchedValues.employmentType !== staff.employmentType ||
        watchedValues.commissionRate !== (staff.commissionRate ? Number(staff.commissionRate) : undefined) ||
        watchedValues.chairRentalAmount !== (staff.chairRentalAmount ? Number(staff.chairRentalAmount) : undefined) ||
        watchedValues.chairRentalPeriod !== staff.chairRentalPeriod;

    const handleSubmit = async (data: EditStaffFormData) => {
        try {
            setIsSubmitting(true);

            const response = await fetch(`/api/staff/${staff.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update staff member');
            }

            onOpenChange(false);
            onSuccess();
        } catch (error) {
            console.error('Error updating staff:', error);
            form.setError('root', {
                message: error instanceof Error ? error.message : 'Failed to update staff member',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEmploymentTransition = () => {
        setShowTransitionDialog(true);
    };

    const getEmploymentSummary = () => {
        const { employmentType, commissionRate, chairRentalAmount, chairRentalPeriod } = watchedValues;

        switch (employmentType) {
            case 'COMMISSION':
                return `${commissionRate}% Commission`;
            case 'CHAIR_RENTAL':
                return `$${chairRentalAmount}/${chairRentalPeriod?.toLowerCase()}`;
            case 'HYBRID':
                return `${commissionRate}% Commission + $${chairRentalAmount}/${chairRentalPeriod?.toLowerCase()}`;
            default:
                return employmentType;
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Edit Staff Member
                        </DialogTitle>
                        <DialogDescription>
                            Update {staff.displayName}'s profile and employment settings.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="profile">Profile</TabsTrigger>
                            <TabsTrigger value="employment">Employment</TabsTrigger>
                            <TabsTrigger value="settings">Settings</TabsTrigger>
                        </TabsList>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                                <TabsContent value="profile" className="space-y-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <User className="w-4 h-4" />
                                                Profile Information
                                            </CardTitle>
                                            <CardDescription>
                                                Basic information displayed to clients and team members
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="displayName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Display Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="John Smith" {...field} />
                                                        </FormControl>
                                                        <FormDescription>
                                                            How this person's name appears to clients
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="title"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Job Title</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Senior Stylist" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="bio"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Bio</FormLabel>
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Tell clients about your experience and specialties..."
                                                                className="min-h-[100px]"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormDescription>
                                                            A brief description that clients can see when booking
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Contact Information (Read-only) */}
                                            <div className="space-y-2">
                                                <FormLabel>Contact Information</FormLabel>
                                                <div className="bg-gray-50 p-3 rounded-md">
                                                    <p className="text-sm"><strong>Email:</strong> {staff.user.email}</p>
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        Contact information is managed through the user's account settings
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="employment" className="space-y-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <DollarSign className="w-4 h-4" />
                                                Employment Configuration
                                            </CardTitle>
                                            <CardDescription>
                                                Compensation structure and employment terms
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {/* Current Employment Type */}
                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-medium text-blue-900">Current Employment</h4>
                                                        <p className="text-sm text-blue-700">
                                                            {staff.employmentType.replace('_', ' ')} - {getEmploymentSummary()}
                                                        </p>
                                                    </div>
                                                    {hasEmploymentChanges && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleEmploymentTransition}
                                                        >
                                                            Transition Employment
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="employmentType"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Employment Type</FormLabel>
                                                        <FormControl>
                                                            <EmploymentTypeSelector
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                onSelect={field.onChange}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Commission Rate */}
                                            {(watchedValues.employmentType === 'COMMISSION' || watchedValues.employmentType === 'HYBRID') && (
                                                <FormField
                                                    control={form.control}
                                                    name="commissionRate"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Commission Rate (%)</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    step="0.1"
                                                                    placeholder="50"
                                                                    {...field}
                                                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                />
                                                            </FormControl>
                                                            <FormDescription>
                                                                Percentage of service revenue the staff member earns
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}

                                            {/* Chair Rental */}
                                            {(watchedValues.employmentType === 'CHAIR_RENTAL' || watchedValues.employmentType === 'HYBRID') && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="chairRentalAmount"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Rental Amount ($)</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        placeholder="100"
                                                                        {...field}
                                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                                                                <FormLabel>Rental Period</FormLabel>
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select period" />
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
                                                </div>
                                            )}

                                            {/* Base Salary */}
                                            {watchedValues.employmentType === 'COMMISSION' && (
                                                <FormField
                                                    control={form.control}
                                                    name="baseSalary"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Base Salary (Optional)</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    placeholder="0"
                                                                    {...field}
                                                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                />
                                                            </FormControl>
                                                            <FormDescription>
                                                                Guaranteed minimum earnings per pay period
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}

                                            {/* Calculation Preview */}
                                            <EmploymentCalculationPreview
                                                employmentType={watchedValues.employmentType}
                                                commissionRate={watchedValues.commissionRate}
                                                chairRentalAmount={watchedValues.chairRentalAmount}
                                                chairRentalPeriod={watchedValues.chairRentalPeriod}
                                                baseSalary={watchedValues.baseSalary}
                                            />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="settings" className="space-y-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Settings className="w-4 h-4" />
                                                Staff Settings
                                            </CardTitle>
                                            <CardDescription>
                                                Availability and booking preferences
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <FormField
                                                control={form.control}
                                                name="isActive"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                        <div className="space-y-0.5">
                                                            <FormLabel className="text-base">Active Status</FormLabel>
                                                            <FormDescription>
                                                                Whether this staff member is currently active and can be assigned appointments
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
                                                name="acceptsOnlineBookings"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                        <div className="space-y-0.5">
                                                            <FormLabel className="text-base">Online Bookings</FormLabel>
                                                            <FormDescription>
                                                                Allow clients to book appointments with this staff member online
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

                                            {/* Performance Summary */}
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <h4 className="font-medium text-gray-900 mb-3">Performance Summary</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm text-gray-600">Total Services</p>
                                                        <p className="font-semibold">{staff.services.length}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">Payment Periods</p>
                                                        <p className="font-semibold">{staff.paymentCalculations.length}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* Form Errors */}
                                {form.formState.errors.root && (
                                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                                        <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Employment Transition Dialog */}
            {showTransitionDialog && (
                <EmploymentTransitionDialog
                    staffId={staff.id}
                    staffName={staff.displayName}
                    currentEmploymentType={staff.employmentType}
                    currentConfiguration={{
                        commissionRate: staff.commissionRate ? Number(staff.commissionRate) : undefined,
                        chairRentalAmount: staff.chairRentalAmount ? Number(staff.chairRentalAmount) : undefined,
                        chairRentalPeriod: staff.chairRentalPeriod || undefined,
                        baseSalary: staff.baseSalary ? Number(staff.baseSalary) : undefined,
                    }}
                    onTransition={async (transition, config) => {
                        // Handle transition logic here
                        console.log('Transition:', transition, config);
                        setShowTransitionDialog(false);
                    }}
                >
                    <Button variant="outline" size="sm">
                        Transition Employment
                    </Button>
                </EmploymentTransitionDialog>
            )}
        </>
    );
}