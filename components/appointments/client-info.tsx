'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, History, Mail, Phone, Save, Star, User, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Client data validation schema
const clientFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone number is required'),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

export interface ClientData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  // Additional client data that might be available
  totalAppointments?: number;
  lastVisit?: Date;
  totalSpent?: number;
  preferredServices?: string[];
  notes?: string;
  isVip?: boolean;
}

export interface ClientInfoProps {
  client: ClientData;
  onUpdate: (clientData: Partial<ClientData>) => Promise<void>;
  isEditable?: boolean;
}

/**
 * ClientInfo Component
 *
 * Displays comprehensive client information with editing capabilities.
 * Shows client history, preferences, and contact details.
 *
 * Requirements: 3.4, 3.5
 */
export function ClientInfo({
  client,
  onUpdate,
  isEditable = true,
}: ClientInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
    },
  });

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleEdit = () => {
    setIsEditing(true);
    reset({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    reset();
  };

  const onSubmit = async (data: ClientFormData) => {
    setIsLoading(true);
    try {
      await onUpdate(data);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update client:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Edit Client Information</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  className={cn(errors.firstName && 'border-red-500')}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  className={cn(errors.lastName && 'border-red-500')}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className={cn(errors.email && 'border-red-500')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                className={cn(errors.phone && 'border-red-500')}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !isValid}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Client Profile</span>
            </div>
            {isEditable && (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={client.avatar}
                alt={`${client.firstName} ${client.lastName}`}
              />
              <AvatarFallback className="text-lg">
                {getInitials(client.firstName, client.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-semibold">
                    {client.firstName} {client.lastName}
                  </h3>
                  {client.isVip && (
                    <Badge
                      variant="outline"
                      className="border-yellow-200 bg-yellow-50 text-yellow-700"
                    >
                      <Star className="mr-1 h-3 w-3" />
                      VIP
                    </Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{client.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{client.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Statistics */}
      {(client.totalAppointments || client.totalSpent || client.lastVisit) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Client History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {client.totalAppointments !== undefined && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-lumina-coral">
                    {client.totalAppointments}
                  </p>
                  <p className="text-sm text-gray-500">Total Appointments</p>
                </div>
              )}
              {client.totalSpent !== undefined && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-lumina-coral">
                    {formatPrice(client.totalSpent)}
                  </p>
                  <p className="text-sm text-gray-500">Total Spent</p>
                </div>
              )}
              {client.lastVisit && (
                <div className="text-center">
                  <p className="text-lg font-semibold">
                    {formatDate(client.lastVisit)}
                  </p>
                  <p className="text-sm text-gray-500">Last Visit</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preferred Services */}
      {client.preferredServices && client.preferredServices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preferred Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {client.preferredServices.map((service, index) => (
                <Badge key={index} variant="secondary">
                  {service}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Notes */}
      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {client.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
