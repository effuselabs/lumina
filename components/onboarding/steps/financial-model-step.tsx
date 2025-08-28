'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  type BusinessFinancialModel,
  businessFinancialModelSchema,
  financialModelDescriptions,
} from '@/lib/validations/business';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StepContainer } from '../step-container';

interface FinancialModelStepProps {
  data: Partial<BusinessFinancialModel>;
  onNext: (data: BusinessFinancialModel) => void;
  onPrevious: () => void;
}

type FinancialModelType = keyof typeof financialModelDescriptions;

export function FinancialModelStep({
  data,
  onNext,
  onPrevious,
}: FinancialModelStepProps) {
  const [selectedModel, setSelectedModel] = useState<FinancialModelType | null>(
    (data.financialModel as FinancialModelType) || null
  );

  const {
    handleSubmit,
    setValue,
    formState: { isValid },
  } = useForm<BusinessFinancialModel>({
    resolver: zodResolver(businessFinancialModelSchema),
    defaultValues: data,
    mode: 'onChange',
  });

  const handleModelSelect = (model: FinancialModelType) => {
    setSelectedModel(model);
    setValue('financialModel', model, { shouldValidate: true });
  };

  const onSubmit = (formData: BusinessFinancialModel) => {
    onNext(formData);
  };

  return (
    <StepContainer
      title="How do you pay your staff?"
      description="Choose the financial model that works best for your business. You can change this later."
      icon={<DollarSign className="h-8 w-8 text-orange-500" />}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Object.entries(financialModelDescriptions).map(([key, model]) => {
            const modelKey = key as FinancialModelType;
            const isSelected = selectedModel === modelKey;

            return (
              <Card
                key={modelKey}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-md',
                  isSelected
                    ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500'
                    : 'border-gray-200 hover:border-gray-300'
                )}
                onClick={() => handleModelSelect(modelKey)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {model.title}
                    </CardTitle>
                    {isSelected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <CardDescription className="text-sm text-gray-600">
                    {model.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="mb-1 text-sm font-medium text-gray-700">
                      Example:
                    </p>
                    <p className="text-sm text-gray-600">{model.example}</p>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="mb-1 text-sm font-medium text-green-700">
                        Pros:
                      </p>
                      <ul className="space-y-1 text-xs text-green-600">
                        {model.pros.map((pro, index) => (
                          <li key={index} className="flex items-start gap-1">
                            <span className="mt-0.5 text-green-500">•</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="mb-1 text-sm font-medium text-amber-700">
                        Considerations:
                      </p>
                      <ul className="space-y-1 text-xs text-amber-600">
                        {model.cons.map((con, index) => (
                          <li key={index} className="flex items-start gap-1">
                            <span className="mt-0.5 text-amber-500">•</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Popular badge for commission model */}
                  {modelKey === 'COMMISSION' && (
                    <Badge
                      variant="secondary"
                      className="bg-orange-100 text-orange-800"
                    >
                      Most Popular
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedModel && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Good choice!</strong> You&apos;ve selected the{' '}
              {financialModelDescriptions[selectedModel].title} model. You can
              configure specific rates and details after completing the setup.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onPrevious}>
            Previous
          </Button>
          <Button
            type="submit"
            disabled={!isValid || !selectedModel}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
          >
            Continue
          </Button>
        </div>
      </form>
    </StepContainer>
  );
}
