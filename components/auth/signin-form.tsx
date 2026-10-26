'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hardNavigate } from '@/lib/navigation/hard-navigate';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export function SignInForm() {
  const { data: session, status } = useSession();

  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Leave for the dashboard once. A successful sign-in also refreshes the
  // session, which fires the "already signed in" effect below; navigating
  // from both cancelled the first navigation and loaded the page twice.
  const leaving = useRef(false);
  const goToDashboard = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    hardNavigate('/dashboard');
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session) {
      goToDashboard();
    }
  }, [session, status, goToDashboard]);

  // Show loading state while session is being determined
  if (status === 'loading' || !mounted) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ink-strong">Welcome back</h1>
          <p className="mt-2 text-ink-soft">Sign in to your Lumina account</p>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-lumina-coral" />
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setGeneralError('');

    try {
      // Validate form data
      const validatedData = signInSchema.parse(formData);

      try {
        // Use NextAuth's signIn with redirect: false to handle redirect manually
        const result = await signIn('credentials', {
          email: validatedData.email,
          password: validatedData.password,
          redirect: false,
        });

        if (result?.code === 'service_unavailable') {
          // The check itself failed (see lib/auth/authorize-credentials.ts).
          // Saying "invalid password" here sends people to reset a password
          // that was never wrong.
          setGeneralError(
            "We couldn't reach our servers to check your sign-in. Your details may be fine — please try again in a moment."
          );
        } else if (result?.error) {
          setGeneralError('Invalid email or password. Please try again.');
        } else if (result?.ok) {
          goToDashboard();
        } else {
          setGeneralError('Authentication failed. Please try again.');
        }
      } catch (_signInError) {
        setGeneralError('Authentication failed. Please try again.');
      }
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

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink-strong">Welcome back</h1>
        <p className="mt-2 text-ink-soft">Sign in to your Lumina account</p>
      </div>

      {generalError && (
        <Alert variant="destructive" role="alert" aria-live="polite">
          <AlertDescription>{generalError}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
        aria-label="Sign in form"
      >
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

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              disabled={isLoading}
              className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-strong"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-lumina-gradient hover:bg-lumina-gradient-hover"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-ink-soft">Don&apos;t have an account? </span>
        <a
          href="/auth/signup"
          className="font-medium text-lumina-coral hover:text-ink-brand"
        >
          Sign up
        </a>
      </div>
    </div>
  );
}
