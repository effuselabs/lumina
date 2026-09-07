'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import React, { useState } from 'react';

export default function FormsPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    description: '',
    country: '',
    newsletter: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<Record<string, boolean>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation
    const newErrors: Record<string, string> = {};
    const newSuccess: Record<string, boolean> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    } else {
      newSuccess.email = true;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else {
      newSuccess.password = true;
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    } else if (formData.description) {
      newSuccess.description = true;
    }

    setErrors(newErrors);
    setSuccess(newSuccess);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          Form Components
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Comprehensive form components with consistent styling, validation
          states, and accessibility features.
        </p>
      </div>

      <div className="grid gap-8">
        {/* Input Variants */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Input Components
          </h2>

          <div className="grid gap-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Small
                </h3>
                <Input size="sm" placeholder="Small input" />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Default
                </h3>
                <Input placeholder="Default input" />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Large
                </h3>
                <Input size="lg" placeholder="Large input" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Default State
                </h3>
                <Input placeholder="Normal input" />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Error State
                </h3>
                <Input error placeholder="Error input" />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Success State
                </h3>
                <Input success placeholder="Success input" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Email
                </h3>
                <Input type="email" placeholder="email@example.com" />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Password
                </h3>
                <Input type="password" placeholder="Password" />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Number
                </h3>
                <Input type="number" placeholder="123" />
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Disabled
              </h3>
              <Input disabled placeholder="Disabled input" />
            </div>
          </div>
        </Card>

        {/* Textarea Variants */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Textarea Components
          </h2>

          <div className="grid gap-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Small
                </h3>
                <Textarea size="sm" placeholder="Small textarea" />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Default
                </h3>
                <Textarea placeholder="Default textarea" />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Large
                </h3>
                <Textarea size="lg" placeholder="Large textarea" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Default State
                </h3>
                <Textarea placeholder="Normal textarea" />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Error State
                </h3>
                <Textarea error placeholder="Error textarea" />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Success State
                </h3>
                <Textarea success placeholder="Success textarea" />
              </div>
            </div>
          </div>
        </Card>

        {/* Select Components */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Select Components
          </h2>

          <div className="grid gap-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Default Select
                </h3>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                    <SelectItem value="option3">Option 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Error Select
                </h3>
                <Select>
                  <SelectTrigger error>
                    <SelectValue placeholder="Select with error" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Success Select
                </h3>
                <Select>
                  <SelectTrigger success>
                    <SelectValue placeholder="Select with success" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* FormField Examples */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            FormField Wrapper
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              label="Email Address"
              required
              error={errors.email}
              hint={
                !errors.email
                  ? "We'll never share your email with anyone else."
                  : undefined
              }
            >
              <Input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                success={success.email}
              />
            </FormField>

            <FormField
              label="Password"
              required
              error={errors.password}
              hint={
                !errors.password
                  ? 'Must be at least 8 characters long.'
                  : undefined
              }
            >
              <Input
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={e => handleInputChange('password', e.target.value)}
                success={success.password}
              />
            </FormField>

            <FormField label="Country" hint="Select your country of residence">
              <Select
                value={formData.country}
                onValueChange={value => handleInputChange('country', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="ca">Canada</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                  <SelectItem value="au">Australia</SelectItem>
                  <SelectItem value="de">Germany</SelectItem>
                  <SelectItem value="fr">France</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="Description"
              error={errors.description}
              hint={
                !errors.description
                  ? `Optional description (${formData.description.length}/500 characters)`
                  : undefined
              }
            >
              <Textarea
                placeholder="Tell us about yourself..."
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                success={success.description}
              />
            </FormField>

            <div className="flex gap-4">
              <Button type="submit">Submit Form</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    email: '',
                    password: '',
                    description: '',
                    country: '',
                    newsletter: false,
                  });
                  setErrors({});
                  setSuccess({});
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </Card>

        {/* Accessibility Features */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Accessibility Features
          </h2>

          <div className="space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
            <div>
              <h3 className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">
                Keyboard Navigation
              </h3>
              <p>
                All form components support full keyboard navigation with Tab,
                Shift+Tab, Enter, and arrow keys.
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">
                Screen Reader Support
              </h3>
              <p>
                Proper ARIA labels, descriptions, and live regions for error
                announcements.
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">
                Focus Management
              </h3>
              <p>
                Clear focus indicators that meet WCAG contrast requirements.
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">
                Error Handling
              </h3>
              <p>
                Validation errors are announced to screen readers and associated
                with form fields.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
