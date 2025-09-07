'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  DollarSign,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  preferredStaff?: string;
  notes?: string;
  emailMarketing: boolean;
  smsMarketing: boolean;
  createdAt: string;
  appointmentCount: number;
  lastAppointment?: {
    startTime: string;
    staff: {
      displayName: string;
    };
    services: Array<{
      service: {
        name: string;
      };
    }>;
  };
}

interface Staff {
  id: string;
  displayName: string;
}

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  totalAmount?: number;
  staff: {
    displayName: string;
  };
  services: Array<{
    service: {
      name: string;
      price: number;
    };
  }>;
}

interface ClientDetailsDialogProps {
  client: Client | null;
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailsDialog({
  client,
  businessId,
  open,
  onOpenChange,
}: ClientDetailsDialogProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load staff members and appointments
  useEffect(() => {
    const loadData = async () => {
      if (!businessId || !client) return;

      setIsLoading(true);
      try {
        // Load staff
        const staffResponse = await fetch(
          `/api/staff?businessId=${businessId}`
        );
        if (staffResponse.ok) {
          const staffData = await staffResponse.json();
          setStaff(staffData.staff || []);
        }

        // Load client with appointments

        const clientResponse = await fetch(`/api/clients/${client.id}`);

        if (clientResponse.ok) {
          const clientData = await clientResponse.json();

          setAppointments(clientData.appointments || []);
        } else {
          // Failed to fetch client details
        }
      } catch (_error) {
        // Error loading client data
      } finally {
        setIsLoading(false);
      }
    };

    if (open && client) {
      loadData();
    }
  }, [businessId, client, open]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getPreferredStaffName = (staffId?: string) => {
    if (!staffId) return 'No preference';
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.displayName || 'Unknown';
  };

  const formatAddress = () => {
    if (!client) return null;

    const parts = [
      client.address,
      client.city,
      client.state,
      client.zipCode,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : null;
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="lumina-dialog-title flex items-center gap-2">
            <User className="text-lumina-primary h-5 w-5" />
            Client Details
          </DialogTitle>
          <DialogDescription className="lumina-dialog-description">
            Complete client information and appointment history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Header */}
          <div className="flex items-center space-x-4 rounded-lg bg-gray-50 p-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-lg text-white">
                {getInitials(client.firstName, client.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lumina-primary text-xl font-semibold">
                {client.firstName} {client.lastName}
              </h3>
              <p className="text-lumina-secondary">
                Client since {new Date(client.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-2 flex gap-2">
                <Badge variant="secondary">
                  {client.appointmentCount} appointment
                  {client.appointmentCount !== 1 ? 's' : ''}
                </Badge>
                {client.emailMarketing && (
                  <Badge className="border-green-200 bg-green-100 text-green-800">
                    Email Marketing
                  </Badge>
                )}
                {client.smsMarketing && (
                  <Badge className="border-blue-200 bg-blue-100 text-blue-800">
                    SMS Marketing
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-lumina-primary text-lg font-medium">
              Contact Information
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {client.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="text-lumina-secondary h-4 w-4" />
                  <div>
                    <p className="text-lumina-secondary text-sm">Email</p>
                    <p className="text-lumina-primary">{client.email}</p>
                  </div>
                </div>
              )}

              {client.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="text-lumina-secondary h-4 w-4" />
                  <div>
                    <p className="text-lumina-secondary text-sm">Phone</p>
                    <p className="text-lumina-primary">{client.phone}</p>
                  </div>
                </div>
              )}
            </div>

            {formatAddress() && (
              <div className="flex items-start space-x-3">
                <MapPin className="text-lumina-secondary mt-1 h-4 w-4" />
                <div>
                  <p className="text-lumina-secondary text-sm">Address</p>
                  <p className="text-lumina-primary">{formatAddress()}</p>
                </div>
              </div>
            )}
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <h4 className="text-lumina-primary text-lg font-medium">
              Preferences
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-3">
                <User className="text-lumina-secondary h-4 w-4" />
                <div>
                  <p className="text-lumina-secondary text-sm">
                    Preferred Staff
                  </p>
                  <p className="text-lumina-primary">
                    {getPreferredStaffName(client.preferredStaff)}
                  </p>
                </div>
              </div>
            </div>

            {client.notes && (
              <div className="space-y-2">
                <p className="text-lumina-secondary text-sm">Notes</p>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-lumina-primary whitespace-pre-wrap">
                    {client.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Appointment History */}
          <div className="space-y-4">
            <h4 className="text-lumina-primary text-lg font-medium">
              Appointment History
            </h4>
            {isLoading ? (
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-lumina-secondary">Loading appointments...</p>
              </div>
            ) : appointments.length > 0 ? (
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {appointments.map(appointment => (
                  <div
                    key={appointment.id}
                    className="rounded-lg bg-gray-50 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="text-lumina-secondary h-4 w-4" />
                        <span className="text-lumina-primary font-medium">
                          {new Date(appointment.startTime).toLocaleDateString()}{' '}
                          at{' '}
                          {new Date(appointment.startTime).toLocaleTimeString(
                            [],
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </span>
                      </div>
                      <Badge
                        className={
                          new Date(appointment.startTime) > new Date()
                            ? 'border-blue-200 bg-blue-100 text-blue-800'
                            : appointment.status === 'COMPLETED'
                              ? 'border-green-200 bg-green-100 text-green-800'
                              : appointment.status === 'CANCELLED'
                                ? 'border-red-200 bg-red-100 text-red-800'
                                : 'border-yellow-200 bg-yellow-100 text-yellow-800'
                        }
                      >
                        {new Date(appointment.startTime) > new Date()
                          ? 'Upcoming'
                          : appointment.status}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="text-lumina-secondary h-4 w-4" />
                        <span className="text-lumina-secondary">Staff:</span>
                        <span className="text-lumina-primary">
                          {appointment.staff.displayName}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Clock className="text-lumina-secondary h-4 w-4" />
                        <span className="text-lumina-secondary">Services:</span>
                        <span className="text-lumina-primary">
                          {appointment.services
                            .map(s => s.service.name)
                            .join(', ')}
                        </span>
                      </div>

                      {appointment.totalAmount && (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="text-lumina-secondary h-4 w-4" />
                          <span className="text-lumina-secondary">Total:</span>
                          <span className="text-lumina-primary font-medium">
                            ${appointment.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-lumina-secondary">
                  No appointments found for this client.
                </p>
              </div>
            )}
          </div>

          {/* Marketing Preferences */}
          <div className="space-y-4">
            <h4 className="text-lumina-primary text-lg font-medium">
              Marketing Preferences
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-3">
                <Mail className="text-lumina-secondary h-4 w-4" />
                <div>
                  <p className="text-lumina-secondary text-sm">
                    Email Marketing
                  </p>
                  <p className="text-lumina-primary">
                    {client.emailMarketing ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Phone className="text-lumina-secondary h-4 w-4" />
                <div>
                  <p className="text-lumina-secondary text-sm">SMS Marketing</p>
                  <p className="text-lumina-primary">
                    {client.smsMarketing ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
