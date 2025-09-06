'use client';

import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { DollarSign, Loader2, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmploymentCalculationPreview } from './employment-calculation-preview';
import { EmploymentTypeSelector } from './employment-type-selector';

const inviteSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    displayName: z.string().min(1, 'Display name is required').max(100),
    title: z.string().optional(),
    role: z.enum(['STAFF', 'MANAGER']).default('STAFF'),
    employmentType: z.enum(['COMMISSION', 'CHAIR_RENTAL', 'HYBRID']),
    commissionRate: z.number().min(0).max(100).optional(),
    chairRentalAmount: z.number().min(0).optional(),
    chairRentalPeriod: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
    baseSalary: z.number().min(0).optional(),
    message: z.string().optional(),
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

type InviteFormData = z.infer<typeof inviteSchema>;

interface StaffInviteDialogProps {
    businessId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function StaffInviteDialog({ businessId, open, onOpenChange, onSuccess }: StaffInviteDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'details' | 'employment' | 'review'>('details');

    const form = useForm<InviteFormData>({
        resolver: zodResolver(inviteSchema),
        defaultValues: {
            email: '',
            displayName: '',
            title: '',
            role: 'STAFF',
            employmentType: 'COMMISSION',
            commissionRate: 50,
            chairRentalAmount: 100,
            chairRentalPeriod: 'WEEKLY',
            baseSalary: 0,
            message: '',
        },
    });

    const watchedValues = form.watch();

    const handleSubmit = async (data: InviteFormData) => {
        try {
            setIsSubmitting(true);

            const response = await fetch('/api/staff/invite', {
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
                const error = await response.json();
                throw new Error(error.error || 'Failed to send invitation');
            }

            form.reset();
            setStep('details');
            onOpenChange(false);
            onSuccess();
        } catch (error) {
            console.error('Error sending invitation:', error);
            form.setError('root', {
                message: error instanceof Error ? error.message : 'Failed to send invitation',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = async () => {
        if (step === 'details') {
            // Validate basic details
            const detailsValid = await form.trigger(['email', 'displayName', 'role']);
            if (detailsValid) {
                setStep('employment');
            }
        } else if (step === 'employment') {
            // Validate employment configuration
            const employmentValid = await form.trigger(['employmentType', 'commissionRate', 'chairRentalAmount', 'chairRentalPeriod']);
            if (employmentValid) {
                setStep('review');
            }
        }
    };

    const handleBack = () => {
        if (step === 'employment') {
            setStep('details');
        } else if (step === 'review') {
            setStep('employment');
        }
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [&>button]:text-gray-700 [&>button]:hover:text-gray-900 [&>button]:hover:bg-gray-100">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        Invite Staff Member
                    </DialogTitle>
                    <DialogDescription>
                        Send an invitation to join your team with their employment configuration.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        {/* Step Indicator */}
                        <div className="flex items-center justify-center space-x-4 mb-6">
                            {['details', 'employment', 'review'].map((stepName, index) => (
                                <div key={stepName} className="flex items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${step === stepName
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : index < ['details', 'employment', 'review'].indexOf(step)
                                            ? 'bg-green-500 text-white border-green-500'
                                            : 'bg-white text-gray-600 border-gray-300'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    {index < 2 && (
                                        <div className={`w-16 h-1 mx-3 rounded ${index < ['details', 'employment', 'review'].indexOf(step)
                                            ? 'bg-green-500'
                                            : 'bg-gray-300'
                                            }`} />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Step Labels */}
                        <div className="flex justify-center space-x-8 mb-6">
                            <span className={`text-sm font-medium ${step === 'details' ? 'text-blue-600' : 'text-gray-600'}`}>
                                Staff Details
                            </span>
                            <span className={`text-sm font-medium ${step === 'employment' ? 'text-blue-600' : 'text-gray-600'}`}>
                                Employment
                            </span>
                            <span className={`text-sm font-medium ${step === 'review' ? 'text-blue-600' : 'text-gray-600'}`}>
                                Review
                            </span>
                        </div>

                        {/* Step 1: Basic Details */}
                        {step === 'details' && (
                            <div className="space-y-4">
                                <Card className="border border-gray-200 shadow-sm">
                                    <CardHeader className="bg-gray-50 border-b border-gray-200">
                                        <CardTitle className="flex items-center gap-2 text-gray-900">
                                            <User className="w-5 h-5 text-blue-500" />
                                            Staff Details
                                        </CardTitle>
                                        <CardDescription className="text-gray-600">
                                            Basic information about the new team member
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-gray-900 font-medium">Email Address</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="staff@example.com" {...field} className="bg-white border-gray-300 text-gray-900" />
                                                    </FormControl>
                                                    <FormDescription className="text-gray-600">
                                                        The invitation will be sent to this email address
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="displayName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-gray-900 font-medium">Display Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="John Smith" {...field} className="bg-white border-gray-300 text-gray-900" />
                                                    </FormControl>
                                                    <FormDescription className="text-gray-600">
                                                        How this person's name will appear to clients
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
                                                    <FormLabel className="text-gray-900 font-medium">Job Title (Optional)</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Senior Stylist" {...field} className="bg-white border-gray-300 text-gray-900" />
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
                                                    <FormLabel className="text-gray-900 font-medium">Business Role</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                                                <SelectValue placeholder="Select role" className="text-gray-900" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-white border border-gray-200 shadow-lg">
                                                            <SelectItem value="STAFF" className="text-gray-900 hover:bg-gray-100">Staff Member</SelectItem>
                                                            <SelectItem value="MANAGER" className="text-gray-900 hover:bg-gray-100">Manager</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription className="text-gray-600">
                                                        Managers can invite other staff and manage business settings
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Step 2: Employment Configuration */}
                        {step === 'employment' && (
                            <div className="space-y-4">
                                <Card className="border border-gray-200 shadow-sm">
                                    <CardHeader className="bg-gray-50 border-b border-gray-200">
                                        <CardTitle className="flex items-center gap-2 text-gray-900">
                                            <DollarSign className="w-5 h-5 text-green-500" />
                                            Employment Configuration
                                        </CardTitle>
                                        <CardDescription className="text-gray-600 font-medium">
                                            Set up how this staff member will be compensated
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-8 p-6">
                                        <FormField
                                            control={form.control}
                                            name="employmentType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-gray-900 font-medium text-base">Employment Type</FormLabel>
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
                                                        <FormLabel className="text-gray-900 font-medium text-base">Commission Rate (%)</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                step="0.1"
                                                                placeholder="50"
                                                                {...field}
                                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                className="bg-white border-gray-300 text-gray-900"
                                                            />
                                                        </FormControl>
                                                        <FormDescription className="text-gray-600 font-medium">
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
                                                            <FormLabel className="text-gray-900 font-medium text-base">Rental Amount ($)</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    placeholder="100"
                                                                    {...field}
                                                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                    className="bg-white border-gray-300 text-gray-900"
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
                                                            <FormLabel className="text-gray-900 font-medium text-base">Rental Period</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
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

                                        {/* Base Salary (Optional) */}
                                        {watchedValues.employmentType === 'COMMISSION' && (
                                            <FormField
                                                control={form.control}
                                                name="baseSalary"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-gray-900 font-medium text-base">Base Salary (Optional)</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                placeholder="0"
                                                                {...field}
                                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                className="bg-white border-gray-300 text-gray-900"
                                                            />
                                                        </FormControl>
                                                        <FormDescription className="text-gray-600 font-medium">
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
                            </div>
                        )}

                        {/* Step 3: Review */}
                        {step === 'review' && (
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Review Invitation</CardTitle>
                                        <CardDescription>
                                            Please review the details before sending the invitation
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="font-medium text-sm text-gray-700">Staff Member</h4>
                                                <p className="font-semibold">{watchedValues.displayName}</p>
                                                <p className="text-sm text-gray-600">{watchedValues.email}</p>
                                                {watchedValues.title && (
                                                    <p className="text-sm text-gray-600">{watchedValues.title}</p>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-sm text-gray-700">Role & Employment</h4>
                                                <Badge variant="outline" className="mb-2">
                                                    {watchedValues.role}
                                                </Badge>
                                                <p className="text-sm">{getEmploymentSummary()}</p>
                                            </div>
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="message"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Personal Message (Optional)</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Welcome to the team! We're excited to have you join us..."
                                                            className="min-h-[100px]"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Add a personal welcome message to the invitation email
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Form Errors */}
                        {form.formState.errors.root && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                                <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between pt-6 border-t border-gray-200">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                disabled={step === 'details'}
                                className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                                Back
                            </Button>

                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </Button>

                                {step !== 'review' ? (
                                    <Button
                                        type="button"
                                        onClick={handleNext}
                                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium"
                                    >
                                        Next
                                    </Button>
                                ) : (
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-medium disabled:opacity-50"
                                    >
                                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Send Invitation
                                    </Button>
                                )}
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}