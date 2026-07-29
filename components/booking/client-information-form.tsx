'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Validation schema
const clientFormSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'First name can only contain letters, spaces, hyphens, and apostrophes'
    ),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'Last name can only contain letters, spaces, hyphens, and apostrophes'
    ),

  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters'),

  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters'),

  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),

  marketingOptIn: z.boolean().default(false),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientInformationFormProps {
  businessId: string;
  onSubmit: (data: ClientFormData & { isNewClient: boolean }) => void;
  onBack: () => void;
  isLoading?: boolean;
  initialData?: Partial<ClientFormData>;
}

/*
 * The lookup reports existence only.
 *
 * It used to return the matched client's name, email and phone, and this form
 * wrote them over whatever the person was typing. Two people who share a phone
 * number — a household, a couple — therefore booked as each other, and the
 * confirmation went to the wrong inbox. It also meant the public booking page
 * would tell anyone who typed a phone number whose it was.
 */
interface ClientLookupResponse {
  clientExists: boolean;
}

export default function ClientInformationForm({
  businessId,
  onSubmit,
  onBack,
  isLoading = false,
  initialData,
}: ClientInformationFormProps) {
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isNewClient, setIsNewClient] = useState(true);
  const [lookupPerformed, setLookupPerformed] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      notes: initialData?.notes || '',
      marketingOptIn: initialData?.marketingOptIn || false,
    },
  });

  const watchedEmail = watch('email');
  const watchedPhone = watch('phone');

  // Debounced client lookup
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if ((watchedEmail || watchedPhone) && !lookupPerformed) {
        performClientLookup();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [watchedEmail, watchedPhone]);

  const performClientLookup = async () => {
    if ((!watchedEmail && !watchedPhone) || isLookingUp) return;

    setIsLookingUp(true);
    setLookupError(null);

    try {
      const response = await fetch(
        `/api/public/booking/${businessId}/client-lookup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: watchedEmail || undefined,
            phone: watchedPhone || undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to lookup client information');
      }

      const data: ClientLookupResponse = await response.json();

      // Recognition only — the client's own details stay as they typed
      // them. Their existing record is matched again server-side when the
      // booking is created.
      setIsNewClient(!data.clientExists);
      setLookupPerformed(true);
    } catch (error) {
      console.error('Client lookup error:', error);
      setLookupError(
        'Unable to check client information. Please continue with your details.'
      );
      setIsNewClient(true);
    } finally {
      setIsLookingUp(false);
    }
  };

  const onFormSubmit = (data: ClientFormData) => {
    onSubmit({
      ...data,
      isNewClient,
    });
  };

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Your Information
        </CardTitle>
        {!isNewClient && (
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              Welcome back! We recognise you — just confirm your details below.
            </AlertDescription>
          </Alert>
        )}
        {lookupError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{lookupError}</AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">
                First Name *
              </Label>
              <Input
                id="firstName"
                {...register('firstName')}
                placeholder="Enter your first name"
                className={errors.firstName ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last Name *
              </Label>
              <Input
                id="lastName"
                {...register('lastName')}
                placeholder="Enter your last name"
                className={errors.lastName ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Contact Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Mail className="h-4 w-4" />
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Enter your email address"
                className={errors.email ? 'border-red-500' : ''}
                disabled={isLoading || isLookingUp}
              />
              {isLookingUp && watchedEmail && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking for existing account...
                </div>
              )}
              {errors.email && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Phone className="h-4 w-4" />
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                placeholder="Enter your phone number"
                className={errors.phone ? 'border-red-500' : ''}
                disabled={isLoading || isLookingUp}
              />
              {isLookingUp && watchedPhone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking for existing account...
                </div>
              )}
              {errors.phone && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          {/* Notes Field */}
          <div className="space-y-2">
            <Label
              htmlFor="notes"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <MessageSquare className="h-4 w-4" />
              Special Requests or Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any special requests, allergies, or preferences we should know about?"
              rows={3}
              className={errors.notes ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.notes && (
              <p className="text-sm text-red-600" role="alert">
                {errors.notes.message}
              </p>
            )}
            <p className="text-xs text-gray-500">Maximum 500 characters</p>
          </div>

          {/* Marketing Opt-in */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="marketingOptIn"
              {...register('marketingOptIn')}
              disabled={isLoading}
            />
            <Label
              htmlFor="marketingOptIn"
              className="cursor-pointer text-sm font-normal"
            >
              I'd like to receive appointment reminders and special offers via
              email
            </Label>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Back
            </Button>

            <div className="flex flex-1 gap-3">
              <Button
                type="submit"
                disabled={!isValid || isLoading || isLookingUp}
                className="w-full sm:flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Continue to Confirmation'
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
