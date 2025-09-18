'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, Clock, User } from 'lucide-react';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  preferredStaff?: string;
}

interface QuickBookDialogProps {
  client: Client | null;
  businessSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickBookDialog({
  client,
  businessSlug,
  open,
  onOpenChange,
}: QuickBookDialogProps) {
  if (!client) return null;

  const handleBookAppointment = () => {
    // Navigate to booking page with client pre-selected
    window.location.href = `/dashboard/${businessSlug}/appointments/book?clientId=${client.id}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="lumina-heading-3">
            Book Appointment for {client.firstName} {client.lastName}
          </DialogTitle>
          <DialogDescription
            className="lumina-body-small"
            style={{ color: '#808285' }}
          >
            Quick booking options for this client
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Book Options */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-4 text-center">
                <div className="flex justify-center space-x-4">
                  <Calendar className="h-8 w-8" style={{ color: '#ff7a5a' }} />
                  <Clock className="h-8 w-8" style={{ color: '#ff7a5a' }} />
                  <User className="h-8 w-8" style={{ color: '#ff7a5a' }} />
                </div>
                <div>
                  <h3 className="text-lumina-primary mb-2 font-semibold">
                    Full Booking Interface
                  </h3>
                  <p className="text-sm" style={{ color: '#808285' }}>
                    Access the complete appointment booking system with service
                    selection, staff assignment, and time slot availability.
                  </p>
                </div>
                <Button
                  onClick={handleBookAppointment}
                  className="w-full text-white"
                  style={{
                    background:
                      'linear-gradient(135deg, #ffd25a 0%, #ff7a5a 100%)',
                  }}
                >
                  Open Booking System
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Client Info */}
          <div className="text-sm" style={{ color: '#808285' }}>
            <strong>Client:</strong> {client.firstName} {client.lastName}
            {client.preferredStaff && (
              <div>
                <strong>Preferred Staff:</strong> {client.preferredStaff}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
