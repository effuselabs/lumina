'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type BusinessBasicInfo,
  businessBasicInfoSchema,
} from '@/lib/validations/business';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { StepContainer } from '../step-container';

interface BasicInfoStepProps {
  data: Partial<BusinessBasicInfo>;
  onNext: (data: BusinessBasicInfo) => void;
}

export function BasicInfoStep({ data, onNext }: BasicInfoStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<BusinessBasicInfo>({
    resolver: zodResolver(businessBasicInfoSchema),
    defaultValues: data,
    mode: 'onChange',
  });

  const onSubmit = (formData: BusinessBasicInfo) => {
    onNext(formData);
  };

  return (
    <StepContainer
      title="Tell us about your business"
      description="Let's start with the basics. What's your business called and how can clients reach you?"
      icon={<Building2 className="h-8 w-8 text-orange-500" />}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Business Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">
            Business Name *
          </Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="e.g., Bella's Beauty Salon"
            className="w-full"
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label
            htmlFor="description"
            className="text-sm font-medium text-gray-700"
          >
            Description (Optional)
          </Label>
          <textarea
            id="description"
            {...register('description')}
            placeholder="Brief description of your business..."
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {errors.description && (
            <p className="text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Business Email
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="contact@business.com"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="phone"
              className="text-sm font-medium text-gray-700"
            >
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              placeholder="(555) 123-4567"
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label
            htmlFor="website"
            className="text-sm font-medium text-gray-700"
          >
            Website (Optional)
          </Label>
          <Input
            id="website"
            type="url"
            {...register('website')}
            placeholder="https://www.yourbusiness.com"
          />
          {errors.website && (
            <p className="text-sm text-red-600">{errors.website.message}</p>
          )}
        </div>

        {/* Continue Button */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={!isValid}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
          >
            Continue
          </Button>
        </div>
      </form>
    </StepContainer>
  );
}
