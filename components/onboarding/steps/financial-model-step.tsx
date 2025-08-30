'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BusinessFinancialModel, businessFinancialModelSchema, financialModelDescriptions } from '@/lib/validations/business';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

interface FinancialModelStepProps {
  data: Partial<BusinessFinancialModel>;
  onNext: (data: BusinessFinancialModel) => void;
  onPrevious: () => void;
}

export function FinancialModelStep({ data, onNext, onPrevious }: FinancialModelStepProps) {
  const form = useForm<BusinessFinancialModel>({
    resolver: zodResolver(businessFinancialModelSchema),
    defaultValues: {
      financialModel: data.financialModel || 'COMMISSION',
      currency: data.currency || 'USD',
    },
  });

  const handleSubmit = (formData: BusinessFinancialModel) => {
    onNext(formData);
  };

  const selectedModel = form.watch('financialModel');
  const modelInfo = selectedModel ? financialModelDescriptions[selectedModel] : null;

  return (
    <div className="mx-auto max-w-2xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="financialModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>How do you pay your staff? *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="focus:ring-2 focus:ring-orange-500">
                      <SelectValue placeholder="Select a financial model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(financialModelDescriptions).map(([key, model]) => (
                      <SelectItem key={key} value={key}>
                        {model.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {modelInfo && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <h3 className="font-semibold text-orange-900 mb-2">{modelInfo.title}</h3>
              <p className="text-orange-800 mb-3">{modelInfo.description}</p>
              <p className="text-sm text-orange-700 mb-3 italic">{modelInfo.example}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-orange-900 mb-1">Pros:</h4>
                  <ul className="text-sm text-orange-700 space-y-1">
                    {modelInfo.pros.map((pro, index) => (
                      <li key={index}>• {pro}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-orange-900 mb-1">Cons:</h4>
                  <ul className="text-sm text-orange-700 space-y-1">
                    {modelInfo.cons.map((con, index) => (
                      <li key={index}>• {con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
            >
              Previous
            </Button>

            <Button
              type="submit"
              className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600"
            >
              Continue
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}