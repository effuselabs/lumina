'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
    type EmploymentType,
    employmentTypeDescriptions,
} from '@/lib/validations/employment';
import {
    CalendarIcon,
    CheckCircleIcon,
    DollarSignIcon,
    InfoIcon,
    PercentIcon,
} from 'lucide-react';
import { useState } from 'react';

interface EmploymentTypeSelectorProps {
    selectedType?: EmploymentType;
    onSelect: (type: EmploymentType) => void;
    value?: EmploymentType;
    onChange?: (type: EmploymentType) => void;
    className?: string;
    showDetails?: boolean;
}

export function EmploymentTypeSelector({
    selectedType,
    onSelect,
    value,
    onChange,
    className,
    showDetails = true,
}: EmploymentTypeSelectorProps) {
    // Support both prop patterns for backward compatibility
    const currentValue = value || selectedType;
    const handleChange = onChange || onSelect;
    const [hoveredType, setHoveredType] = useState<EmploymentType | null>(null);

    const getTypeIcon = (type: EmploymentType) => {
        switch (type) {
            case 'COMMISSION':
                return <PercentIcon className="h-5 w-5" />;
            case 'CHAIR_RENTAL':
                return <CalendarIcon className="h-5 w-5" />;
            case 'HYBRID':
                return <DollarSignIcon className="h-5 w-5" />;
            default:
                return <DollarSignIcon className="h-5 w-5" />;
        }
    };

    const getTypeColor = (type: EmploymentType) => {
        switch (type) {
            case 'COMMISSION':
                return 'border-blue-200 hover:border-blue-300 bg-blue-50/50';
            case 'CHAIR_RENTAL':
                return 'border-green-200 hover:border-green-300 bg-green-50/50';
            case 'HYBRID':
                return 'border-purple-200 hover:border-purple-300 bg-purple-50/50';
            default:
                return 'border-gray-200 hover:border-gray-300 bg-gray-50/50';
        }
    };

    const displayedType = hoveredType || currentValue;
    const displayedInfo = displayedType ? employmentTypeDescriptions[displayedType] : null;

    return (
        <div className={cn('space-y-4', className)}>
            {/* Type Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(employmentTypeDescriptions).map(([type, info]) => {
                    const isSelected = currentValue === type;
                    const isHovered = hoveredType === type;

                    return (
                        <Card
                            key={type}
                            className={cn(
                                'cursor-pointer transition-all duration-200 relative',
                                getTypeColor(type as EmploymentType),
                                isSelected && 'ring-2 ring-orange-500 ring-offset-2',
                                'hover:shadow-md'
                            )}
                            onClick={() => handleChange(type as EmploymentType)}
                            onMouseEnter={() => setHoveredType(type as EmploymentType)}
                            onMouseLeave={() => setHoveredType(null)}
                        >
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center justify-between text-lg">
                                    <div className="flex items-center gap-2">
                                        {getTypeIcon(type as EmploymentType)}
                                        {info.title}
                                    </div>
                                    {isSelected && (
                                        <CheckCircleIcon className="h-5 w-5 text-orange-500" />
                                    )}
                                </CardTitle>
                                <CardDescription className="text-sm text-gray-700 font-medium">
                                    {info.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-800 font-semibold bg-gray-50 p-2 rounded">
                                        {info.example}
                                    </p>

                                    {/* Required Fields Indicators */}
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {info.requiredFields.map((field) => (
                                            <Badge key={field} className="text-xs bg-blue-500 text-white font-medium border-0">
                                                {field === 'commissionRate' && 'Commission %'}
                                                {field === 'chairRentalAmount' && 'Rental $'}
                                                {field === 'chairRentalPeriod' && 'Period'}
                                            </Badge>
                                        ))}
                                        {info.optionalFields.map((field) => (
                                            <Badge key={field} className="text-xs bg-gray-500 text-white font-medium border-0">
                                                {field === 'baseSalary' && 'Base Salary'}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Detailed Information Panel */}
            {showDetails && displayedInfo && (
                <Card className="border-orange-200 bg-orange-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <InfoIcon className="h-5 w-5 text-orange-600" />
                            {displayedInfo.title} Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-800 font-medium">{displayedInfo.description}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold text-green-700 mb-2 text-sm">Advantages</h4>
                                <ul className="text-sm space-y-1 text-green-700 font-medium">
                                    {displayedInfo.pros.map((pro, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <CheckCircleIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                            {pro}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-semibold text-orange-700 mb-2 text-sm">Considerations</h4>
                                <ul className="text-sm space-y-1 text-orange-700 font-medium">
                                    {displayedInfo.cons.map((con, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <InfoIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                            {con}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <Alert className="bg-blue-50 border-blue-200">
                            <InfoIcon className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-gray-800">
                                <strong className="text-gray-900">Example:</strong> {displayedInfo.example}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}

            {/* Selection Confirmation */}
            {currentValue && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-700 font-medium">
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    Selected: {employmentTypeDescriptions[currentValue].title}
                </div>
            )}
        </div>
    );
}