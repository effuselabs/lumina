'use client';

import {
    EmploymentCalculationPreview,
    type EmploymentConfiguration,
    EmploymentConfigurationForm,
    EmploymentManagement,
    EmploymentTransitionDialog,
    type EmploymentType,
    EmploymentTypeSelector,
} from '@/components/staff';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

// Mock staff data for demonstration
const mockStaff = {
    id: 'staff-1',
    displayName: 'Sarah Johnson',
    employmentType: 'COMMISSION' as EmploymentType,
    commissionRate: 60,
    chairRentalAmount: undefined,
    chairRentalPeriod: undefined,
    baseSalary: 500,
    startDate: new Date('2024-01-15'),
    isActive: true,
};

export default function EmploymentDemoPage() {
    const [selectedType, setSelectedType] = useState<EmploymentType>('COMMISSION');
    const [previewConfig, setPreviewConfig] = useState<Partial<EmploymentConfiguration>>({
        employmentType: 'COMMISSION',
        commissionRate: 50,
    });
    const [isLoading, setIsLoading] = useState(false);

    // Mock handlers
    const handleConfigurationSubmit = async (config: EmploymentConfiguration) => {
        setIsLoading(true);
        console.log('Configuration submitted:', config);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsLoading(false);
        alert('Configuration saved successfully!');
    };

    const handleUpdateEmployment = async (staffId: string, config: EmploymentConfiguration) => {
        console.log('Updating employment for staff:', staffId, config);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert('Employment updated successfully!');
    };

    const handleTransitionEmployment = async (transition: any, config: any) => {
        console.log('Transitioning employment:', transition, config);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        alert('Employment transition completed successfully!');
    };

    return (
        <div className="container mx-auto py-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">Employment UI Components Demo</h1>
                <p className="text-muted-foreground">
                    Comprehensive demonstration of hybrid employment management components
                </p>
                <Badge variant="outline" className="bg-orange-50">
                    Task 4.2: Hybrid Employment UI Components
                </Badge>
            </div>

            <Tabs defaultValue="selector" className="space-y-6">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="selector">Type Selector</TabsTrigger>
                    <TabsTrigger value="configuration">Configuration</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="transition">Transition</TabsTrigger>
                    <TabsTrigger value="management">Management</TabsTrigger>
                    <TabsTrigger value="validation">Validation</TabsTrigger>
                </TabsList>

                {/* Employment Type Selector Demo */}
                <TabsContent value="selector" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Employment Type Selector</CardTitle>
                            <CardDescription>
                                Interactive component for selecting employment types with detailed information
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EmploymentTypeSelector
                                selectedType={selectedType}
                                onSelect={setSelectedType}
                                showDetails={true}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Configuration Form Demo */}
                <TabsContent value="configuration" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Employment Configuration Form</CardTitle>
                            <CardDescription>
                                Dynamic form with validation and real-time preview
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EmploymentConfigurationForm
                                initialData={{
                                    employmentType: 'HYBRID',
                                    commissionRate: 40,
                                    chairRentalAmount: 150,
                                    chairRentalPeriod: 'WEEKLY',
                                    baseSalary: 300,
                                }}
                                onSubmit={handleConfigurationSubmit}
                                isLoading={isLoading}
                                showPreview={true}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Calculation Preview Demo */}
                <TabsContent value="preview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Calculation Preview</CardTitle>
                            <CardDescription>
                                Real-time earnings calculations for different revenue scenarios
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Configuration Controls */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <label className="text-sm font-medium">Employment Type</label>
                                    <select
                                        value={previewConfig.employmentType}
                                        onChange={(e) => setPreviewConfig({
                                            ...previewConfig,
                                            employmentType: e.target.value as EmploymentType,
                                        })}
                                        className="w-full mt-1 p-2 border rounded"
                                    >
                                        <option value="COMMISSION">Commission</option>
                                        <option value="CHAIR_RENTAL">Chair Rental</option>
                                        <option value="HYBRID">Hybrid</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium">Commission Rate (%)</label>
                                    <input
                                        type="number"
                                        value={previewConfig.commissionRate || ''}
                                        onChange={(e) => setPreviewConfig({
                                            ...previewConfig,
                                            commissionRate: parseFloat(e.target.value) || undefined,
                                        })}
                                        className="w-full mt-1 p-2 border rounded"
                                        min="0"
                                        max="100"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium">Rental Amount ($)</label>
                                    <input
                                        type="number"
                                        value={previewConfig.chairRentalAmount || ''}
                                        onChange={(e) => setPreviewConfig({
                                            ...previewConfig,
                                            chairRentalAmount: parseFloat(e.target.value) || undefined,
                                        })}
                                        className="w-full mt-1 p-2 border rounded"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium">Base Salary ($)</label>
                                    <input
                                        type="number"
                                        value={previewConfig.baseSalary || ''}
                                        onChange={(e) => setPreviewConfig({
                                            ...previewConfig,
                                            baseSalary: parseFloat(e.target.value) || undefined,
                                        })}
                                        className="w-full mt-1 p-2 border rounded"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <EmploymentCalculationPreview
                                configuration={{
                                    ...previewConfig,
                                    chairRentalPeriod: 'WEEKLY',
                                }}
                                revenueScenarios={[500, 1000, 1500, 2000, 2500, 3000]}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Transition Dialog Demo */}
                <TabsContent value="transition" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Employment Transition</CardTitle>
                            <CardDescription>
                                Guided workflow for changing employment types with data migration
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Click the button below to open the employment transition dialog
                                </p>

                                <EmploymentTransitionDialog
                                    staffId="demo-staff"
                                    staffName="Demo Staff Member"
                                    currentEmploymentType="COMMISSION"
                                    currentConfiguration={{
                                        employmentType: 'COMMISSION',
                                        commissionRate: 60,
                                        baseSalary: 500,
                                    }}
                                    onTransition={handleTransitionEmployment}
                                >
                                    <Button className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600">
                                        Open Transition Dialog
                                    </Button>
                                </EmploymentTransitionDialog>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                <Card className="border-blue-200 bg-blue-50/50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm">Step 1: Validation</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs space-y-1">
                                        <p>• Select new employment type</p>
                                        <p>• Review transition warnings</p>
                                        <p>• Configure data migration</p>
                                    </CardContent>
                                </Card>

                                <Card className="border-green-200 bg-green-50/50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm">Step 2: Configuration</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs space-y-1">
                                        <p>• Set new employment parameters</p>
                                        <p>• Preview calculations</p>
                                        <p>• Validate configuration</p>
                                    </CardContent>
                                </Card>

                                <Card className="border-purple-200 bg-purple-50/50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm">Step 3: Confirmation</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs space-y-1">
                                        <p>• Review all changes</p>
                                        <p>• Confirm transition</p>
                                        <p>• Apply new configuration</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Full Management Interface Demo */}
                <TabsContent value="management" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Complete Employment Management</CardTitle>
                            <CardDescription>
                                Full-featured employment management interface with all components integrated
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EmploymentManagement
                                staff={mockStaff}
                                onUpdateEmployment={handleUpdateEmployment}
                                onTransitionEmployment={handleTransitionEmployment}
                                isLoading={isLoading}
                                canEdit={true}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Validation Examples */}
                <TabsContent value="validation" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Validation & Help Text</CardTitle>
                            <CardDescription>
                                Examples of validation messages and help text for complex employment arrangements
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Validation Examples */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="font-medium">Commission Validation</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="p-3 border border-red-200 bg-red-50 rounded">
                                            <p className="text-red-700">❌ Commission rate must be between 10% and 90%</p>
                                        </div>
                                        <div className="p-3 border border-green-200 bg-green-50 rounded">
                                            <p className="text-green-700">✅ Commission rate of 60% is valid</p>
                                        </div>
                                        <div className="p-3 border border-blue-200 bg-blue-50 rounded">
                                            <p className="text-blue-700">💡 Base salary is optional but recommended for income stability</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-medium">Hybrid Model Validation</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="p-3 border border-red-200 bg-red-50 rounded">
                                            <p className="text-red-700">❌ Hybrid model requires both commission and rental components</p>
                                        </div>
                                        <div className="p-3 border border-orange-200 bg-orange-50 rounded">
                                            <p className="text-orange-700">⚠️ Commission rate should be lower in hybrid model (typically 20-50%)</p>
                                        </div>
                                        <div className="p-3 border border-green-200 bg-green-50 rounded">
                                            <p className="text-green-700">✅ Hybrid configuration is balanced and fair</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Help Text Examples */}
                            <div className="space-y-4">
                                <h3 className="font-medium">Contextual Help Text</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card className="border-blue-200">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm text-blue-700">Commission Rate</CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-xs text-blue-600">
                                            <p>Percentage of service revenue the staff member earns. Higher rates motivate performance but reduce business margins.</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-green-200">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm text-green-700">Chair Rental</CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-xs text-green-600">
                                            <p>Fixed fee charged per period. Provides predictable income for business but creates fixed costs for staff.</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-purple-200">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm text-purple-700">Base Salary</CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-xs text-purple-600">
                                            <p>Guaranteed minimum income regardless of performance. Provides security but increases fixed costs.</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}