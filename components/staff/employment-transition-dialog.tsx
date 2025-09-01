'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    type EmploymentTransition,
    type EmploymentType,
    employmentTransitionSchema,
    employmentTypeDescriptions,
} from '@/lib/validations/employment';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    AlertTriangleIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    InfoIcon,
    RefreshCwIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { EmploymentConfigurationForm } from './employment-configuration-form';

interface EmploymentTransitionDialogProps {
    staffId: string;
    staffName: string;
    currentEmploymentType: EmploymentType;
    currentConfiguration: any;
    onTransition: (transition: EmploymentTransition, newConfiguration: any) => Promise<void>;
    children: React.ReactNode;
}

interface TransitionValidation {
    canTransition: boolean;
    warnings: string[];
    dataImpact: string[];
    requiredActions: string[];
}

export function EmploymentTransitionDialog({
    staffId,
    staffName,
    currentEmploymentType,
    currentConfiguration,
    onTransition,
    children,
}: EmploymentTransitionDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'validation' | 'configuration' | 'confirmation'>('validation');
    const [newConfiguration, setNewConfiguration] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<EmploymentTransition>({
        resolver: zodResolver(employmentTransitionSchema),
        defaultValues: {
            staffId,
            fromEmploymentType: currentEmploymentType,
            toEmploymentType: currentEmploymentType,
            transitionDate: new Date(),
            reason: '',
            preserveHistoricalCalculations: true,
            migrateOngoingCalculations: true,
        },
    });

    const watchedToType = form.watch('toEmploymentType');
    const watchedFromType = form.watch('fromEmploymentType');

    // Validate transition feasibility
    const getTransitionValidation = (
        fromType: EmploymentType,
        toType: EmploymentType
    ): TransitionValidation => {
        const warnings: string[] = [];
        const dataImpact: string[] = [];
        const requiredActions: string[] = [];

        if (fromType === toType) {
            return {
                canTransition: false,
                warnings: ['Cannot transition to the same employment type'],
                dataImpact: [],
                requiredActions: ['Select a different employment type'],
            };
        }

        // Commission to Chair Rental
        if (fromType === 'COMMISSION' && toType === 'CHAIR_RENTAL') {
            warnings.push('Staff will lose commission-based earnings');
            warnings.push('Staff will be responsible for fixed rental costs');
            dataImpact.push('Historical commission calculations will be preserved');
            dataImpact.push('Future earnings will be based on rental model');
            requiredActions.push('Set chair rental amount and period');
        }

        // Chair Rental to Commission
        if (fromType === 'CHAIR_RENTAL' && toType === 'COMMISSION') {
            warnings.push('Staff will lose guaranteed rental income for business');
            warnings.push('Earnings will become performance-dependent');
            dataImpact.push('Historical rental payments will be preserved');
            dataImpact.push('Future earnings will be commission-based');
            requiredActions.push('Set commission rate');
        }

        // To/From Hybrid
        if (toType === 'HYBRID') {
            warnings.push('Hybrid model requires both commission and rental components');
            dataImpact.push('More complex calculation structure');
            requiredActions.push('Configure both commission rate and rental amount');
        }

        if (fromType === 'HYBRID') {
            warnings.push('Moving from hybrid will simplify payment structure');
            dataImpact.push('Historical hybrid calculations will be preserved');
        }

        return {
            canTransition: true,
            warnings,
            dataImpact,
            requiredActions,
        };
    };

    const validation = getTransitionValidation(watchedFromType, watchedToType);

    const handleValidationNext = () => {
        if (validation.canTransition) {
            setStep('configuration');
        }
    };

    const handleConfigurationSubmit = (config: any) => {
        setNewConfiguration(config);
        setStep('confirmation');
    };

    const handleConfirmTransition = async () => {
        if (!newConfiguration) return;

        setIsLoading(true);
        try {
            const transitionData = form.getValues();
            await onTransition(transitionData, newConfiguration);
            setOpen(false);
            setStep('validation');
            form.reset();
            setNewConfiguration(null);
        } catch (error) {
            console.error('Transition failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setStep('validation');
        setNewConfiguration(null);
    };

    const currentTypeInfo = employmentTypeDescriptions[currentEmploymentType];
    const newTypeInfo = employmentTypeDescriptions[watchedToType];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RefreshCwIcon className="h-5 w-5" />
                        Change Employment Type
                    </DialogTitle>
                    <DialogDescription>
                        Transition {staffName} to a different employment model
                    </DialogDescription>
                </DialogHeader>

                {step === 'validation' && (
                    <div className="space-y-6">
                        <Form {...form}>
                            <div className="space-y-4">
                                {/* Current vs New Type */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Employment Type Change</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-center gap-4">
                                            <div className="text-center">
                                                <Badge variant="outline" className="mb-2">
                                                    Current
                                                </Badge>
                                                <div className="font-medium">{currentTypeInfo.title}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {currentTypeInfo.description}
                                                </div>
                                            </div>
                                            <ArrowRightIcon className="h-6 w-6 text-muted-foreground" />
                                            <div className="text-center">
                                                <Badge variant="outline" className="mb-2">
                                                    New
                                                </Badge>
                                                <FormField
                                                    control={form.control}
                                                    name="toEmploymentType"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <select
                                                                    {...field}
                                                                    className="border rounded px-3 py-2 font-medium"
                                                                >
                                                                    {Object.entries(employmentTypeDescriptions)
                                                                        .filter(([key]) => key !== currentEmploymentType)
                                                                        .map(([key, info]) => (
                                                                            <option key={key} value={key}>
                                                                                {info.title}
                                                                            </option>
                                                                        ))}
                                                                </select>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <div className="text-sm text-muted-foreground mt-2">
                                                    {newTypeInfo.description}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Transition Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="transitionDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Transition Date</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="date"
                                                        {...field}
                                                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                                        onChange={(e) => field.onChange(new Date(e.target.value))}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    When this change should take effect
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="reason"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Reason (Optional)</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Why is this change being made?"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Document the reason for this transition
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Data Migration Options */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Data Migration</CardTitle>
                                        <CardDescription>
                                            Choose how to handle existing payment data
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="preserveHistoricalCalculations"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-base">
                                                            Preserve Historical Calculations
                                                        </FormLabel>
                                                        <FormDescription>
                                                            Keep existing payment calculations for reporting
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
                                            name="migrateOngoingCalculations"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-base">
                                                            Migrate Ongoing Calculations
                                                        </FormLabel>
                                                        <FormDescription>
                                                            Update current period calculations to new model
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
                                    </CardContent>
                                </Card>

                                {/* Validation Results */}
                                {validation.warnings.length > 0 && (
                                    <Alert>
                                        <AlertTriangleIcon className="h-4 w-4" />
                                        <AlertDescription>
                                            <div className="space-y-2">
                                                <p className="font-medium">Important Considerations:</p>
                                                <ul className="text-sm space-y-1">
                                                    {validation.warnings.map((warning, index) => (
                                                        <li key={index}>• {warning}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {validation.dataImpact.length > 0 && (
                                    <Alert>
                                        <InfoIcon className="h-4 w-4" />
                                        <AlertDescription>
                                            <div className="space-y-2">
                                                <p className="font-medium">Data Impact:</p>
                                                <ul className="text-sm space-y-1">
                                                    {validation.dataImpact.map((impact, index) => (
                                                        <li key={index}>• {impact}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </Form>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleValidationNext}
                                disabled={!validation.canTransition}
                                className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600"
                            >
                                Continue to Configuration
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'configuration' && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <h3 className="text-lg font-medium">Configure New Employment Type</h3>
                            <p className="text-sm text-muted-foreground">
                                Set up the parameters for {newTypeInfo.title}
                            </p>
                        </div>

                        <EmploymentConfigurationForm
                            initialData={{ employmentType: watchedToType }}
                            onSubmit={handleConfigurationSubmit}
                            onCancel={handleCancel}
                            showPreview={true}
                        />
                    </div>
                )}

                {step === 'confirmation' && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium">Confirm Transition</h3>
                            <p className="text-sm text-muted-foreground">
                                Review the changes before applying them
                            </p>
                        </div>

                        {/* Transition Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Transition Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Staff Member:</span>
                                        <span className="float-right font-medium">{staffName}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Transition Date:</span>
                                        <span className="float-right font-medium">
                                            {form.getValues('transitionDate').toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">From:</span>
                                        <span className="float-right font-medium">
                                            {currentTypeInfo.title}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">To:</span>
                                        <span className="float-right font-medium">
                                            {newTypeInfo.title}
                                        </span>
                                    </div>
                                </div>

                                {form.getValues('reason') && (
                                    <div>
                                        <span className="text-muted-foreground text-sm">Reason:</span>
                                        <p className="text-sm mt-1">{form.getValues('reason')}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setStep('configuration')}>
                                Back to Configuration
                            </Button>
                            <Button
                                onClick={handleConfirmTransition}
                                disabled={isLoading}
                                className="bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600"
                            >
                                {isLoading ? 'Processing...' : 'Confirm Transition'}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}