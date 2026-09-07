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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building, CheckCircle, Loader2, User, XCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const acceptInviteSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type AcceptInviteFormData = z.infer<typeof acceptInviteSchema>;

interface InvitationData {
  id: string;
  email: string;
  role: string;
  staffData: {
    displayName: string;
    title?: string;
    employmentType: string;
    commissionRate?: number;
    chairRentalAmount?: number;
    chairRentalPeriod?: string;
  };
  message?: string;
  business: {
    id: string;
    name: string;
    slug: string;
  };
  inviter: {
    name: string;
    email: string;
  };
  expiresAt: string;
}

export function StaffInviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      name: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/staff/invite/verify?token=${token}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid invitation');
      }

      const data = await response.json();
      setInvitation(data.invitation);

      // Pre-fill the name if available
      if (data.invitation.staffData.displayName) {
        form.setValue('name', data.invitation.staffData.displayName);
      }
    } catch (error) {
      console.error('Error fetching invitation:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to load invitation'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: AcceptInviteFormData) => {
    if (!token) return;

    try {
      setIsSubmitting(true);

      const response = await fetch('/api/staff/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          name: data.name,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept invitation');
      }

      setSuccess(true);

      // Redirect to sign in after a short delay
      setTimeout(() => {
        router.push('/auth/signin?message=invitation-accepted');
      }, 2000);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      form.setError('root', {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to accept invitation',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmploymentDisplay = (staffData: InvitationData['staffData']) => {
    switch (staffData.employmentType) {
      case 'COMMISSION':
        return `${staffData.commissionRate}% Commission`;
      case 'CHAIR_RENTAL':
        return `$${staffData.chairRentalAmount}/${staffData.chairRentalPeriod?.toLowerCase()}`;
      case 'HYBRID':
        return `${staffData.commissionRate}% Commission + $${staffData.chairRentalAmount}/${staffData.chairRentalPeriod?.toLowerCase()}`;
      default:
        return staffData.employmentType;
    }
  };

  const getEmploymentBadgeColor = (type: string) => {
    switch (type) {
      case 'COMMISSION':
        return 'bg-blue-100 text-blue-800';
      case 'CHAIR_RENTAL':
        return 'bg-green-100 text-green-800';
      case 'HYBRID':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Invalid Invitation
          </h3>
          <p className="mb-4 text-gray-600">{error}</p>
          <Button onClick={() => router.push('/auth/signin')}>
            Go to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Welcome to the Team!
          </h3>
          <p className="mb-4 text-gray-600">
            Your account has been created successfully. You&apos;ll be
            redirected to sign in shortly.
          </p>
          <div className="animate-pulse">
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!invitation) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Invitation Not Found
          </h3>
          <p className="text-gray-600">
            This invitation may have expired or been used already.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invitation Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {invitation.business.name}
          </CardTitle>
          <CardDescription>
            You&apos;ve been invited by {invitation.inviter.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700">Position</h4>
              <p className="font-semibold">
                {invitation.staffData.displayName}
              </p>
              {invitation.staffData.title && (
                <p className="text-sm text-gray-600">
                  {invitation.staffData.title}
                </p>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">Employment</h4>
              <Badge
                className={getEmploymentBadgeColor(
                  invitation.staffData.employmentType
                )}
              >
                {invitation.staffData.employmentType.replace('_', ' ')}
              </Badge>
              <p className="mt-1 text-sm text-gray-600">
                {getEmploymentDisplay(invitation.staffData)}
              </p>
            </div>
          </div>

          {invitation.message && (
            <div className="rounded-md bg-blue-50 p-3">
              <h4 className="mb-1 text-sm font-medium text-blue-900">
                Personal Message
              </h4>
              <p className="text-sm text-blue-700">
                &quot;{invitation.message}&quot;
              </p>
            </div>
          )}

          <div className="text-xs text-gray-500">
            Invitation expires:{' '}
            {new Date(invitation.expiresAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      {/* Account Setup Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Create Your Account
          </CardTitle>
          <CardDescription>
            Set up your account to accept this invitation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormDescription>
                      This will be your display name in the system
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Create a secure password"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Must be at least 8 characters long
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-600">
                    {form.formState.errors.root.message}
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Accept Invitation & Create Account
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
