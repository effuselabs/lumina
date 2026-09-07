'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  formatCurrency,
  formatPercentage,
} from '@/lib/employment/calculations';
import {
  type EmploymentConfiguration,
  type EmploymentType,
  employmentTypeDescriptions,
} from '@/lib/validations/employment';
import {
  AlertTriangleIcon,
  CalculatorIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  SettingsIcon,
} from 'lucide-react';
import { useState } from 'react';
import { EmploymentCalculationPreview } from './employment-calculation-preview';
import { EmploymentConfigurationForm } from './employment-configuration-form';
import { EmploymentTransitionDialog } from './employment-transition-dialog';

interface StaffEmploymentData {
  id: string;
  displayName: string;
  employmentType: EmploymentType;
  commissionRate?: number;
  chairRentalAmount?: number;
  chairRentalPeriod?: string;
  baseSalary?: number;
  startDate: Date;
  isActive: boolean;
}

interface EmploymentManagementProps {
  staff: StaffEmploymentData;
  onUpdateEmployment: (
    staffId: string,
    config: EmploymentConfiguration
  ) => Promise<void>;
  onTransitionEmployment: (
    staffId: string,
    transition: any,
    config: any
  ) => Promise<void>;
  isLoading?: boolean;
  canEdit?: boolean;
}

export function EmploymentManagement({
  staff,
  onUpdateEmployment,
  onTransitionEmployment,
  isLoading = false,
  canEdit = true,
}: EmploymentManagementProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'configure' | 'preview'
  >('overview');
  const [isEditing, setIsEditing] = useState(false);

  const currentConfig: EmploymentConfiguration = {
    employmentType: staff.employmentType,
    commissionRate: staff.commissionRate,
    chairRentalAmount: staff.chairRentalAmount,
    chairRentalPeriod: staff.chairRentalPeriod as any,
    baseSalary: staff.baseSalary,
  };

  const typeInfo = employmentTypeDescriptions[staff.employmentType];

  const handleConfigurationSave = async (config: EmploymentConfiguration) => {
    try {
      await onUpdateEmployment(staff.id, config);
      setIsEditing(false);
      setActiveTab('overview');
    } catch (error) {
      console.error('Failed to update employment configuration:', error);
    }
  };

  const handleTransition = async (transition: any, newConfig: any) => {
    try {
      await onTransitionEmployment(staff.id, transition, newConfig);
    } catch (error) {
      console.error('Failed to transition employment type:', error);
    }
  };

  const getEmploymentSummary = () => {
    const summary: string[] = [];

    if (staff.commissionRate) {
      summary.push(`${formatPercentage(staff.commissionRate)} Commission`);
    }

    if (staff.chairRentalAmount && staff.chairRentalPeriod) {
      summary.push(
        `${formatCurrency(staff.chairRentalAmount)} ${staff.chairRentalPeriod.toLowerCase()}`
      );
    }

    if (staff.baseSalary) {
      summary.push(`${formatCurrency(staff.baseSalary)} Base`);
    }

    return summary;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Employment Configuration</h2>
          <p className="text-muted-foreground">
            Manage {staff.displayName}'s employment type and compensation
            structure
          </p>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <EmploymentTransitionDialog
              staffId={staff.id}
              staffName={staff.displayName}
              currentEmploymentType={staff.employmentType}
              currentConfiguration={currentConfig}
              onTransition={handleTransition}
            >
              <Button variant="outline" className="flex items-center gap-2">
                <RefreshCwIcon className="h-4 w-4" />
                Change Type
              </Button>
            </EmploymentTransitionDialog>

            <Button
              onClick={() => {
                setIsEditing(true);
                setActiveTab('configure');
              }}
              className="flex items-center gap-2"
            >
              <SettingsIcon className="h-4 w-4" />
              Configure
            </Button>
          </div>
        )}
      </div>

      {/* Status Alert */}
      {!staff.isActive && (
        <Alert>
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            This staff member is currently inactive. Employment configuration
            changes will take effect when they are reactivated.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={(value: string) => setActiveTab(value as any)}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="configure" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Configure
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <CalculatorIcon className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Current Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50">
                    {typeInfo.title}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Current employment configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {typeInfo.description}
                  </p>

                  {getEmploymentSummary().length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {getEmploymentSummary().map((item, index) => (
                        <Badge key={index} variant="secondary">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="float-right font-medium">
                      {staff.startDate.toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="float-right">
                      <Badge variant={staff.isActive ? 'default' : 'secondary'}>
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employment Type Benefits */}
            <Card>
              <CardHeader>
                <CardTitle>Model Benefits</CardTitle>
                <CardDescription>
                  Advantages of the current employment type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-green-700">
                      Advantages
                    </h4>
                    <ul className="space-y-1 text-sm text-green-600">
                      {typeInfo.pros.map((pro, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircleIcon className="mt-0.5 h-3 w-3 flex-shrink-0" />
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-medium text-orange-700">
                      Considerations
                    </h4>
                    <ul className="space-y-1 text-sm text-orange-600">
                      {typeInfo.cons.slice(0, 2).map((con, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertTriangleIcon className="mt-0.5 h-3 w-3 flex-shrink-0" />
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common employment management tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(true);
                      setActiveTab('configure');
                    }}
                  >
                    Update Configuration
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('preview')}
                  >
                    View Calculations
                  </Button>

                  <EmploymentTransitionDialog
                    staffId={staff.id}
                    staffName={staff.displayName}
                    currentEmploymentType={staff.employmentType}
                    currentConfiguration={currentConfig}
                    onTransition={handleTransition}
                  >
                    <Button variant="outline" size="sm">
                      Change Employment Type
                    </Button>
                  </EmploymentTransitionDialog>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Configure Tab */}
        <TabsContent value="configure" className="space-y-4">
          {isEditing ? (
            <EmploymentConfigurationForm
              initialData={currentConfig}
              onSubmit={handleConfigurationSave}
              onCancel={() => {
                setIsEditing(false);
                setActiveTab('overview');
              }}
              isLoading={isLoading}
              showPreview={false}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Employment Configuration</CardTitle>
                <CardDescription>
                  Click "Configure" to modify the employment settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setIsEditing(true)} className="w-full">
                  Start Configuration
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <EmploymentCalculationPreview
            configuration={currentConfig}
            revenueScenarios={[500, 1000, 1500, 2000, 3000]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
