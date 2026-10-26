'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ClientSelect } from '@/components/ui/client-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectItem } from '@/components/ui/select';
import { CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  businessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .optional(),
  role: z.enum(['OWNER', 'STAFF']).default('OWNER'),
});

export function SignUpForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    role: 'OWNER' as 'OWNER' | 'STAFF',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setGeneralError('');

    try {
      // Validate form data
      const validatedData = signUpSchema.parse(formData);

      // Register user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      const result = await response.json();

      if (!result.success) {
        if (result.errors) {
          setErrors(result.errors);
        } else {
          setGeneralError(result.message || 'Registration failed');
        }
        return;
      }

      // Registration successful
      setSuccess(true);

      // Auto sign in after successful registration
      setTimeout(async () => {
        const signInResult = await signIn('credentials', {
          email: validatedData.email,
          password: validatedData.password,
          redirect: false,
        });

        if (signInResult?.ok) {
          // Redirect to onboarding for new users
          router.push('/onboarding');
          router.refresh();
        } else {
          router.push(
            '/auth/signin?message=Registration successful, please sign in'
          );
        }
      }, 2000);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        setGeneralError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRoleChange = (value: string) => {
    if (value === 'OWNER' || value === 'STAFF') {
      setFormData(prev => ({ ...prev, role: value }));
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <div>
          <h1 className="text-neutral-off-black text-2xl font-bold">
            Account Created!
          </h1>
          <p className="text-neutral-medium-grey mt-2">
            Welcome to Lumina! Signing you in...
          </p>
        </div>
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-lumina-coral" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-neutral-off-black text-2xl font-bold">
          Create your account
        </h1>
        <p className="text-neutral-medium-grey mt-2">
          Get started with Lumina today
        </p>
      </div>

      {generalError && (
        <Alert variant="destructive">
          <AlertDescription>{generalError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="role">Account Type</Label>
          <ClientSelect
            value={formData.role}
            onValueChange={handleRoleChange}
            disabled={isLoading}
            placeholder="Select account type"
          >
            <SelectItem value="OWNER">Business Owner</SelectItem>
            <SelectItem value="STAFF">Staff Member</SelectItem>
          </ClientSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter your full name"
            disabled={isLoading}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email"
            disabled={isLoading}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        {formData.role === 'OWNER' && (
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              name="businessName"
              type="text"
              value={formData.businessName}
              onChange={handleInputChange}
              placeholder="Enter your business name"
              disabled={isLoading}
              className={errors.businessName ? 'border-red-500' : ''}
            />
            {errors.businessName && (
              <p className="text-sm text-red-500">{errors.businessName}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Create a password"
              disabled={isLoading}
              className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-neutral-medium-grey hover:text-neutral-off-black absolute right-3 top-1/2 -translate-y-1/2"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password}</p>
          )}
          <p className="text-neutral-medium-grey text-xs">
            Password must be at least 8 characters long
          </p>
        </div>

        <Button
          type="submit"
          className="w-full bg-lumina-gradient hover:bg-lumina-gradient-hover"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-neutral-medium-grey">
          Already have an account?{' '}
        </span>
        <a
          href="/auth/signin"
          className="font-medium text-lumina-coral hover:text-ink-brand"
        >
          Sign in
        </a>
      </div>
    </div>
  );
}
