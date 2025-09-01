'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    formatCurrency,
    formatPercentage,
    generateCalculationPreview,
    validateCalculationInput,
} from '@/lib/employment/calculations';
import { cn } from '@/lib/utils';
import {
    type EmploymentConfiguration,
    employmentTypeDescriptions,
} from '@/lib/validations/employment';
import { CalculatorIcon, DollarSignIcon, InfoIcon, TrendingUpIcon } from 'lucide-react';
import { useMemo } from 'react';

interface EmploymentCalculationPreviewProps {
    configuration?: Partial<EmploymentConfiguration>;
    employmentType?: string;
    commissionRate?: number;
    chairRentalAmount?: number;
    chairRentalPeriod?: string;
    baseSalary?: number;
    className?: string;
    revenueScenarios?: number[];
}

export function EmploymentCalculationPreview({
    configuration,
    employmentType,
    commissionRate,
    chairRentalAmount,
    chairRentalPeriod,
    baseSalary,
    className,
    revenueScenarios = [500, 1000, 2000, 3000],
}: EmploymentCalculationPreviewProps) {
    // Support both prop patterns for backward compatibility
    const config = configuration || {
        employmentType: employmentType as any,
        commissionRate,
        chairRentalAmount,
        chairRentalPeriod: chairRentalPeriod as any,
        baseSalary,
    };
    const calculations = useMemo(() => {
        if (!config.employmentType) return null;

        const validation = validateCalculationInput({
            grossRevenue: 1000, // dummy value for validation
            employmentType: config.employmentType,
            commissionRate: config.commissionRate,
            chairRentalAmount: config.chairRentalAmount,
            chairRentalPeriod: config.chairRentalPeriod,
            baseSalary: config.baseSalary,
        });

        if (!validation.isValid) {
            return { isValid: false, errors: validation.errors };
        }

        try {
            const preview = generateCalculationPreview(
                config as EmploymentConfiguration,
                revenueScenarios
            );
            return { isValid: true, preview };
        } catch (error) {
            return { isValid: false, errors: ['Unable to calculate preview'] };
        }
    }, [config, revenueScenarios]);

    if (!config.employmentType) {
        return (
            <Card className={cn('border-dashed', className)}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-muted-foreground">
                        <CalculatorIcon className="h-5 w-5" />
                        Calculation Preview
                    </CardTitle>
                    <CardDescription>
                        Select an employment type to see earnings calculations
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!calculations?.isValid) {
        return (
            <Card className={cn('border-orange-200', className)}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalculatorIcon className="h-5 w-5" />
                        Calculation Preview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <InfoIcon className="h-4 w-4" />
                        <AlertDescription>
                            <div className="space-y-1">
                                <p className="font-medium">Complete the configuration to see preview</p>
                                {calculations?.errors && (
                                    <ul className="text-sm space-y-1">
                                        {calculations.errors.map((error, index) => (
                                            <li key={index}>• {error}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const typeInfo = config.employmentType ? employmentTypeDescriptions[config.employmentType as keyof typeof employmentTypeDescriptions] : null;

    return (
        <Card className={cn('border-green-200 bg-green-50/50', className)}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUpIcon className="h-5 w-5 text-green-600" />
                    Earnings Preview
                </CardTitle>
                <CardDescription>
                    Projected earnings for different revenue scenarios
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Configuration Summary */}
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-white">
                        {typeInfo?.title}
                    </Badge>
                    {config.commissionRate && (
                        <Badge variant="outline" className="bg-white">
                            {formatPercentage(config.commissionRate)} Commission
                        </Badge>
                    )}
                    {config.chairRentalAmount && config.chairRentalPeriod && (
                        <Badge variant="outline" className="bg-white">
                            {formatCurrency(config.chairRentalAmount)} {config.chairRentalPeriod.toLowerCase()}
                        </Badge>
                    )}
                    {config.baseSalary && (
                        <Badge variant="outline" className="bg-white">
                            {formatCurrency(config.baseSalary)} Base
                        </Badge>
                    )}
                </div>

                {/* Calculation Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-green-200">
                                <th className="text-left py-2 font-medium">Revenue</th>
                                <th className="text-right py-2 font-medium">Staff Earnings</th>
                                <th className="text-right py-2 font-medium">Business Retention</th>
                                <th className="text-right py-2 font-medium">Staff %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {calculations.preview?.map(({ revenue, result }, index) => (
                                <tr key={index} className="border-b border-green-100">
                                    <td className="py-2 font-medium">
                                        {formatCurrency(revenue)}
                                    </td>
                                    <td className="text-right py-2 text-green-700 font-medium">
                                        {formatCurrency(result.netEarnings)}
                                    </td>
                                    <td className="text-right py-2">
                                        {formatCurrency(result.businessRetention)}
                                    </td>
                                    <td className="text-right py-2 text-sm text-muted-foreground">
                                        {formatPercentage((result.netEarnings / revenue) * 100)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Detailed Breakdown for First Scenario */}
                {calculations.preview && calculations.preview.length > 0 && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <DollarSignIcon className="h-4 w-4" />
                            Breakdown for {formatCurrency(calculations.preview[1]?.revenue || 1000)}
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {(() => {
                                const result = calculations.preview[1]?.result || calculations.preview[0]?.result;
                                if (!result) return null;

                                return (
                                    <>
                                        <div>
                                            <span className="text-muted-foreground">Gross Revenue:</span>
                                            <span className="float-right font-medium">
                                                {formatCurrency(result.grossRevenue)}
                                            </span>
                                        </div>
                                        {result.commissionEarnings > 0 && (
                                            <div>
                                                <span className="text-muted-foreground">Commission:</span>
                                                <span className="float-right font-medium text-green-600">
                                                    {formatCurrency(result.commissionEarnings)}
                                                </span>
                                            </div>
                                        )}
                                        {result.chairRentalDue > 0 && (
                                            <div>
                                                <span className="text-muted-foreground">Rental Due:</span>
                                                <span className="float-right font-medium text-orange-600">
                                                    -{formatCurrency(result.chairRentalDue)}
                                                </span>
                                            </div>
                                        )}
                                        {result.baseSalaryAmount > 0 && (
                                            <div>
                                                <span className="text-muted-foreground">Base Salary:</span>
                                                <span className="float-right font-medium text-blue-600">
                                                    {formatCurrency(result.baseSalaryAmount)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="col-span-2 border-t pt-2 mt-2">
                                            <div className="flex justify-between font-medium">
                                                <span>Net Staff Earnings:</span>
                                                <span className="text-green-700">
                                                    {formatCurrency(result.netEarnings)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm text-muted-foreground">
                                                <span>Business Retention:</span>
                                                <span>{formatCurrency(result.businessRetention)}</span>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* Employment Type Pros/Cons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <h4 className="font-medium text-sm mb-2 text-green-700">Advantages</h4>
                        <ul className="text-xs space-y-1 text-green-600">
                            {typeInfo?.pros.map((pro: string, index: number) => (
                                <li key={index}>• {pro}</li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-medium text-sm mb-2 text-orange-700">Considerations</h4>
                        <ul className="text-xs space-y-1 text-orange-600">
                            {typeInfo?.cons.map((con: string, index: number) => (
                                <li key={index}>• {con}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}